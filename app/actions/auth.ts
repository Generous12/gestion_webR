'use server';

import { cache } from 'react';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import crypto from 'crypto';
import { checkRateLimit, getClientIp, sanitizeText, hashPassword, verifyPassword } from '@/utils/security';

// Inicializar un usuario administrador por defecto si la tabla está vacía
async function seedDefaultUser() {
  const supabase = await createClient();

  // Verificar si ya hay usuarios
  const { count, error } = await supabase
    .from('usuarios_sistema')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error al verificar usuarios:', error);
    return;
  }

  if (count === 0) {
    console.log('Sembrando usuario administrador por defecto...');
    
    // 1. Crear miembro del equipo
    const { data: miembro, error: errorMiembro } = await supabase
      .from('equipo')
      .insert({
        nombre: 'Administrador',
        apellido: 'Sistema',
        dni: '00000000',
        email: 'admin@gestionweb.com',
        cargo: 'Super Admin',
        estado: 'ACTIVO'
      })
      .select()
      .single();

    if (errorMiembro || !miembro) {
      console.error('Error al crear miembro de equipo por defecto:', errorMiembro);
      return;
    }
    // 2. Asignar rol de Administrador (ID 1 según tu SQL)
    const { error: errorRol } = await supabase
      .from('equipo_roles')
      .insert({
        id_miembro: miembro.id_miembro,
        id_rol: 1 // Rol Administrador insertado en tu SQL
      });

    if (errorRol) {
      console.error('Error al asignar rol de administrador:', errorRol);
    }
    // 3. Crear credenciales de usuario con Bcrypt
    const adminPasswordHash = await hashPassword('admin');
    const { error: errorUsuario } = await supabase
      .from('usuarios_sistema')
      .insert({
        id_miembro: miembro.id_miembro,
        usuario: 'admin',
        password_hash: adminPasswordHash, // Contraseña: admin
        estado: 'ACTIVO'
      });

    if (errorUsuario) {
      console.error('Error al crear credenciales de administrador:', errorUsuario);
    } else {
      console.log('Usuario administrador por defecto creado: admin / admin');
    }
  }
}

export async function loginUsuario(prevState: unknown, formData: FormData) {
  const ip = await getClientIp();

  // Rate Limiting: Máximo 10 intentos por cada 5 minutos por IP
  const rateLimit = checkRateLimit(`login_attempt_${ip}`, 10, 300);
  if (!rateLimit.success) {
    return { error: rateLimit.error };
  }

  const rawUsuario = formData.get('usuario') as string;
  const passwordInput = formData.get('password') as string;

  if (!rawUsuario || !passwordInput) {
    return { error: 'Por favor, ingresa tu usuario y contraseña.' };
  }

  const usuarioInput = sanitizeText(rawUsuario, 50);

  const supabase = await createClient();

  // Buscar usuario
  let { data: user, error } = await supabase
    .from('usuarios_sistema')
    .select('*, equipo(*)')
    .eq('usuario', usuarioInput)
    .maybeSingle();

  // Si no se encuentra y el usuario intenta entrar con admin, sembramos si la BD está vacía
  if (!user && usuarioInput === 'admin') {
    await seedDefaultUser();
    const { data: adminUser } = await supabase
      .from('usuarios_sistema')
      .select('*, equipo(*)')
      .eq('usuario', 'admin')
      .maybeSingle();
    user = adminUser;
  }

  if (error || !user) {
    return { error: 'Usuario o contraseña incorrectos.' };
  }

  if (user.estado !== 'ACTIVO') {
    return { error: 'Tu usuario está bloqueado o inactivo.' };
  }

  // Verificar contraseña (soporta Bcrypt y auto-migra hashes legados SHA-256)
  const verification = await verifyPassword(passwordInput, user.password_hash);
  if (!verification.isValid) {
    // Registrar log fallido
    await supabase.from('logs_seguridad').insert({
      id_usuario: user.id_usuario,
      accion: 'LOGIN_FALLIDO',
      detalle: `Intento de acceso fallido para el usuario: ${usuarioInput}, IP: ${ip}`
    });

    return { error: 'Usuario o contraseña incorrectos.' };
  }

  // Si el usuario tenía un hash legado SHA-256, actualizar automáticamente a Bcrypt en la BD
  if (verification.needsRehash) {
    try {
      const newBcryptHash = await hashPassword(passwordInput);
      await supabase
        .from('usuarios_sistema')
        .update({ password_hash: newBcryptHash })
        .eq('id_usuario', user.id_usuario);
      console.log(`Hash de usuario ${user.usuario} actualizado transparentemente a Bcrypt.`);
    } catch (rehashErr) {
      console.error('Error al auto-actualizar hash a Bcrypt:', rehashErr);
    }
  }

  // Crear sesión
  const tokenSesion = crypto.randomUUID();
  const dispositivo = 'Navegador Web';
  
  const { data: sesion, error: errorSesion } = await supabase
    .from('sesiones_usuario')
    .insert({
      id_usuario: user.id_usuario,
      token_sesion: tokenSesion,
      dispositivo: dispositivo,
      estado_sesion: 'ACTIVA'
    })
    .select()
    .single();

  if (errorSesion) {
    console.error('Error al guardar sesión:', errorSesion);
    return { error: 'Error interno al iniciar sesión.' };
  }

  // Guardar log de éxito
  await supabase.from('logs_seguridad').insert({
    id_usuario: user.id_usuario,
    accion: 'LOGIN_EXITOSO',
    detalle: `Sesión iniciada con éxito. ID Sesión: ${sesion.id_sesion}`
  });

  // Guardar cookie
  const cookieStore = await cookies();
  cookieStore.set('session_token', tokenSesion, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 // 1 día
  });

  // Redirigir al dashboard
  redirect('/admin');
}

export async function logoutUsuario() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;

  if (token) {
    const supabase = await createClient();
    
    // Cambiar estado de la sesión en la base de datos
    await supabase
      .from('sesiones_usuario')
      .update({ estado_sesion: 'CERRADA', fecha_fin: new Date().toISOString() })
      .eq('token_sesion', token);
  }

  cookieStore.delete('session_token');
  redirect('/login');
}

export const getSesionActual = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;

  if (!token) return null;

  const supabase = await createClient();

  // Buscar la sesión activa en BD
  const { data: sesion, error } = await supabase
    .from('sesiones_usuario')
    .select('*, usuarios_sistema(*, equipo(*))')
    .eq('token_sesion', token)
    .eq('estado_sesion', 'ACTIVA')
    .single();

  if (error || !sesion || !sesion.usuarios_sistema) {
    return null;
  }

  // Actualizar último ping solo si han pasado más de 10 minutos (ahorra escrituras a la BD en cada página)
  const ahora = Date.now();
  const ultimoPing = sesion.ultimo_ping ? new Date(sesion.ultimo_ping).getTime() : 0;
  if (ahora - ultimoPing > 10 * 60 * 1000) {
    supabase
      .from('sesiones_usuario')
      .update({ ultimo_ping: new Date(ahora).toISOString() })
      .eq('id_sesion', sesion.id_sesion)
      .then();
  }

  // Obtener permisos y módulos del usuario de acuerdo a sus roles
  const idMiembro = sesion.usuarios_sistema.id_miembro;
  const permisos: string[] = [];
  const modulos = new Set<string>();
  const roles: string[] = [];

  const ALL_ADMIN_MODULES = [
    'Dashboard',
    'Caja',
    'Ventas',
    'HistorialVentas',
    'Inventario',
    'Recepcion',
    'CRM',
    'Planes',
    'Finanzas',
    'Equipo',
    'EquipoUsuarios',
    'Roles',
    'RolesPermisos',
    'Logs',
    'LogsSeguridad'
  ];

  const ALL_ADMIN_PERMISSIONS = [
    'DashboardVer', 'Dashboard',
    'CajaAperturaCierre', 'CajaMovimientos', 'Caja',
    'VentasRegistrar', 'Ventas',
    'HistorialVentasVer', 'HistorialVentas',
    'InventarioVer', 'InventarioModificar', 'Inventario',
    'RecepcionAcceso', 'RecepcionRegistrar', 'Recepcion',
    'CrmVer', 'CRM',
    'PlanesGestionar', 'Planes',
    'FinanzasVer', 'Finanzas',
    'EquipoUsuarios', 'Equipo',
    'RolesPermisos', 'Roles',
    'LogsSeguridad', 'Logs'
  ];

  if (sesion.usuarios_sistema.usuario === 'admin') {
    roles.push('Super Admin', 'Administrador');
    ALL_ADMIN_MODULES.forEach(m => modulos.add(m));
    permisos.push(...ALL_ADMIN_PERMISSIONS);
  }

  if (idMiembro) {
    // 1. Obtener los IDs y nombres de rol del miembro
    const { data: equipoRoles } = await supabase
      .from('equipo_roles')
      .select('id_rol, roles(nombre)')
      .eq('id_miembro', idMiembro);

    const rolIds = equipoRoles?.map(r => r.id_rol) || [];
    const rolesNombres = (equipoRoles?.map(r => {
      const rObj = Array.isArray(r.roles) ? r.roles[0] : r.roles;
      return rObj?.nombre;
    }).filter(Boolean) || []) as string[];

    roles.push(...rolesNombres);

    const esAdministrador = rolesNombres.includes('Administrador') || rolesNombres.includes('Super Admin') || rolesNombres.includes('Admin') || sesion.usuarios_sistema.usuario === 'admin';

    if (esAdministrador) {
      ALL_ADMIN_MODULES.forEach(m => modulos.add(m));
      permisos.push(...ALL_ADMIN_PERMISSIONS);
    } else if (rolIds.length > 0) {
      // 2. Obtener los permisos asociados a estos roles para otros usuarios
      const { data: rpData } = await supabase
        .from('roles_permisos')
        .select('permisos(codigo, modulo)')
        .in('id_rol', rolIds);

      if (rpData) {
        for (const item of rpData) {
          const p = item.permisos;
          if (p) {
            const pObj = Array.isArray(p) ? p[0] : p;
            if (pObj) {
              if (pObj.codigo) permisos.push(pObj.codigo);
              if (pObj.modulo) modulos.add(pObj.modulo);
            }
          }
        }
      }
    }
  }

  return {
    ...sesion.usuarios_sistema,
    permisos,
    modulos: Array.from(modulos),
    roles
  };
});

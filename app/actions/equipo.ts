'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { UsuarioSistema } from '@/types/database.types';
import { getSesionActual } from '@/app/actions/auth';
import { hashPassword, verifyPassword } from '@/utils/security';

export async function crearMiembro(formData: FormData) {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) {
    return { error: 'No autorizado. Por favor inicie sesión.' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const esAdmin = loggedInUser.usuario === 'admin' || (loggedInUser as any).roles?.includes('Super Admin') || (loggedInUser as any).roles?.includes('Administrador') || (loggedInUser as any).roles?.includes('Admin');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tienePermiso = esAdmin || (loggedInUser as any).permisos?.includes('EquipoUsuarios') || (loggedInUser as any).permisos?.includes('Equipo') || (loggedInUser as any).modulos?.includes('EquipoUsuarios') || (loggedInUser as any).modulos?.includes('Equipo');
  if (!tienePermiso) {
    return { error: 'No tienes permisos para registrar miembros del equipo.' };
  }

  const supabase = await createClient();

  const nombre = formData.get('nombre') as string;
  const apellido = formData.get('apellido') as string;
  const dni = formData.get('dni') as string;
  const telefono = formData.get('telefono') as string;
  const email = formData.get('email') as string;
  const idRol = parseInt(formData.get('rol') as string);
  const crearUsuario = formData.get('crear_usuario') === 'on';

  if (!nombre || !email) {
    return { error: 'Nombre y Email son obligatorios.' };
  }

  // 1. Insertar en equipo
  const { data: miembro, error: errMiembro } = await supabase
    .from('equipo')
    .insert({
      nombre,
      apellido,
      dni: dni || null,
      telefono: telefono || null,
      email,
      estado: 'ACTIVO'
    })
    .select()
    .single();

  if (errMiembro || !miembro) {
    console.error('Error al crear miembro:', errMiembro);
    return { error: 'Error al registrar al miembro del equipo. El DNI o Email podría estar duplicado.' };
  }

  // 2. Asignar el rol seleccionado al miembro del equipo (siempre se asigna)
  if (!isNaN(idRol)) {
    const { error: errRol } = await supabase
      .from('equipo_roles')
      .insert({
        id_miembro: miembro.id_miembro,
        id_rol: idRol
      });

    if (errRol) {
      console.error('Error al asignar rol:', errRol);
      return { error: `Miembro creado, pero no se pudo asignar su rol: ${errRol.message}` };
    }
  }

  // 3. Si se solicitó crear usuario de sistema, registrar credenciales
  if (crearUsuario) {
    const usuario = formData.get('usuario') as string;
    const password = formData.get('password') as string;

    if (!usuario || !password) {
      return { error: 'Se creó el miembro del equipo y su rol, pero faltan datos para crear su cuenta de usuario (Usuario y Contraseña).' };
    }

    // Hashear la contraseña ingresada con Bcrypt
    const passwordHash = await hashPassword(password);

    // Registrar credenciales
    const { error: errUsuario } = await supabase
      .from('usuarios_sistema')
      .insert({
        id_miembro: miembro.id_miembro,
        usuario,
        password_hash: passwordHash,
        estado: 'ACTIVO'
      });

    if (errUsuario) {
      console.error('Error al crear usuario de sistema:', errUsuario);
      return { error: `Miembro creado, pero no se pudo crear la cuenta de usuario: ${errUsuario.message}` };
    }
  }

  revalidatePath('/admin/equipo');
  return { success: true };
}

export async function editarMiembro(idMiembro: number, formData: FormData) {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) {
    return { error: 'No autorizado. Por favor inicie sesión.' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const esAdmin = loggedInUser.usuario === 'admin' || (loggedInUser as any).roles?.includes('Super Admin') || (loggedInUser as any).roles?.includes('Administrador') || (loggedInUser as any).roles?.includes('Admin');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tienePermiso = esAdmin || (loggedInUser as any).permisos?.includes('EquipoUsuarios') || (loggedInUser as any).permisos?.includes('Equipo') || (loggedInUser as any).modulos?.includes('EquipoUsuarios') || (loggedInUser as any).modulos?.includes('Equipo');
  if (!tienePermiso) {
    return { error: 'No tienes permisos para editar miembros del equipo.' };
  }

  const supabase = await createClient();

  const nombre = formData.get('nombre') as string;
  const apellido = formData.get('apellido') as string;
  const dni = formData.get('dni') as string;
  const telefono = formData.get('telefono') as string;
  const email = formData.get('email') as string;
  const idRol = parseInt(formData.get('rol') as string);
  const estado = formData.get('estado') as 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO';
  const crearUsuario = formData.get('crear_usuario') === 'on';

  if (!nombre || !email) {
    return { error: 'Nombre y Email son obligatorios.' };
  }

  // 1. Actualizar en equipo
  const { error: errMiembro } = await supabase
    .from('equipo')
    .update({
      nombre,
      apellido: apellido || null,
      dni: dni || null,
      telefono: telefono || null,
      email,
      estado
    })
    .eq('id_miembro', idMiembro);

  if (errMiembro) {
    console.error('Error al editar miembro:', errMiembro);
    return { error: 'Error al actualizar los datos del miembro del equipo.' };
  }

  // 2. Actualizar rol en equipo_roles
  if (!isNaN(idRol)) {
    // Eliminar asignaciones previas
    await supabase.from('equipo_roles').delete().eq('id_miembro', idMiembro);
    
    // Insertar nueva asignación
    const { error: errRol } = await supabase
      .from('equipo_roles')
      .insert({
        id_miembro: idMiembro,
        id_rol: idRol
      });

    if (errRol) {
      console.error('Error al reasignar rol:', errRol);
      return { error: `Miembro actualizado, pero no se pudo reasignar su rol: ${errRol.message}` };
    }
  }

  // 3. Gestionar usuario de sistema
  const { data: usuarioExistente } = await supabase
    .from('usuarios_sistema')
    .select('*')
    .eq('id_miembro', idMiembro)
    .single();

  const usuario = formData.get('usuario') as string;
  const password = formData.get('password') as string;
  const usuarioEstado = formData.get('usuario_estado') as 'ACTIVO' | 'BLOQUEADO' | 'INACTIVO';

  if (usuarioExistente) {
    // Actualizar usuario existente
    const updateData: Partial<UsuarioSistema> = {};
    if (usuario) updateData.usuario = usuario;
    if (usuarioEstado) updateData.estado = usuarioEstado;
    if (password) updateData.password_hash = await hashPassword(password);
    updateData.fecha_actualizacion = new Date().toISOString();

    const { error: errUpdateUser } = await supabase
      .from('usuarios_sistema')
      .update(updateData)
      .eq('id_miembro', idMiembro);

    if (errUpdateUser) {
      console.error('Error al actualizar usuario de sistema:', errUpdateUser);
      return { error: `Miembro actualizado, pero no se pudo actualizar su usuario: ${errUpdateUser.message}` };
    }
  } else if (crearUsuario) {
    // Crear nuevo usuario si se solicitó y no existía
    if (!usuario || !password) {
      return { error: 'Se actualizó el miembro, pero faltan datos para crear su cuenta de usuario (Usuario y Contraseña).' };
    }

    const passwordHash = await hashPassword(password);
    const { error: errUsuario } = await supabase
      .from('usuarios_sistema')
      .insert({
        id_miembro: idMiembro,
        usuario,
        password_hash: passwordHash,
        estado: 'ACTIVO'
      });

    if (errUsuario) {
      console.error('Error al crear usuario de sistema:', errUsuario);
      return { error: `Miembro actualizado, pero no se pudo crear su usuario: ${errUsuario.message}` };
    }
  }

  revalidatePath('/admin/equipo');
  return { success: true };
}

export async function eliminarMiembro(idMiembro: number) {
  const supabase = await createClient();

  // Obtener el usuario logueado
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) {
    return { error: 'No autorizado. Por favor inicie sesión.' };
  }

  // 1. Obtener la cuenta de usuario del sistema asociada, si existe
  const { data: user } = await supabase
    .from('usuarios_sistema')
    .select('id_usuario, usuario')
    .eq('id_miembro', idMiembro)
    .single();

  // Obtener los roles del miembro que se quiere eliminar
  const { data: rolesMiembro } = await supabase
    .from('equipo_roles')
    .select('roles(nombre)')
    .eq('id_miembro', idMiembro);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const esAdministradorAEliminar = rolesMiembro?.some((r: any) => r.roles?.nombre === 'Administrador') ?? false;

  // Si el miembro a eliminar es un Administrador, bloquearlo por completo por seguridad
  const esAdminUsuario = user?.usuario === 'admin';
  if (esAdministradorAEliminar || esAdminUsuario) {
    return { error: 'Por motivos de seguridad y estabilidad del sistema, no se puede eliminar a ningún miembro con el rol de Administrador.' };
  }

  // Verificar que el usuario tenga el permiso EquipoUsuarios
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const esAdmin = loggedInUser.usuario === 'admin' || (loggedInUser as any).roles?.includes('Super Admin') || (loggedInUser as any).roles?.includes('Administrador') || (loggedInUser as any).roles?.includes('Admin');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tienePermisoEliminar = esAdmin || (loggedInUser as any).permisos?.includes('EquipoUsuarios') || (loggedInUser as any).permisos?.includes('Equipo') || (loggedInUser as any).modulos?.includes('EquipoUsuarios') || (loggedInUser as any).modulos?.includes('Equipo');
  if (!tienePermisoEliminar) {
    return { error: 'No tienes permisos para eliminar miembros del equipo.' };
  }

  if (user) {
    const idUsuario = user.id_usuario;

    // 2. Eliminar todas las sesiones activas en sesiones_usuario
    const { error: errSesiones } = await supabase
      .from('sesiones_usuario')
      .delete()
      .eq('id_usuario', idUsuario);

    if (errSesiones) {
      console.error('Error al eliminar sesiones de usuario:', errSesiones);
      return { error: 'No se pudo eliminar el miembro porque tiene sesiones activas registradas.' };
    }

    // 3. Eliminar logs de seguridad asociados
    const { error: errLogs } = await supabase
      .from('logs_seguridad')
      .delete()
      .eq('id_usuario', idUsuario);

    if (errLogs) {
      console.error('Error al eliminar logs de seguridad:', errLogs);
      return { error: 'No se pudo eliminar el miembro porque tiene registros de seguridad en el log.' };
    }

    // 4. Eliminar solicitudes de recuperación de contraseña
    const { error: errRecuperaciones } = await supabase
      .from('recuperacion_password')
      .delete()
      .eq('id_usuario', idUsuario);

    if (errRecuperaciones) {
      console.error('Error al eliminar solicitudes de recuperación:', errRecuperaciones);
      return { error: 'No se pudieron eliminar las solicitudes de recuperación del miembro.' };
    }

    // 5. Eliminar la cuenta del usuario del sistema
    const { error: errUsuario } = await supabase
      .from('usuarios_sistema')
      .delete()
      .eq('id_usuario', idUsuario);

    if (errUsuario) {
      console.error('Error al eliminar usuario de sistema:', errUsuario);
      return { error: 'Error al eliminar la cuenta de usuario del sistema.' };
    }
  }

  // 6. Eliminar asignación de roles
  const { error: errRoles } = await supabase
    .from('equipo_roles')
    .delete()
    .eq('id_miembro', idMiembro);

  if (errRoles) {
    console.error('Error al eliminar roles del miembro:', errRoles);
    return { error: 'Error al desvincular los roles del miembro.' };
  }

  // 7. Eliminar el registro principal en equipo
  const { error: errMiembro } = await supabase
    .from('equipo')
    .delete()
    .eq('id_miembro', idMiembro);

  if (errMiembro) {
    console.error('Error al eliminar miembro:', errMiembro);
    return { error: 'Error al eliminar el registro del miembro del equipo.' };
  }

  revalidatePath('/admin/equipo');
  return { success: true };
}

export async function validarPasswordUsuario(idUsuario: number, passwordIngresada: string) {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) {
    return { error: 'No autorizado. Por favor inicie sesión.' };
  }

  const supabase = await createClient();

  // Verificar si es administrador
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let esAdmin = loggedInUser.usuario === 'admin' || (loggedInUser as any).roles?.includes('Super Admin') || (loggedInUser as any).roles?.includes('Administrador') || (loggedInUser as any).roles?.includes('Admin');
  if (!esAdmin && loggedInUser.id_miembro) {
    const { data: userRoles } = await supabase
      .from('equipo_roles')
      .select('roles(nombre)')
      .eq('id_miembro', loggedInUser.id_miembro);
    
    esAdmin = userRoles?.some((r: { roles: { nombre: string } | { nombre: string }[] | null }) => {
      const rObj = Array.isArray(r.roles) ? r.roles[0] : r.roles;
      return rObj?.nombre === 'Administrador' || rObj?.nombre === 'Super Admin';
    }) ?? false;
  }

  if (!esAdmin) {
    return { error: 'No autorizado. Solo el Administrador puede cambiar contraseñas.' };
  }

  const { data: usuario, error } = await supabase
    .from('usuarios_sistema')
    .select('password_hash')
    .eq('id_usuario', idUsuario)
    .single();

  if (error || !usuario) {
    console.error('Error al obtener usuario para validación:', error);
    return { error: 'No se pudo encontrar el usuario.' };
  }

  const verification = await verifyPassword(passwordIngresada, usuario.password_hash);
  if (verification.isValid) {
    if (verification.needsRehash) {
      const newHash = await hashPassword(passwordIngresada);
      await supabase.from('usuarios_sistema').update({ password_hash: newHash }).eq('id_usuario', idUsuario);
    }
    return { success: true };
  } else {
    return { error: 'La contraseña ingresada no es correcta.' };
  }
}

export async function actualizarPasswordUsuario(idUsuario: number, nuevaPassword: string) {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) {
    return { error: 'No autorizado. Por favor inicie sesión.' };
  }

  const supabase = await createClient();

  // Verificar si es administrador
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let esAdmin = loggedInUser.usuario === 'admin' || (loggedInUser as any).roles?.includes('Super Admin') || (loggedInUser as any).roles?.includes('Administrador') || (loggedInUser as any).roles?.includes('Admin');
  if (!esAdmin && loggedInUser.id_miembro) {
    const { data: userRoles } = await supabase
      .from('equipo_roles')
      .select('roles(nombre)')
      .eq('id_miembro', loggedInUser.id_miembro);
    
    esAdmin = userRoles?.some((r: { roles: { nombre: string } | { nombre: string }[] | null }) => {
      const rObj = Array.isArray(r.roles) ? r.roles[0] : r.roles;
      return rObj?.nombre === 'Administrador' || rObj?.nombre === 'Super Admin';
    }) ?? false;
  }

  if (!esAdmin) {
    return { error: 'No autorizado. Solo el Administrador puede cambiar contraseñas.' };
  }

  const passwordHash = await hashPassword(nuevaPassword);
  const { error } = await supabase
    .from('usuarios_sistema')
    .update({
      password_hash: passwordHash,
      fecha_actualizacion: new Date().toISOString()
    })
    .eq('id_usuario', idUsuario);

  if (error) {
    console.error('Error al actualizar contraseña:', error);
    return { error: 'Error al guardar la nueva contraseña.' };
  }

  revalidatePath('/admin/equipo');
  return { success: true };
}

'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { getSesionActual } from '@/app/actions/auth';
import { Caja, MovimientoCaja } from '@/types/gym.types';

// Helper para verificar si el usuario es Administrador / Super Admin
function esUsuarioAdmin(user: { usuario?: string; roles?: string[] }) {
  return (
    user.usuario === 'admin' ||
    user.roles?.includes('Super Admin') ||
    user.roles?.includes('Administrador')
  );
}

// Obtener la caja activa (primero la propia del usuario o la caja activa global del gimnasio si es Admin/Caja)
export async function obtenerCajaActiva() {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) {
    return null;
  }

  const supabase = await createClient();

  // 1. Primero intentar obtener la caja abierta del propio usuario en sesión
  const { data: miCaja, error: errMiCaja } = await supabase
    .from('cajas')
    .select('*, usuarios_sistema(id_usuario, usuario, equipo(id_miembro, nombre, apellido, dni, email))')
    .eq('id_usuario', loggedInUser.id_usuario)
    .eq('estado', 'ABIERTA')
    .maybeSingle();

  if (miCaja && !errMiCaja) {
    return miCaja as Caja;
  }

  // 2. Si el usuario actual no tiene caja propia pero es Admin / Super Admin,
  // puede obtener la caja activa abierta por cualquier colaborador para auditarla o cerrarla.
  const tienePermisoAdmin = esUsuarioAdmin(loggedInUser);

  if (tienePermisoAdmin) {
    const { data: cajaGlobal, error: errGlobal } = await supabase
      .from('cajas')
      .select('*, usuarios_sistema(id_usuario, usuario, equipo(id_miembro, nombre, apellido, dni, email))')
      .eq('estado', 'ABIERTA')
      .order('fecha_apertura', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cajaGlobal && !errGlobal) {
      return cajaGlobal as Caja;
    }
  }

  return null;
}

// Obtener todas las cajas abiertas activas en el sistema (Solo Administrador o la propia del usuario)
export async function obtenerCajasAbiertas() {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) {
    return [];
  }

  const esAdmin = esUsuarioAdmin(loggedInUser);
  const supabase = await createClient();

  let query = supabase
    .from('cajas')
    .select('*, usuarios_sistema(id_usuario, usuario, equipo(id_miembro, nombre, apellido, dni, email))')
    .eq('estado', 'ABIERTA')
    .order('fecha_apertura', { ascending: false });

  // Si no es Administrador, solo puede consultar su propia caja abierta
  if (!esAdmin) {
    query = query.eq('id_usuario', loggedInUser.id_usuario);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error al obtener cajas abiertas:', error);
    return [];
  }

  return (data || []) as Caja[];
}

// Obtener el historial completo de arqueos y turnos de caja (SOLO visible para Administradores)
export async function obtenerHistorialCajas(limite = 50) {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) {
    return [];
  }

  // REGLA: Solo el administrador puede ver el historial de cajas y auditoría
  const esAdmin = esUsuarioAdmin(loggedInUser);
  if (!esAdmin) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cajas')
    .select('*, usuarios_sistema(id_usuario, usuario, equipo(id_miembro, nombre, apellido, dni, email))')
    .order('id_caja', { ascending: false })
    .limit(limite);

  if (error) {
    console.error('Error al obtener historial de cajas:', error);
    return [];
  }

  return (data || []) as Caja[];
}

// Abrir la caja diaria para el usuario actual (Garantiza 1 sola caja activa simultánea en el gimnasio)
export async function abrirCaja(montoInicial: number) {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) {
    return { error: 'No autorizado. Por favor inicie sesión.' };
  }

  if (montoInicial < 0) {
    return { error: 'El monto inicial no puede ser negativo.' };
  }

  const supabase = await createClient();
  const fechaHoy = new Date().toISOString().split('T')[0];

  // 1. Validar si ya existe una caja registrada hoy para este usuario (restricción única de BD)
  const { data: cajaUsuarioHoy } = await supabase
    .from('cajas')
    .select('id_caja, estado')
    .eq('id_usuario', loggedInUser.id_usuario)
    .eq('fecha', fechaHoy)
    .maybeSingle();

  if (cajaUsuarioHoy) {
    if (cajaUsuarioHoy.estado === 'ABIERTA') {
      return { error: `Ya tienes una caja abierta en tu turno actual (ID #${cajaUsuarioHoy.id_caja}). No puedes abrir otra.` };
    } else {
      return {
        error: `Ya registraste y cerraste tu caja diaria de hoy (${fechaHoy}). La base de datos tiene una regla de 1 caja por colaborador al día. Si necesitas continuar cobrando, puedes pulsar en "Reabrir Turno" o solicitarlo al Administrador.`
      };
    }
  }

  // 2. REGLA DE CONTROL: Validar si ya existe otra caja ABIERTA en el gimnasio
  const { data: otraCajaAbierta } = await supabase
    .from('cajas')
    .select('*, usuarios_sistema(usuario, equipo(nombre, apellido))')
    .eq('estado', 'ABIERTA')
    .order('fecha_apertura', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (otraCajaAbierta) {
    const responsable = otraCajaAbierta.usuarios_sistema?.equipo?.nombre
      ? `${otraCajaAbierta.usuarios_sistema.equipo.nombre} ${otraCajaAbierta.usuarios_sistema.equipo.apellido || ''} (@${otraCajaAbierta.usuarios_sistema.usuario})`
      : `@${otraCajaAbierta.usuarios_sistema?.usuario || 'Colaborador'}`;

    return {
      error: `Ya existe un turno de caja ABIERTO en el gimnasio a cargo de ${responsable}. Para evitar descuadres en el cajón de efectivo, primero deben cerrar la caja anterior antes de iniciar un nuevo turno.`
    };
  }

  const { data: caja, error } = await supabase
    .from('cajas')
    .insert({
      id_usuario: loggedInUser.id_usuario,
      fecha: fechaHoy,
      monto_inicial: montoInicial,
      estado: 'ABIERTA'
    })
    .select('*, usuarios_sistema(id_usuario, usuario, equipo(id_miembro, nombre, apellido, dni, email))')
    .single();

  if (error) {
    console.error('Error al abrir caja:', error);
    if (error.code === '23505') {
      return {
        error: `Ya registraste una caja hoy (${fechaHoy}). La regla del sistema permite 1 caja por colaborador al día. Si fue cerrada por error, puedes reabrirla.`
      };
    }
    return { error: `Error al abrir caja: ${error.message}` };
  }

  // Registrar en los logs de seguridad
  await supabase.from('logs_seguridad').insert({
    id_usuario: loggedInUser.id_usuario,
    accion: 'APERTURA_CAJA',
    detalle: `Apertura de caja diaria. Fondo inicial: S/ ${montoInicial.toFixed(2)} por ${loggedInUser.usuario}`
  });

  revalidatePath('/admin/caja');
  revalidatePath('/admin/ventas');
  revalidatePath('/admin/finanzas');
  revalidatePath('/admin/equipo');
  revalidatePath('/admin');
  return { success: true, caja: caja as Caja };
}

// Reabrir una caja cerrada (Permitido para el Administrador o el propio colaborador titular)
export async function reabrirCaja(idCaja: number) {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) {
    return { error: 'No autorizado. Por favor inicie sesión.' };
  }

  const supabase = await createClient();

  const { data: caja, error: errCaja } = await supabase
    .from('cajas')
    .select('*, usuarios_sistema(usuario, equipo(nombre, apellido))')
    .eq('id_caja', idCaja)
    .single();

  if (errCaja || !caja) {
    return { error: 'La caja no existe.' };
  }

  const esAdmin = esUsuarioAdmin(loggedInUser);
  const esPropio = caja.id_usuario === loggedInUser.id_usuario;

  if (!esAdmin && !esPropio) {
    return { error: 'No tienes permisos para reabrir esta caja.' };
  }

  // Validar si ya hay OTRA caja ABIERTA en el gimnasio
  const { data: otraAbierta } = await supabase
    .from('cajas')
    .select('id_caja')
    .eq('estado', 'ABIERTA')
    .neq('id_caja', idCaja)
    .limit(1)
    .maybeSingle();

  if (otraAbierta) {
    return { error: `Ya existe otra caja abierta actualmente (ID #${otraAbierta.id_caja}). Cierra la caja activa antes de reabrir esta.` };
  }

  const { error } = await supabase
    .from('cajas')
    .update({
      estado: 'ABIERTA',
      monto_final: null,
      fecha_cierre: null
    })
    .eq('id_caja', idCaja);

  if (error) {
    console.error('Error al reabrir caja:', error);
    return { error: `Error al reabrir caja: ${error.message}` };
  }

  // Registrar en logs de seguridad
  await supabase.from('logs_seguridad').insert({
    id_usuario: loggedInUser.id_usuario,
    accion: 'REAPERTURA_CAJA',
    detalle: `Reapertura de caja ID #${idCaja} por ${loggedInUser.usuario}`
  });

  revalidatePath('/admin/caja');
  revalidatePath('/admin/ventas');
  revalidatePath('/admin/finanzas');
  revalidatePath('/admin/equipo');
  revalidatePath('/admin');
  return { success: true };
}

// Cerrar la caja del día (SOLO permitido para el Administrador o el propio colaborador que la abrió)
export async function cerrarCaja(idCaja: number, montoFinal: number) {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) {
    return { error: 'No autorizado. Por favor inicie sesión.' };
  }

  if (montoFinal < 0) {
    return { error: 'El monto final no puede ser negativo.' };
  }

  const supabase = await createClient();

  // Validar que la caja exista
  const { data: caja, error: errCaja } = await supabase
    .from('cajas')
    .select('*, usuarios_sistema(id_usuario, usuario, equipo(nombre, apellido, dni))')
    .eq('id_caja', idCaja)
    .single();

  if (errCaja || !caja) {
    return { error: 'La caja no existe.' };
  }

  if (caja.estado === 'CERRADA') {
    return { error: 'La caja ya se encuentra CERRADA.' };
  }

  // REGLA: Solo el Administrador o el propio colaborador que abrió la caja pueden cerrarla
  const esAdmin = esUsuarioAdmin(loggedInUser);
  const esPropioResponsable = caja.id_usuario === loggedInUser.id_usuario;

  if (!esAdmin && !esPropioResponsable) {
    return {
      error: 'No tienes permisos para cerrar una caja que no abriste. Solo el Administrador o el propio colaborador que abrió la caja pueden cerrarla.'
    };
  }

  const { error } = await supabase
    .from('cajas')
    .update({
      monto_final: montoFinal,
      estado: 'CERRADA',
      fecha_cierre: new Date().toISOString()
    })
    .eq('id_caja', idCaja);

  if (error) {
    console.error('Error al cerrar caja:', error);
    return { error: `Error al cerrar caja: ${error.message}` };
  }

  // Registrar en los logs de seguridad identificando quién la abrió y quién la cerró
  const responsableApertura = caja.usuarios_sistema?.equipo?.nombre 
    ? `${caja.usuarios_sistema.equipo.nombre} ${caja.usuarios_sistema.equipo.apellido || ''} (@${caja.usuarios_sistema.usuario})`
    : caja.usuarios_sistema?.usuario || `Usuario #${caja.id_usuario}`;

  await supabase.from('logs_seguridad').insert({
    id_usuario: loggedInUser.id_usuario,
    accion: 'CIERRE_CAJA',
    detalle: `Cierre de caja ID ${idCaja} (Abierta originalmente por: ${responsableApertura}). Monto final arqueado: S/ ${montoFinal.toFixed(2)}. Cerrada por: ${loggedInUser.usuario}`
  });

  revalidatePath('/admin/caja');
  revalidatePath('/admin/ventas');
  revalidatePath('/admin/finanzas');
  revalidatePath('/admin/equipo');
  revalidatePath('/admin');
  return { success: true };
}

// Obtener todos los movimientos de una caja específica
export async function obtenerMovimientosCaja(idCaja: number) {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) {
    throw new Error('No autorizado.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('movimientos_caja')
    .select('*')
    .eq('id_caja', idCaja)
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error al obtener movimientos de caja:', error);
    return [];
  }

  return data as MovimientoCaja[];
}

// Registrar movimiento manual (ingreso/egreso administrativo extra)
export async function registrarMovimientoManual(idCaja: number, tipo: 'INGRESO' | 'EGRESO', concepto: string, monto: number) {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) {
    return { error: 'No autorizado. Por favor inicie sesión.' };
  }

  if (!concepto || monto <= 0) {
    return { error: 'Concepto obligatorio y monto debe ser mayor a 0.' };
  }

  const supabase = await createClient();

  // Verificar que la caja esté abierta
  const { data: caja } = await supabase
    .from('cajas')
    .select('estado')
    .eq('id_caja', idCaja)
    .single();

  if (!caja || caja.estado !== 'ABIERTA') {
    return { error: 'La caja debe estar abierta para registrar movimientos.' };
  }

  const { error } = await supabase
    .from('movimientos_caja')
    .insert({
      id_caja: idCaja,
      id_usuario: loggedInUser.id_usuario,
      tipo,
      concepto,
      monto
    });

  if (error) {
    console.error('Error al registrar movimiento manual:', error);
    return { error: `Error al registrar movimiento: ${error.message}` };
  }

  revalidatePath('/admin/caja');
  return { success: true };
}

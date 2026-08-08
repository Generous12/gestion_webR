'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { getSesionActual } from '@/app/actions/auth';
import { TipoMembresia } from '@/types/gym.types';

// Obtener todos los tipos de membresías activos
export async function obtenerTiposMembresia() {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) {
    throw new Error('No autorizado.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tipos_membresia')
    .select('*')
    .eq('estado', 'ACTIVA')
    .order('precio', { ascending: true });

  if (error) {
    console.error('Error al obtener tipos de membresía:', error);
    return [];
  }

  return data as TipoMembresia[];
}

// Crear un nuevo tipo de membresía/plan
export async function crearTipoMembresia(formData: FormData) {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) {
    return { error: 'No autorizado. Por favor inicie sesión.' };
  }

  const supabase = await createClient();

  const nombre = formData.get('nombre') as string;
  const descripcion = formData.get('descripcion') as string;
  const precioRaw = formData.get('precio') as string;
  const duracionRaw = formData.get('duracion_dias') as string;

  if (!nombre || !precioRaw || !duracionRaw) {
    return { error: 'Nombre, Precio y Duración son obligatorios.' };
  }

  const precio = parseFloat(precioRaw);
  const duracion_dias = parseInt(duracionRaw);

  if (isNaN(precio) || precio <= 0) {
    return { error: 'El precio debe ser un número mayor a 0.' };
  }

  if (isNaN(duracion_dias) || duracion_dias <= 0) {
    return { error: 'La duración en días debe ser un número entero mayor a 0.' };
  }

  const { error } = await supabase
    .from('tipos_membresia')
    .insert({
      nombre,
      descripcion: descripcion || null,
      precio,
      duracion_dias,
      estado: 'ACTIVA'
    });

  if (error) {
    console.error('Error al crear tipo de membresía:', error);
    return { error: `Error al crear plan: ${error.message}` };
  }

  revalidatePath('/admin/ventas');
  return { success: true };
}

// Vender una membresía y registrar pagos / ingresos en caja
export async function venderMembresia(
  idCliente: number,
  idTipo: number,
  precioPagado: number,
  fechaInicioStr: string,
  pagos: { id_metodo: number; monto: number; numero_operacion?: string; comprobante_url?: string }[]
) {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) {
    return { error: 'No autorizado. Por favor inicie sesión.' };
  }

  const supabase = await createClient();

  // 1. Validar que el usuario tenga una caja abierta para hoy
  const { data: cajaActiva, error: errCaja } = await supabase
    .from('cajas')
    .select('*')
    .eq('id_usuario', loggedInUser.id_usuario)
    .eq('estado', 'ABIERTA')
    .maybeSingle();

  if (errCaja || !cajaActiva) {
    return { error: 'Debes tener una caja ABIERTA en tu turno para registrar una venta. Ve al módulo "Arqueo de Caja".' };
  }

  // 2. Validar que la sumatoria de los montos de pago coincida con el precio pagado
  const totalMontoPagos = pagos.reduce((sum, p) => sum + p.monto, 0);
  // Pequeño margen para diferencias decimales de flotante
  if (Math.abs(totalMontoPagos - precioPagado) > 0.01) {
    return { error: `La suma de los métodos de pago (S/ ${totalMontoPagos.toFixed(2)}) no coincide con el total de la membresía (S/ ${precioPagado.toFixed(2)}).` };
  }

  // 3. Obtener detalles del plan seleccionado para calcular la duración
  const { data: plan, error: errPlan } = await supabase
    .from('tipos_membresia')
    .select('*')
    .eq('id_tipo', idTipo)
    .single();

  if (errPlan || !plan) {
    return { error: 'El plan de membresía seleccionado no existe o no está activo.' };
  }

  // Calcular fecha de fin
  const fechaInicio = new Date(fechaInicioStr + 'T00:00:00');
  const fechaFin = new Date(fechaInicio);
  fechaFin.setDate(fechaFin.getDate() + plan.duracion_dias);

  const fechaFinStr = fechaFin.toISOString().split('T')[0];

  // 4. Validar si el cliente ya tiene una membresía ACTIVA
  const { data: membresiaActiva } = await supabase
    .from('membresias_cliente')
    .select('id_membresia')
    .eq('id_cliente', idCliente)
    .eq('estado', 'ACTIVA')
    .maybeSingle();

  if (membresiaActiva) {
    return { error: 'El cliente ya cuenta con una membresía ACTIVA en el sistema. Debe vencer o cancelarse para adquirir otra.' };
  }

  // 5. Iniciar la venta (Membresía, Pagos y Movimientos)
  // Nota: Dado que no estamos usando transacciones manuales crudas por REST API directamente (a menos de usar RPC),
  // realizaremos los inserts en orden y si hay error, manejaremos el caso. 
  
  // A. Registrar membresía
  const { data: membresia, error: errMemb } = await supabase
    .from('membresias_cliente')
    .insert({
      id_cliente: idCliente,
      id_tipo: idTipo,
      id_usuario: loggedInUser.id_usuario,
      precio_pagado: precioPagado,
      fecha_inicio: fechaInicioStr,
      fecha_fin: fechaFinStr,
      estado: 'ACTIVA'
    })
    .select()
    .single();

  if (errMemb || !membresia) {
    console.error('Error al insertar membresía:', errMemb);
    return { error: `No se pudo registrar la membresía: ${errMemb?.message}` };
  }

  // B. Registrar cada pago y su correspondiente movimiento de caja
  for (const pagoItem of pagos) {
    if (pagoItem.monto <= 0) continue;

    // Obtener nombre del método de pago
    const { data: metodoObj } = await supabase
      .from('metodos_pago')
      .select('nombre')
      .eq('id_metodo', pagoItem.id_metodo)
      .single();

    const metodoNombre = metodoObj?.nombre || 'Desconocido';

    // Insertar pago con comprobante_url opcional
    const basePago: Record<string, unknown> = {
      id_membresia: membresia.id_membresia,
      id_metodo: pagoItem.id_metodo,
      id_usuario: loggedInUser.id_usuario,
      concepto: `Pago de Membresía: ${plan.nombre}`,
      monto: pagoItem.monto,
      numero_operacion: pagoItem.numero_operacion || null,
      estado: 'CONFIRMADO'
    };

    let { data: pagoReg, error: errPago } = await supabase
      .from('pagos')
      .insert({
        ...basePago,
        comprobante_url: pagoItem.comprobante_url || null
      })
      .select()
      .single();

    if (errPago && (errPago.message?.includes('column') || errPago.code === 'PGRST204')) {
      const fallback = await supabase
        .from('pagos')
        .insert(basePago)
        .select()
        .single();
      pagoReg = fallback.data;
      errPago = fallback.error;
    }

    if (errPago || !pagoReg) {
      console.error('Error al registrar pago:', errPago);
      // Continuar con el resto de pagos si aplica
      continue;
    }

    // Insertar movimiento de caja (INGRESO)
    const { error: errMov } = await supabase
      .from('movimientos_caja')
      .insert({
        id_caja: cajaActiva.id_caja,
        id_usuario: loggedInUser.id_usuario,
        id_pago: pagoReg.id_pago,
        tipo: 'INGRESO',
        concepto: `Cobro Membresía: ${plan.nombre} (${metodoNombre})`,
        monto: pagoItem.monto
      });

    if (errMov) {
      console.error('Error al registrar movimiento de caja:', errMov);
    }
  }

  // C. Registrar logs de seguridad
  await supabase.from('logs_seguridad').insert({
    id_usuario: loggedInUser.id_usuario,
    accion: 'VENTA_MEMBRESIA',
    detalle: `Membresía vendida con éxito. ID Cliente: ${idCliente}, Plan: ${plan.nombre}, Total: S/ ${precioPagado}`
  });

  revalidatePath('/admin/recepcion');
  revalidatePath('/admin/ventas');
  revalidatePath('/admin/caja');
  revalidatePath('/admin');
  
  return { success: true, id_membresia: membresia.id_membresia };
}

// Eliminar membresía de un cliente y todos sus registros financieros relacionados (pagos, caja, log)
export async function eliminarMembresiaCliente(idMembresia: number) {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) {
    return { error: 'No autorizado. Por favor inicie sesión.' };
  }

  const supabase = await createClient();

  // 1. Obtener los pagos asociados a esta membresía
  const { data: pagos, error: errPagos } = await supabase
    .from('pagos')
    .select('id_pago')
    .eq('id_membresia', idMembresia);

  if (errPagos) {
    console.error('Error al obtener pagos para eliminar:', errPagos);
    return { error: `Error al buscar pagos asociados: ${errPagos.message}` };
  }

  const pagoIds = pagos?.map(p => p.id_pago) || [];

  // 2. Eliminar movimientos de caja de estos pagos
  if (pagoIds.length > 0) {
    const { error: errMovs } = await supabase
      .from('movimientos_caja')
      .delete()
      .in('id_pago', pagoIds);

    if (errMovs) {
      console.error('Error al eliminar movimientos de caja:', errMovs);
      return { error: `Error al eliminar movimientos de caja: ${errMovs.message}` };
    }
  }

  // 3. Eliminar los pagos asociados
  const { error: errDelPagos } = await supabase
    .from('pagos')
    .delete()
    .eq('id_membresia', idMembresia);

  if (errDelPagos) {
    console.error('Error al eliminar pagos:', errDelPagos);
    return { error: `Error al eliminar los pagos: ${errDelPagos.message}` };
  }

  // 4. Obtener detalles para auditoría
  const { data: membInfo } = await supabase
    .from('membresias_cliente')
    .select('id_cliente, clientes(nombre, apellido)')
    .eq('id_membresia', idMembresia)
    .maybeSingle();

  const cObj = membInfo ? (Array.isArray(membInfo.clientes) ? membInfo.clientes[0] : membInfo.clientes) : null;
  const clienteNombre = cObj ? `${cObj.nombre} ${cObj.apellido || ''}`.trim() : `ID ${membInfo?.id_cliente}`;

  // 5. Eliminar la membresía de cliente
  const { error: errDelMemb } = await supabase
    .from('membresias_cliente')
    .delete()
    .eq('id_membresia', idMembresia);

  if (errDelMemb) {
    console.error('Error al eliminar membresía:', errDelMemb);
    return { error: `Error al eliminar la membresía: ${errDelMemb.message}` };
  }

  // 6. Registrar log de seguridad
  await supabase.from('logs_seguridad').insert({
    id_usuario: loggedInUser.id_usuario,
    accion: 'ELIMINAR_MEMBRESIA',
    detalle: `Membresía eliminada. ID Membresía: ${idMembresia}, Cliente: ${clienteNombre}`
  });

  revalidatePath('/admin/recepcion');
  revalidatePath('/admin/ventas');
  revalidatePath('/admin/caja');
  revalidatePath('/admin');

  return { success: true };
}

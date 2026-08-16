'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { getSesionActual } from '@/app/actions/auth';
import { CategoriaGasto, Gasto } from '@/types/gym.types';

// Obtener categorías de gastos activas
export async function obtenerCategoriasGasto() {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) {
    throw new Error('No autorizado.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('categorias_gasto')
    .select('*')
    .eq('estado', 'ACTIVA')
    .order('nombre', { ascending: true });

  if (error) {
    console.error('Error al obtener categorías de gasto:', error);
    return [];
  }

  // Si no hay categorías, sembramos unas por defecto
  if (data.length === 0) {
    console.log('Sembrando categorías de gasto por defecto...');
    const defaultCats = [
      { nombre: 'Alquiler', descripcion: 'Pago del alquiler del local' },
      { nombre: 'Servicios Públicos', descripcion: 'Agua, luz, internet' },
      { nombre: 'Mantenimiento', descripcion: 'Reparación de máquinas y local' },
      { nombre: 'Marketing', descripcion: 'Publicidad y redes sociales' },
      { nombre: 'Personal', descripcion: 'Pago a entrenadores o personal administrativo' }
    ];

    const { error: errInsert } = await supabase
      .from('categorias_gasto')
      .insert(defaultCats);

    if (!errInsert) {
      const { data: refetched } = await supabase
        .from('categorias_gasto')
        .select('*')
        .eq('estado', 'ACTIVA')
        .order('nombre', { ascending: true });
      return (refetched || []) as CategoriaGasto[];
    }
  }

  return data as CategoriaGasto[];
}

// Obtener gastos programados
export async function obtenerGastosProgramados() {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) {
    throw new Error('No autorizado.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('gastos')
    .select('*, categorias_gasto(*)')
    .order('fecha_programada', { ascending: true });

  if (error) {
    console.error('Error al obtener gastos:', error);
    return [];
  }

  return data as Gasto[];
}

// Crear un nuevo gasto programado
export async function crearGasto(formData: FormData) {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) {
    return { error: 'No autorizado. Por favor inicie sesión.' };
  }

  const supabase = await createClient();

  const idCategoriaRaw = formData.get('id_categoria') as string;
  const concepto = formData.get('concepto') as string;
  const descripcion = formData.get('descripcion') as string;
  const montoEstimadoRaw = formData.get('monto_estimado') as string;
  const fechaProgramada = formData.get('fecha_programada') as string;

  if (!concepto || !montoEstimadoRaw || !fechaProgramada) {
    return { error: 'Concepto, Monto Estimado y Fecha Programada son obligatorios.' };
  }

  const id_categoria = idCategoriaRaw ? parseInt(idCategoriaRaw) : null;
  const monto_estimado = parseFloat(montoEstimadoRaw);

  if (isNaN(monto_estimado) || monto_estimado < 0) {
    return { error: 'El monto estimado debe ser un número positivo.' };
  }

  const { error } = await supabase
    .from('gastos')
    .insert({
      id_categoria: isNaN(Number(id_categoria)) ? null : id_categoria,
      id_usuario: loggedInUser.id_usuario,
      concepto,
      descripcion: descripcion || null,
      monto_estimado,
      fecha_programada: fechaProgramada,
      estado: 'PENDIENTE'
    });

  if (error) {
    console.error('Error al programar gasto:', error);
    return { error: `Error al registrar gasto: ${error.message}` };
  }

  revalidatePath('/admin/finanzas');
  return { success: true };
}

// Marcar un gasto programado como pagado / cancelado (control administrativo, NO afecta la caja chica diaria)
export async function pagarGasto(idGasto: number, montoFinal: number, _idCaja?: number) {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) {
    return { error: 'No autorizado. Por favor inicie sesión.' };
  }

  if (montoFinal < 0) {
    return { error: 'El monto final no puede ser negativo.' };
  }

  const supabase = await createClient();

  // 1. Obtener detalles del gasto
  const { data: gasto, error: errGasto } = await supabase
    .from('gastos')
    .select('*')
    .eq('id_gasto', idGasto)
    .single();

  if (errGasto || !gasto) {
    return { error: 'El gasto seleccionado no existe.' };
  }

  if (gasto.estado === 'PAGADO') {
    return { error: 'Este gasto ya se encuentra PAGADO.' };
  }

  const fechaHoy = new Date().toISOString().split('T')[0];

  // 2. Actualizar gasto a estado PAGADO
  const { error: errUpdate } = await supabase
    .from('gastos')
    .update({
      estado: 'PAGADO',
      monto_final: montoFinal,
      fecha_pago: fechaHoy,
      fecha_actualizacion: new Date().toISOString()
    })
    .eq('id_gasto', idGasto);

  if (errUpdate) {
    console.error('Error al pagar el gasto:', errUpdate);
    return { error: `No se pudo registrar el pago del gasto: ${errUpdate.message}` };
  }

  // 3. Registrar log de seguridad
  await supabase.from('logs_seguridad').insert({
    id_usuario: loggedInUser.id_usuario,
    accion: 'PAGO_GASTO',
    detalle: `Gasto marcado como pagado/cancelado: ${gasto.concepto}. Monto: S/ ${montoFinal.toFixed(2)} por ${loggedInUser.usuario}`
  });

  revalidatePath('/admin/finanzas');
  revalidatePath('/admin/caja');
  revalidatePath('/admin');
  return { success: true };
}


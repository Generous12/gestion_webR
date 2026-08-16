'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { getSesionActual } from '@/app/actions/auth';
import { Cliente } from '@/types/gym.types';
import { sanitizePostgrestParam } from '@/utils/security';

// Buscar clientes por DNI, Nombre o Apellido (o lista por defecto)
export async function buscarClientes(query: string) {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) {
    throw new Error('No autorizado.');
  }

  const supabase = await createClient();

  if (!query || query.trim() === '') {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('fecha_creacion', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error al obtener clientes recientes:', error);
      return [];
    }
    return data as Cliente[];
  }

  const cleanQuery = sanitizePostgrestParam(query.trim());
  if (!cleanQuery) {
    return [];
  }

  // Búsqueda por DNI exacto o Nombre/Apellido parcial
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .or(`dni.eq.${cleanQuery},nombre.ilike.%${cleanQuery}%,apellido.ilike.%${cleanQuery}%`)
    .order('nombre', { ascending: true })
    .limit(15);

  if (error) {
    console.error('Error al buscar clientes:', error);
    return [];
  }

  return data as Cliente[];
}

// Crear un nuevo cliente
export async function crearCliente(formData: FormData) {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) {
    return { error: 'No autorizado. Por favor inicie sesión.' };
  }

  const supabase = await createClient();

  const dni = formData.get('dni') as string;
  const nombre = formData.get('nombre') as string;
  const apellido = formData.get('apellido') as string;
  const telefono = formData.get('telefono') as string;
  const email = formData.get('email') as string;
  const fechaNacimiento = formData.get('fecha_nacimiento') as string;
  const direccion = formData.get('direccion') as string;
  const fotoUrl = formData.get('foto_url') as string;
  const contactoEmergencia = formData.get('contacto_emergencia') as string;
  const telefonoEmergencia = formData.get('telefono_emergencia') as string;
  const observaciones = formData.get('observaciones') as string;

  if (!nombre) {
    return { error: 'El nombre es obligatorio.' };
  }

  if (telefono && (telefono.trim().length !== 9 || !/^\d+$/.test(telefono.trim()))) {
    return { error: 'El número de teléfono debe constar exactamente de 9 dígitos numéricos.' };
  }

  if (telefonoEmergencia && (telefonoEmergencia.trim().length !== 9 || !/^\d+$/.test(telefonoEmergencia.trim()))) {
    return { error: 'El número de teléfono de emergencia debe constar exactamente de 9 dígitos numéricos.' };
  }

  // Si se ingresó DNI, validar duplicados
  if (dni) {
    const { data: existingDni } = await supabase
      .from('clientes')
      .select('id_cliente')
      .eq('dni', dni)
      .maybeSingle();

    if (existingDni) {
      return { error: 'Ya existe un cliente registrado con este DNI.' };
    }
  }

  const { data: cliente, error } = await supabase
    .from('clientes')
    .insert({
      dni: dni || null,
      nombre,
      apellido: apellido || null,
      telefono: telefono || null,
      email: email || null,
      fecha_nacimiento: fechaNacimiento || null,
      direccion: direccion || null,
      foto_url: fotoUrl || null,
      contacto_emergencia: contactoEmergencia || null,
      telefono_emergencia: telefonoEmergencia || null,
      observaciones: observaciones || null,
      estado: 'ACTIVO'
    })
    .select()
    .single();

  if (error) {
    console.error('Error al crear cliente:', error);
    return { error: `Error al registrar cliente: ${error.message}` };
  }

  revalidatePath('/admin/recepcion');
  revalidatePath('/admin/ventas');
  return { success: true, cliente: cliente as Cliente };
}

// Editar un cliente existente
export async function editarCliente(idCliente: number, formData: FormData) {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) {
    return { error: 'No autorizado. Por favor inicie sesión.' };
  }

  const supabase = await createClient();

  const dni = formData.get('dni') as string;
  const nombre = formData.get('nombre') as string;
  const apellido = formData.get('apellido') as string;
  const telefono = formData.get('telefono') as string;
  const email = formData.get('email') as string;
  const fechaNacimiento = formData.get('fecha_nacimiento') as string;
  const direccion = formData.get('direccion') as string;
  const fotoUrl = formData.get('foto_url') as string;
  const contactoEmergencia = formData.get('contacto_emergencia') as string;
  const telefonoEmergencia = formData.get('telefono_emergencia') as string;
  const observaciones = formData.get('observaciones') as string;
  const estado = formData.get('estado') as 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO';

  if (!nombre) {
    return { error: 'El nombre es obligatorio.' };
  }

  if (telefono && (telefono.trim().length !== 9 || !/^\d+$/.test(telefono.trim()))) {
    return { error: 'El número de teléfono debe constar exactamente de 9 dígitos numéricos.' };
  }

  if (telefonoEmergencia && (telefonoEmergencia.trim().length !== 9 || !/^\d+$/.test(telefonoEmergencia.trim()))) {
    return { error: 'El número de teléfono de emergencia debe constar exactamente de 9 dígitos numéricos.' };
  }

  // Validar duplicados de DNI (excepto él mismo)
  if (dni) {
    const { data: existingDni } = await supabase
      .from('clientes')
      .select('id_cliente')
      .eq('dni', dni)
      .neq('id_cliente', idCliente)
      .maybeSingle();

    if (existingDni) {
      return { error: 'Ya existe otro cliente registrado con este DNI.' };
    }
  }

  const { error } = await supabase
    .from('clientes')
    .update({
      dni: dni || null,
      nombre,
      apellido: apellido || null,
      telefono: telefono || null,
      email: email || null,
      fecha_nacimiento: fechaNacimiento || null,
      direccion: direccion || null,
      foto_url: fotoUrl || null,
      contacto_emergencia: contactoEmergencia || null,
      telefono_emergencia: telefonoEmergencia || null,
      observaciones: observaciones || null,
      estado,
      fecha_actualizacion: new Date().toISOString()
    })
    .eq('id_cliente', idCliente);

  if (error) {
    console.error('Error al editar cliente:', error);
    return { error: `Error al actualizar datos del cliente: ${error.message}` };
  }

  revalidatePath('/admin/recepcion');
  revalidatePath('/admin/ventas');
  return { success: true };
}

// Obtener estado de acceso en tiempo real de un cliente
export async function obtenerEstadoAccesoCliente(idCliente: number) {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) {
    throw new Error('No autorizado.');
  }

  const supabase = await createClient();

  // 1. Verificar si el cliente está bloqueado o inactivo en su ficha principal
  const { data: cliente, error: errCliente } = await supabase
    .from('clientes')
    .select('estado, nombre, apellido, dni')
    .eq('id_cliente', idCliente)
    .single();

  if (errCliente || !cliente) {
    return { status: 'DENEGADO', message: 'Cliente no encontrado', detail: 'El registro del cliente no existe.' };
  }

  if (cliente.estado === 'BLOQUEADO') {
    return { status: 'DENEGADO', message: 'ACCESO BLOQUEADO', detail: 'El cliente se encuentra BLOQUEADO en el sistema.' };
  }

  if (cliente.estado === 'INACTIVO') {
    return { status: 'DENEGADO', message: 'FICHA INACTIVA', detail: 'La ficha del cliente está desactivada.' };
  }

  // 2. Buscar membresías (de la más nueva a la más antigua)
  const { data: membresias, error: errMemb } = await supabase
    .from('membresias_cliente')
    .select('*, tipos_membresia(*)')
    .eq('id_cliente', idCliente)
    .order('fecha_fin', { ascending: false });

  if (errMemb || !membresias || membresias.length === 0) {
    return { status: 'DENEGADO', message: 'SIN PLAN', detail: 'El cliente no tiene ninguna membresía registrada.' };
  }

  // Buscar si hay alguna que esté marcada como ACTIVA
  const activeMemb = membresias.find(m => m.estado === 'ACTIVA');

  if (activeMemb) {
    const hoyStr = new Date().toISOString().split('T')[0];
    if (activeMemb.fecha_fin >= hoyStr) {
      return {
        status: 'PERMITIDO',
        message: 'ACCESO PERMITIDO',
        detail: `Plan activo: ${activeMemb.tipos_membresia?.nombre || 'General'}. Vence el ${new Date(activeMemb.fecha_fin + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}.`,
        membresia: activeMemb
      };
    } else {
      // Ha expirado pero sigue marcada como ACTIVA en la BD
      // La actualizamos a VENCIDA
      await supabase
        .from('membresias_cliente')
        .update({ estado: 'VENCIDA' })
        .eq('id_membresia', activeMemb.id_membresia);

      const diffTime = Math.abs(new Date(hoyStr).getTime() - new Date(activeMemb.fecha_fin).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        status: 'DENEGADO',
        message: 'PLAN VENCIDO',
        detail: `Venció hace ${diffDays} día(s) (el ${new Date(activeMemb.fecha_fin + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}).`,
        membresia: { ...activeMemb, estado: 'VENCIDA' }
      };
    }
  }

  // Si no hay membresía activa pero hay historial, ver el plan más reciente
  const latestMemb = membresias[0];
  const hoyStr = new Date().toISOString().split('T')[0];
  const diffTime = Math.abs(new Date(hoyStr).getTime() - new Date(latestMemb.fecha_fin).getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const expiredAgo = latestMemb.fecha_fin < hoyStr;

  return {
    status: 'DENEGADO',
    message: latestMemb.estado === 'CANCELADA' ? 'PLAN CANCELADO' : 'PLAN VENCIDO',
    detail: expiredAgo 
      ? `Venció el ${new Date(latestMemb.fecha_fin + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })} (hace ${diffDays} días).`
      : `El plan fue ${latestMemb.estado.toLowerCase()}.`,
    membresia: latestMemb
  };
}

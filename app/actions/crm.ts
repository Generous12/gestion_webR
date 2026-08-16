'use server';

import { createClient } from '@/utils/supabase/server';
import { getSesionActual } from '@/app/actions/auth';
import { MembresiaCliente, ContactoWeb } from '@/types/gym.types';
import { revalidatePath } from 'next/cache';
import { sanitizeText } from '@/utils/security';

// Obtiene los clientes cuyas membresías están por vencer o ya vencieron recientemente (rango de +- 10 días)
export async function obtenerClientesPorVencer(dias: number = 7) {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) {
    throw new Error('No autorizado.');
  }

  const supabase = await createClient();

  const hoy = new Date();
  const hace7Dias = new Date();
  hace7Dias.setDate(hoy.getDate() - 7);

  const limiteFuturo = new Date();
  limiteFuturo.setDate(hoy.getDate() + dias);

  const hace7DiasStr = hace7Dias.toISOString().split('T')[0];
  const limiteFuturoStr = limiteFuturo.toISOString().split('T')[0];

  // Consultar membresías que vencen en este rango de fecha
  // Incluimos tanto ACTIVA como VENCIDA para retención de los recientemente vencidos
  const { data, error } = await supabase
    .from('membresias_cliente')
    .select('*, clientes(*), tipos_membresia(*)')
    .gte('fecha_fin', hace7DiasStr)
    .lte('fecha_fin', limiteFuturoStr)
    .order('fecha_fin', { ascending: true });

  if (error) {
    console.error('Error al obtener clientes por vencer:', error);
    return [];
  }

  return data as unknown as MembresiaCliente[];
}

// -----------------------------------------------------------------------------
// GESTIÓN DE CONTACTOS WEB / PROSPECTOS (LEADS)
// -----------------------------------------------------------------------------

// Registrar un nuevo contacto desde la web pública (Landing)
export async function registrarContactoWeb(data: {
  nombre: string;
  dni: string;
  celular: string;
  email: string;
  motivo: string;
  mensaje: string;
}) {
  const supabase = await createClient();

  const nombre = sanitizeText(data.nombre?.trim() || '');
  const dni = data.dni?.replace(/\D/g, '').trim() || '';
  const celular = data.celular?.replace(/\D/g, '').trim() || '';
  const email = data.email?.toLowerCase().trim() || '';
  const motivo = sanitizeText(data.motivo?.trim() || 'Consulta General');
  const mensaje = sanitizeText(data.mensaje?.trim() || '');

  if (!nombre || nombre.length < 3) {
    return { error: 'Ingresa tu nombre completo válido.' };
  }
  if (!/^\d{8}$/.test(dni)) {
    return { error: 'El DNI debe contener exactamente 8 dígitos.' };
  }
  if (!/^\d{9}$/.test(celular)) {
    return { error: 'El celular debe contener 9 dígitos.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Ingresa un correo electrónico válido.' };
  }
  if (!mensaje || mensaje.length < 10) {
    return { error: 'El mensaje debe tener al menos 10 caracteres.' };
  }

  const { error } = await supabase.from('contactos_web').insert({
    nombre,
    dni,
    celular,
    email,
    motivo,
    mensaje,
    estado: 'NUEVO'
  });

  if (error) {
    console.error('Error al registrar contacto web:', error);
    return { error: 'Hubo un error al enviar tu consulta. Por favor inténtalo de nuevo.' };
  }

  revalidatePath('/admin/crm');
  return { success: true };
}

// Obtener la lista de prospectos y contactos web para el CRM
export async function obtenerContactosWeb(): Promise<ContactoWeb[]> {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) {
    return [];
  }

  const supabase = await createClient();

  const { data: contactos, error } = await supabase
    .from('contactos_web')
    .select('*')
    .order('fecha_registro', { ascending: false });

  if (error || !contactos) {
    console.error('Error al obtener contactos web:', error);
    return [];
  }

  // Obtener DNIs de socios existentes para calcular si ya es socio y si tiene membresía activa
  const dnis = contactos.map(c => c.dni).filter(Boolean);
  const foundDnis = new Set<string>();
  const activeMembershipsByDni = new Map<string, string>();

  if (dnis.length > 0) {
    const { data: clientes } = await supabase
      .from('clientes')
      .select('id_cliente, dni')
      .in('dni', dnis);

    if (clientes && clientes.length > 0) {
      clientes.forEach(cl => foundDnis.add(cl.dni));
      const clienteIds = clientes.map(cl => cl.id_cliente);
      const idToDni = new Map(clientes.map(cl => [cl.id_cliente, cl.dni]));

      const hoyStr = new Date().toISOString().split('T')[0];

      // Consultar si alguno tiene membresía activa y vigente hoy
      const { data: membresias } = await supabase
        .from('membresias_cliente')
        .select('id_cliente, fecha_fin, estado, tipos_membresia(nombre)')
        .in('id_cliente', clienteIds)
        .gte('fecha_fin', hoyStr)
        .eq('estado', 'ACTIVA');

      if (membresias) {
        membresias.forEach((m: { id_cliente: number; tipos_membresia?: { nombre?: string } | { nombre?: string }[] | null }) => {
          const dni = idToDni.get(m.id_cliente);
          if (dni) {
            let planName = 'Plan Activo';
            if (m.tipos_membresia) {
              if (Array.isArray(m.tipos_membresia)) {
                planName = m.tipos_membresia[0]?.nombre || planName;
              } else {
                planName = m.tipos_membresia.nombre || planName;
              }
            }
            activeMembershipsByDni.set(dni, planName);
          }
        });
      }
    }
  }

  return contactos.map(c => {
    const isRegistered = foundDnis.has(c.dni);
    const hasActivePlan = activeMembershipsByDni.has(c.dni);
    const planName = activeMembershipsByDni.get(c.dni) || null;

    let estado_socio: 'CON_MEMBRESIA_ACTIVA' | 'REGISTRADO_SIN_MEMBRESIA' | 'NO_REGISTRADO' = 'NO_REGISTRADO';
    if (hasActivePlan) {
      estado_socio = 'CON_MEMBRESIA_ACTIVA';
    } else if (isRegistered) {
      estado_socio = 'REGISTRADO_SIN_MEMBRESIA';
    }

    return {
      ...c,
      es_socio: isRegistered,
      tiene_membresia_activa: hasActivePlan,
      estado_socio,
      plan_actual: planName
    };
  }) as ContactoWeb[];
}

// Actualizar el estado de un contacto web (NUEVO, CONTACTADO, CONVERTIDO, DESCARTADO)
export async function actualizarEstadoContacto(
  id_contacto: number,
  estado: 'NUEVO' | 'CONTACTADO' | 'CONVERTIDO' | 'DESCARTADO',
  notas_admin?: string
) {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) {
    return { error: 'No autorizado.' };
  }

  const supabase = await createClient();

  const updatePayload: { estado: string; notas_admin?: string } = { estado };
  if (notas_admin !== undefined) {
    updatePayload.notas_admin = sanitizeText(notas_admin);
  }

  const { error } = await supabase
    .from('contactos_web')
    .update(updatePayload)
    .eq('id_contacto', id_contacto);

  if (error) {
    console.error('Error al actualizar estado de contacto web:', error);
    return { error: 'No se pudo actualizar el estado.' };
  }

  revalidatePath('/admin/crm');
  return { success: true };
}

// Convertir un contacto web directamente a Socio en el Directorio
export async function convertirContactoASocio(id_contacto: number) {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) {
    return { error: 'No autorizado.' };
  }

  const supabase = await createClient();

  // 1. Obtener datos del contacto
  const { data: contacto, error: errContacto } = await supabase
    .from('contactos_web')
    .select('*')
    .eq('id_contacto', id_contacto)
    .single();

  if (errContacto || !contacto) {
    return { error: 'No se encontró el contacto web.' };
  }

  // 2. Verificar si ya existe en clientes
  const { data: clienteExistente } = await supabase
    .from('clientes')
    .select('id_cliente')
    .eq('dni', contacto.dni)
    .single();

  if (!clienteExistente) {
    // 3. Crear cliente
    // Separar nombre si viene junto
    const partes = contacto.nombre.trim().split(' ');
    const nombre = partes[0] || contacto.nombre;
    const apellido = partes.slice(1).join(' ') || null;

    const { error: errInsert } = await supabase.from('clientes').insert({
      dni: contacto.dni,
      nombre,
      apellido,
      telefono: contacto.celular,
      email: contacto.email,
      observaciones: `Registrado desde Contacto Web (Motivo: ${contacto.motivo})`,
      estado: 'ACTIVO'
    });

    if (errInsert) {
      console.error('Error al crear cliente desde contacto:', errInsert);
      return { error: 'Error al registrar socio en el directorio.' };
    }
  }

  // 4. Marcar contacto como CONVERTIDO
  await supabase
    .from('contactos_web')
    .update({ estado: 'CONVERTIDO' })
    .eq('id_contacto', id_contacto);

  revalidatePath('/admin/crm');
  revalidatePath('/admin/recepcion');
  return { success: true };
}

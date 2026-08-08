'use server';

import { createClient } from '@/utils/supabase/server';
import { getSesionActual } from '@/app/actions/auth';
import { MembresiaCliente } from '@/types/gym.types';

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

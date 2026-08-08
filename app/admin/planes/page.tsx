import React from 'react';
import { getSesionActual } from '@/app/actions/auth';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import PlanesClient from './components/PlanesClient';
import { TipoMembresia } from '@/types/gym.types';

export default async function PlanesPage() {
  const user = await getSesionActual();
  if (!user) {
    redirect('/login');
  }

  // Verificar acceso a Planes
  const tieneAcceso = user.usuario === 'admin' || user.modulos?.includes('Planes') || user.modulos?.includes('Finanzas');
  if (!tieneAcceso) {
    redirect('/admin');
  }

  const supabase = await createClient();

  // Obtener todos los planes (incluyendo inactivos para gestión total)
  const { data: planes, error } = await supabase
    .from('tipos_membresia')
    .select('*')
    .order('precio', { ascending: true });

  if (error) {
    console.error('Error al obtener planes:', error);
  }

  return (
    <PlanesClient initialPlanes={(planes || []) as TipoMembresia[]} />
  );
}

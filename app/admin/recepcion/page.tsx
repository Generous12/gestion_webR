import React from 'react';
import { getSesionActual } from '@/app/actions/auth';
import { redirect } from 'next/navigation';
import RecepcionClient from './components/RecepcionClient';
import { obtenerTiposMembresia } from '@/app/actions/membresias';

export default async function RecepcionPage() {
  const user = await getSesionActual();
  if (!user) {
    redirect('/login');
  }

  // Verificar que tenga el módulo de Recepcion o sea admin
  const tieneAcceso = user.usuario === 'admin' || user.modulos?.includes('Recepcion');
  if (!tieneAcceso) {
    redirect('/admin');
  }

  const planes = await obtenerTiposMembresia();

  return (
    <RecepcionClient planes={planes} user={user} />
  );
}

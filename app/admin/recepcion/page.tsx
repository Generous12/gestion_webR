import React from 'react';
import { getSesionActual } from '@/app/actions/auth';
import { redirect } from 'next/navigation';
import RecepcionClient from './components/RecepcionClient';
import { obtenerTiposMembresia } from '@/app/actions/membresias';
import { obtenerCajaActiva } from '@/app/actions/caja';

export default async function RecepcionPage() {
  const user = await getSesionActual();
  if (!user) {
    redirect('/login');
  }

  // Verificar que tenga el módulo de Recepcion o sea admin
  const esAdmin = user.usuario === 'admin' || user.roles?.includes('Super Admin') || user.roles?.includes('Administrador') || user.roles?.includes('Admin');
  const tieneAcceso = esAdmin || user.modulos?.includes('Recepcion') || user.permisos?.includes('Recepcion');
  if (!tieneAcceso) {
    redirect('/admin');
  }

  const [planes, cajaActiva] = await Promise.all([
    obtenerTiposMembresia(),
    obtenerCajaActiva()
  ]);

  return (
    <RecepcionClient planes={planes} user={user} cajaActiva={cajaActiva} />
  );
}

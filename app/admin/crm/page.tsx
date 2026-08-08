import React from 'react';
import { getSesionActual } from '@/app/actions/auth';
import { redirect } from 'next/navigation';
import { obtenerClientesPorVencer } from '@/app/actions/crm';
import CrmClient from './components/CrmClient';

export default async function CrmPage() {
  const user = await getSesionActual();
  if (!user) {
    redirect('/login');
  }

  // Verificar acceso a CRM
  const tieneAcceso = user.usuario === 'admin' || user.modulos?.includes('CRM');
  if (!tieneAcceso) {
    redirect('/admin');
  }

  // Obtener membresías vencidas y por vencer en los próximos 15 días
  const membresias = await obtenerClientesPorVencer(15);

  return (
    <CrmClient membresias={membresias} />
  );
}

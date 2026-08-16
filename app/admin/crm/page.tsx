import React from 'react';
import { getSesionActual } from '@/app/actions/auth';
import { redirect } from 'next/navigation';
import { obtenerClientesPorVencer, obtenerContactosWeb } from '@/app/actions/crm';
import CrmClient from './components/CrmClient';

export default async function CrmPage() {
  const user = await getSesionActual();
  if (!user) {
    redirect('/login');
  }

  // Verificar acceso a CRM
  const esAdmin = user.usuario === 'admin' || user.roles?.includes('Super Admin') || user.roles?.includes('Administrador') || user.roles?.includes('Admin');
  const tieneAcceso = esAdmin || user.modulos?.includes('CRM') || user.permisos?.includes('CRM');
  if (!tieneAcceso) {
    redirect('/admin');
  }

  // Obtener en paralelo membresías vencidas/por vencer y prospectos web
  const [membresias, contactosWeb] = await Promise.all([
    obtenerClientesPorVencer(15),
    obtenerContactosWeb()
  ]);

  return (
    <CrmClient
      membresias={membresias}
      initialContactosWeb={contactosWeb}
    />
  );
}

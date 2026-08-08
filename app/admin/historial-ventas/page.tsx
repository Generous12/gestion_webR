import React from 'react';
import { redirect } from 'next/navigation';
import { getSesionActual } from '@/app/actions/auth';
import { obtenerVentasReportePorDia } from '@/app/actions/ventas_productos';
import HistorialVentasClient from './components/HistorialVentasClient';

export default async function HistorialVentasPage() {
  const user = await getSesionActual();
  if (!user) {
    redirect('/login');
  }

  // Validar permisos de acceso estrictos
  const esAdmin = user.usuario === 'admin' || user.roles?.includes('Super Admin') || user.roles?.includes('Administrador') || user.roles?.includes('Admin');
  const tienePermiso = user.modulos?.includes('HistorialVentas') || user.permisos?.includes('HistorialVentas');

  if (!esAdmin && !tienePermiso) {
    redirect('/admin');
  }

  const hoyStr = new Date().toISOString().split('T')[0];
  const initialVentas = await obtenerVentasReportePorDia(hoyStr);

  return (
    <HistorialVentasClient
      initialVentas={initialVentas}
      initialFecha={hoyStr}
    />
  );
}

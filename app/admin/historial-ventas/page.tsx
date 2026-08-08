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

  // Validar permisos de acceso: Administrador, Caja y Recepción
  const esAdmin = user.usuario === 'admin' || user.roles?.includes('Admin') || user.roles?.includes('Administrador');
  const esCaja = user.modulos?.includes('Caja') || user.roles?.includes('Cajero') || user.roles?.includes('Caja');
  const esRecepcion = user.modulos?.includes('Recepcion') || user.modulos?.includes('Recepción') || user.roles?.includes('Recepcionista') || user.roles?.includes('Recepcion');
  const tieneModulo = user.modulos?.includes('HistorialVentas') || user.modulos?.includes('Ventas');

  if (!esAdmin && !esCaja && !esRecepcion && !tieneModulo) {
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

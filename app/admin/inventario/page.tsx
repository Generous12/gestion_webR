import React from 'react';
import { getSesionActual } from '@/app/actions/auth';
import { redirect } from 'next/navigation';
import { obtenerProductos } from '@/app/actions/productos';
import InventarioClient from './components/InventarioClient';

export default async function InventarioPage() {
  const user = await getSesionActual();
  if (!user) {
    redirect('/login');
  }

  // Verificar permisos: Administrador o rol con acceso a Inventario
  const tieneAcceso = user.usuario === 'admin' || user.modulos?.includes('Inventario') || user.modulos?.includes('Planes'); // Permitir Planes como fallback temporal
  if (!tieneAcceso) {
    redirect('/admin');
  }

  const productos = await obtenerProductos();

  return (
    <InventarioClient productos={productos} user={user} />
  );
}

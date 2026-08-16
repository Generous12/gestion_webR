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
  const esAdmin = user.usuario === 'admin' || user.roles?.includes('Super Admin') || user.roles?.includes('Administrador') || user.roles?.includes('Admin');
  const tieneAcceso = esAdmin || user.modulos?.includes('Inventario') || user.modulos?.includes('Planes') || user.permisos?.includes('Inventario') || user.permisos?.includes('Planes');
  if (!tieneAcceso) {
    redirect('/admin');
  }

  const productos = await obtenerProductos();

  return (
    <InventarioClient productos={productos} user={user} />
  );
}

import React from 'react';
import { createClient } from '@/utils/supabase/server';
import RolesLayout from './components/RolesLayout';
import { getSesionActual } from '@/app/actions/auth';
import { redirect } from 'next/navigation';

export default async function RolesPage() {
  const user = await getSesionActual();
  if (!user) {
    redirect('/login');
  }

  const esAdmin = user.usuario === 'admin' || user.roles?.includes('Super Admin') || user.roles?.includes('Administrador') || user.roles?.includes('Admin');
  const tienePermiso = user.modulos?.includes('RolesPermisos') || user.modulos?.includes('Roles') || user.permisos?.includes('RolesPermisos') || user.permisos?.includes('Roles');

  if (!esAdmin && !tienePermiso) {
    redirect('/admin');
  }

  const supabase = await createClient();

  // Obtener roles, permisos y rolesPermisos en paralelo
  const [{ data: roles }, { data: permisos }, { data: rolesPermisos }] = await Promise.all([
    supabase
      .from('roles')
      .select('*')
      .order('id_rol', { ascending: true }),
    supabase
      .from('permisos')
      .select('*')
      .order('modulo', { ascending: true })
      .order('id_permiso', { ascending: true }),
    supabase
      .from('roles_permisos')
      .select('*')
  ]);

  return (
    <RolesLayout 
      roles={roles || []} 
      permisos={permisos || []} 
      rolesPermisos={rolesPermisos || []} 
    />
  );
}

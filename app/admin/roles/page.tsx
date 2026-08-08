import React from 'react';
import { createClient } from '@/utils/supabase/server';
import RolesLayout from './components/RolesLayout';
import { getSesionActual } from '@/app/actions/auth';
import { redirect } from 'next/navigation';

export default async function RolesPage() {
  const user = await getSesionActual();
  if (!user || (user.usuario !== 'admin' && !user.modulos?.includes('RolesPermisos'))) {
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

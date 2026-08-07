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

  // 1. Obtener todos los roles
  const { data: roles } = await supabase
    .from('roles')
    .select('*')
    .order('id_rol', { ascending: true });

  // 2. Obtener todos los permisos posibles
  const { data: permisos } = await supabase
    .from('permisos')
    .select('*')
    .order('modulo', { ascending: true })
    .order('id_permiso', { ascending: true });

  // 3. Obtener todas las relaciones activas de roles_permisos
  const { data: rolesPermisos } = await supabase
    .from('roles_permisos')
    .select('*');

  return (
    <RolesLayout 
      roles={roles || []} 
      permisos={permisos || []} 
      rolesPermisos={rolesPermisos || []} 
    />
  );
}

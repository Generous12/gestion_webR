import React from 'react';
import { createClient } from '@/utils/supabase/server';
import EquipoLayout from './components/EquipoLayout';
import { getSesionActual } from '@/app/actions/auth';
import { redirect } from 'next/navigation';

export default async function EquipoPage() {
  const user = await getSesionActual();
  if (!user || (user.usuario !== 'admin' && !user.modulos?.includes('EquipoUsuarios'))) {
    redirect('/admin');
  }

  const supabase = await createClient();

  // 0. Determinar si el usuario actual es Administrador
  let userIsAdmin = user.usuario === 'admin';
  if (!userIsAdmin && user.id_miembro) {
    const { data: userRoles } = await supabase
      .from('equipo_roles')
      .select('roles(nombre)')
      .eq('id_miembro', user.id_miembro);
    
    userIsAdmin = userRoles?.some(r => {
      const rObj = Array.isArray(r.roles) ? r.roles[0] : r.roles;
      return rObj?.nombre === 'Administrador';
    }) ?? false;
  }

  // 1. Fetch en paralelo de miembros, roles y cajas activas
  const [{ data: miembros }, { data: roles }, { data: cajasAbiertas }] = await Promise.all([
    supabase
      .from('equipo')
      .select('*, equipo_roles(id_rol, roles(nombre)), usuarios_sistema(id_usuario, usuario, estado)')
      .order('fecha_creacion', { ascending: false }),
    supabase
      .from('roles')
      .select('*'),
    supabase
      .from('cajas')
      .select('id_caja, id_usuario, monto_inicial, fecha_apertura')
      .eq('estado', 'ABIERTA')
  ]);

  // Filtrar para que nadie pueda ver al Administrador excepto él mismo
  const filteredMiembros = (miembros || []).filter(miembro => {
    const esMiembroAdmin = miembro.usuarios_sistema?.usuario === 'admin' || miembro.equipo_roles?.some((r: { roles: { nombre: string } | { nombre: string }[] | null }) => {
      const rObj = Array.isArray(r.roles) ? r.roles[0] : r.roles;
      return rObj?.nombre === 'Administrador';
    });

    if (!esMiembroAdmin) {
      return true; // No es admin, visible para todos los que tienen acceso al módulo
    }

    // Si es administrador, solo puede verlo el mismo usuario logueado
    const esElMismoUsuarioLogueado = user.id_miembro === miembro.id_miembro || (user.usuario === 'admin' && miembro.usuarios_sistema?.usuario === 'admin');
    return esElMismoUsuarioLogueado;
  });

  return (
    <EquipoLayout 
      initialMembers={filteredMiembros} 
      roles={roles || []} 
      isAdmin={userIsAdmin}
      cajasAbiertas={cajasAbiertas || []}
    />
  );
}

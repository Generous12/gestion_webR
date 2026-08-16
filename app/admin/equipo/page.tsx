import React from 'react';
import { createClient } from '@/utils/supabase/server';
import EquipoLayout from './components/EquipoLayout';
import { getSesionActual } from '@/app/actions/auth';
import { redirect } from 'next/navigation';

export default async function EquipoPage() {
  const user = await getSesionActual();
  if (!user) {
    redirect('/login');
  }

  const esAdmin = user.usuario === 'admin' || user.roles?.includes('Super Admin') || user.roles?.includes('Administrador') || user.roles?.includes('Admin');
  const tienePermiso = user.modulos?.includes('EquipoUsuarios') || user.modulos?.includes('Equipo') || user.permisos?.includes('EquipoUsuarios') || user.permisos?.includes('Equipo');

  if (!esAdmin && !tienePermiso) {
    redirect('/admin');
  }

  const supabase = await createClient();

  // 0. Determinar si el usuario actual es Administrador
  let userIsAdmin = esAdmin;
  if (!userIsAdmin && user.id_miembro) {
    const { data: userRoles } = await supabase
      .from('equipo_roles')
      .select('roles(nombre)')
      .eq('id_miembro', user.id_miembro);
    
    userIsAdmin = userRoles?.some(r => {
      const rObj = Array.isArray(r.roles) ? r.roles[0] : r.roles;
      return rObj?.nombre === 'Administrador' || rObj?.nombre === 'Super Admin';
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

  // Filtrar: Los administradores ven a todo el equipo.
  // Los usuarios con permisos limitados solo ven miembros no-administradores o a sí mismos.
  const filteredMiembros = (miembros || []).filter(miembro => {
    if (userIsAdmin) {
      return true;
    }

    const esMiembroAdmin = miembro.usuarios_sistema?.usuario === 'admin' || miembro.equipo_roles?.some((r: { roles: { nombre: string } | { nombre: string }[] | null }) => {
      const rObj = Array.isArray(r.roles) ? r.roles[0] : r.roles;
      return rObj?.nombre === 'Administrador' || rObj?.nombre === 'Super Admin';
    });

    if (!esMiembroAdmin) {
      return true; // No es admin, visible para colaboradores con permiso
    }

    // Si es administrador, un usuario no-admin solo puede verse a sí mismo si fuera el caso
    const esElMismoUsuarioLogueado = user.id_miembro === miembro.id_miembro;
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

'use client';

import React, { useState } from 'react';
import AsignacionPermisos from './AsignacionPermisos';
import { Rol, Permiso, RolPermiso } from '@/types/database.types';

interface RolesLayoutProps {
  roles: Rol[];
  permisos: Permiso[];
  rolesPermisos: RolPermiso[];
}

export default function RolesLayout({ roles, permisos, rolesPermisos }: RolesLayoutProps) {
  // Default to selecting the first non-system or first role
  const [selectedRolId, setSelectedRolId] = useState<number | null>(() => roles[0]?.id_rol ?? null);

  const selectedRol = roles.find(r => r.id_rol === selectedRolId);

  const [mounted, setMounted] = useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div suppressHydrationWarning className="space-y-6 animate-pulse p-2 sm:p-4">
        <div suppressHydrationWarning className="h-32 rounded-2xl bg-zinc-200/60 dark:bg-zinc-850" />
        <div suppressHydrationWarning className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div suppressHydrationWarning className="h-[450px] rounded-2xl bg-zinc-200/60 dark:bg-zinc-850" />
          <div suppressHydrationWarning className="lg:col-span-2 h-[450px] rounded-2xl bg-zinc-200/60 dark:bg-zinc-850" />
        </div>
      </div>
    );
  }

  return (
    <div suppressHydrationWarning className="space-y-6">
      {/* Header Panel */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 p-6 shadow-md border border-zinc-200/10 sm:p-8 dark:border-zinc-800">
        <div className="absolute right-0 top-0 -mr-20 -mt-20 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Roles y Permisos (RBAC)</h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Control de privilegios y módulos de acceso asignados a cada puesto del gimnasio.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna de Roles */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-850 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-zinc-150 dark:border-zinc-850 bg-zinc-50/60 dark:bg-zinc-850/40 flex justify-between items-center">
              <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">
                Roles de Colaboradores
              </h2>
              <span className="text-[10px] font-bold text-zinc-400">
                {roles.length} roles
              </span>
            </div>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-850">
              {roles.map(rol => {
                const countPermisos = rolesPermisos.filter(rp => rp.id_rol === rol.id_rol).length;
                const isSelected = selectedRolId === rol.id_rol;

                return (
                  <li
                    key={rol.id_rol}
                    className={`p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-950/30 border-l-4 border-blue-600'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-850/50 border-l-4 border-transparent'
                    }`}
                    onClick={() => setSelectedRolId(rol.id_rol)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-xs ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                            {rol.nombre}
                          </span>
                          {rol.es_sistema ? (
                            <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 text-[9px] font-bold">
                              Sistema
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 px-2 py-0.5 text-[9px] font-semibold">
                              {countPermisos} módulos
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed line-clamp-2">
                          {rol.descripcion || 'Sin descripción detallada.'}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Columna de Permisos */}
        <div className="lg:col-span-2">
          {selectedRolId !== null && selectedRol ? (
            <AsignacionPermisos
              key={selectedRolId}
              rolId={selectedRolId}
              esSistema={selectedRol.es_sistema}
              permisos={permisos}
              rolesPermisos={rolesPermisos}
            />
          ) : (
            <div className="bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-850 rounded-2xl shadow-xs h-full min-h-[300px] flex flex-col items-center justify-center p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Selecciona un Rol</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
                Haz clic en un rol de la lista izquierda para visualizar y configurar sus permisos agrupados.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

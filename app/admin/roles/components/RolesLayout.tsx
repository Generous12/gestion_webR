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
  const [selectedRolId, setSelectedRolId] = useState<number | null>(null);

  const selectedRol = roles.find(r => r.id_rol === selectedRolId);

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Roles y Permisos</h1>
          <p className="mt-1 text-sm text-slate-500">
            Administra los roles del sistema y configura sus permisos de acceso a los módulos.
          </p>
        </div>
      </div>



      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna de Roles */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-sm font-semibold text-slate-900">Roles Existentes</h2>
            </div>
            <ul className="divide-y divide-slate-100">
              {roles.map(rol => (
                <li
                  key={rol.id_rol}
                  className={`p-4 cursor-pointer hover:bg-blue-50/50 transition-colors ${selectedRolId === rol.id_rol ? 'bg-blue-50 border-l-4 border-blue-600' : 'border-l-4 border-transparent'}`}
                  onClick={() => setSelectedRolId(rol.id_rol)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium text-slate-900 flex items-center gap-2">
                        {rol.nombre}
                        {rol.es_sistema && (
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">Sistema</span>
                        )}
                      </span>
                      <p className="text-xs text-slate-500 mt-1">{rol.descripcion}</p>
                    </div>
                  </div>
                </li>
              ))}
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
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm h-full min-h-[300px] flex flex-col items-center justify-center p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h3 className="mt-2 text-sm font-semibold text-slate-900">Selecciona un Rol</h3>
              <p className="mt-1 text-sm text-slate-500">Haz clic en un rol de la lista izquierda para configurar sus permisos.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

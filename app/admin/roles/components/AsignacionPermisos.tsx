'use client';

import React, { useState } from 'react';
import { guardarPermisosRol } from '@/app/actions/roles';
import { RolPermiso, Permiso } from '@/types/database.types';

interface AsignacionPermisosProps {
  rolId: number;
  esSistema?: boolean;
  permisos: Permiso[];
  rolesPermisos: RolPermiso[]; // todas las relaciones id_rol -> id_permiso
}

interface PermGroup {
  title: string;
  roleScope: string;
  description: string;
  colorClass: string;
  modules: string[];
}

const SIDEBAR_GROUPS: PermGroup[] = [
  {
    title: 'Punto de Venta y Caja',
    roleScope: 'Rol: Cajero / Mostrador',
    description: 'Arqueo de caja diaria, punto de cobro, auditoría de vouchers e inventario de tienda.',
    colorClass: 'text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20',
    modules: ['Caja', 'Ventas', 'HistorialVentas', 'Inventario']
  },
  {
    title: 'Recepción y Atención al Socio',
    roleScope: 'Rol: Recepcionista / Entrenador',
    description: 'Check-in y validación de acceso por DNI, directorio CRM de clientes y catálogo de membresías.',
    colorClass: 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20',
    modules: ['Recepcion', 'CRM', 'Planes']
  },
  {
    title: 'Dirección, Finanzas y Reportes',
    roleScope: 'Rol: Administrador / Dueño',
    description: 'Dashboard principal con KPIs en vivo, balances financieros y control de gastos de sede.',
    colorClass: 'text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/40 bg-purple-50/50 dark:bg-purple-950/20',
    modules: ['Dashboard', 'Finanzas']
  },
  {
    title: 'Seguridad y Personal',
    roleScope: 'Rol: Super Admin / TI',
    description: 'Gestión de colaboradores, asignación de privilegios RBAC y auditoría de eventos.',
    colorClass: 'text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20',
    modules: ['EquipoUsuarios', 'RolesPermisos', 'LogsSeguridad']
  }
];

export default function AsignacionPermisos({ rolId, esSistema = false, permisos, rolesPermisos }: AsignacionPermisosProps) {
  // Inicializar los checkboxes con los permisos activos del rol actual
  const [checkedIds, setCheckedIds] = useState<number[]>(() =>
    rolesPermisos
      .filter((rp: RolPermiso) => rp.id_rol === rolId)
      .map((rp: RolPermiso) => rp.id_permiso)
  );
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error', texto: string } | null>(null);

  const handleCheckboxChange = (permisoId: number, checked: boolean) => {
    if (checked) {
      setCheckedIds(prev => [...prev, permisoId]);
    } else {
      setCheckedIds(prev => prev.filter(id => id !== permisoId));
    }
  };

  const handleToggleGroup = (groupPermisos: Permiso[]) => {
    const groupIds = groupPermisos.map(p => p.id_permiso);
    const allChecked = groupIds.every(id => checkedIds.includes(id));
    if (allChecked) {
      setCheckedIds(prev => prev.filter(id => !groupIds.includes(id)));
    } else {
      setCheckedIds(prev => Array.from(new Set([...prev, ...groupIds])));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMensaje(null);

    try {
      const response = await guardarPermisosRol(rolId, checkedIds);

      if (response.error) {
        setMensaje({ tipo: 'error', texto: response.error });
      } else {
        setMensaje({ tipo: 'exito', texto: 'Permisos del rol actualizados y sincronizados correctamente.' });
      }
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: 'error', texto: 'Error de red al guardar los cambios.' });
    } finally {
      setLoading(false);
    }
  };

  // Mapear los permisos a los grupos del sidebar
  const assignedModuleCodes = new Set<string>();

  return (
    <div className="bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-850 rounded-2xl shadow-xs overflow-hidden space-y-0">
      {/* Header bar */}
      <div className="p-5 border-b border-zinc-150 dark:border-zinc-850 bg-zinc-50/60 dark:bg-zinc-850/40 flex flex-wrap gap-4 items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Configuración de Accesos del Rol</h2>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              {checkedIds.length} de {permisos.length} Módulos Activos
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Los permisos se encuentran agrupados exactamente como aparecen en el menú lateral izquierdo.
          </p>
        </div>
        <button 
          onClick={handleSave}
          disabled={loading || esSistema}
          className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl disabled:opacity-50 transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {loading ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      {/* Action Messages */}
      {esSistema && (
        <div className="p-4 border-b border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 text-amber-850 dark:text-amber-300 text-xs font-semibold flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Este rol es protegido del sistema (Super Administrador) y mantiene acceso maestro predeterminado.
        </div>
      )}

      {mensaje && (
        <div className={`p-4 border-b text-xs font-semibold ${
          mensaje.tipo === 'exito' 
            ? 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-300' 
            : 'bg-rose-50 border-rose-100 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/40 dark:text-rose-300'
        }`}>
          {mensaje.texto}
        </div>
      )}
      
      {/* Grid containing Sidebar Groups */}
      <div className="p-6 space-y-6">
        {SIDEBAR_GROUPS.map((group, gIdx) => {
          const groupPermisos = permisos.filter(p => {
            const mod = p.modulo || p.codigo;
            return group.modules.includes(mod);
          });

          groupPermisos.forEach(p => assignedModuleCodes.add(p.codigo));
          const allGroupChecked = groupPermisos.length > 0 && groupPermisos.every(p => checkedIds.includes(p.id_permiso));
          const someGroupChecked = groupPermisos.some(p => checkedIds.includes(p.id_permiso));

          return (
            <div 
              key={group.title}
              className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-zinc-50/30 dark:bg-zinc-950/30 shadow-2xs"
            >
              {/* Group Header */}
              <div className="p-4 border-b border-zinc-150 dark:border-zinc-850 bg-white dark:bg-zinc-900 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                    {gIdx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                        {group.title}
                      </h3>
                      <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                        ({group.roleScope})
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {group.description}
                    </p>
                  </div>
                </div>

                {!esSistema && groupPermisos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleToggleGroup(groupPermisos)}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors cursor-pointer px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100"
                  >
                    {allGroupChecked ? 'Desmarcar Módulo' : 'Marcar Todo'}
                  </button>
                )}
              </div>

              {/* Checkboxes List */}
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {groupPermisos.map((permiso: Permiso) => {
                  const isChecked = checkedIds.includes(permiso.id_permiso);

                  return (
                    <label
                      key={permiso.id_permiso}
                      className={`relative flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                        isChecked
                          ? 'border-blue-500/50 bg-blue-50/40 dark:bg-blue-950/20 dark:border-blue-800/50 shadow-2xs'
                          : 'border-zinc-200/70 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-750'
                      }`}
                    >
                      <input
                        id={`permiso-${permiso.id_permiso}`}
                        type="checkbox"
                        disabled={esSistema}
                        checked={isChecked}
                        onChange={(e) => handleCheckboxChange(permiso.id_permiso, e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                      />
                      <div className="min-w-0 flex-1 text-xs">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                            {permiso.codigo}
                          </span>
                          <span className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase">
                            {permiso.modulo || 'MODULO'}
                          </span>
                        </div>
                        <p className="text-zinc-500 dark:text-zinc-400 text-[10px] mt-1 leading-relaxed">
                          {permiso.descripcion}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Otros permisos no clasificados si existieran */}
        {permisos.filter(p => !assignedModuleCodes.has(p.codigo)).length > 0 && (
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-zinc-50/30 dark:bg-zinc-950/30 shadow-2xs">
            <div className="p-4 border-b border-zinc-150 dark:border-zinc-850 bg-white dark:bg-zinc-900">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                Otros Permisos Adicionales
              </h3>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {permisos.filter(p => !assignedModuleCodes.has(p.codigo)).map((permiso: Permiso) => (
                <label
                  key={permiso.id_permiso}
                  className="relative flex items-start gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    disabled={esSistema}
                    checked={checkedIds.includes(permiso.id_permiso)}
                    onChange={(e) => handleCheckboxChange(permiso.id_permiso, e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-600 cursor-pointer disabled:opacity-50"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">{permiso.codigo}</span>
                    <p className="text-zinc-500 dark:text-zinc-400 text-[10px] mt-0.5">{permiso.descripcion}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

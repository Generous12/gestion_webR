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

  const handleSave = async () => {
    setLoading(true);
    setMensaje(null);

    try {
      const response = await guardarPermisosRol(rolId, checkedIds);

      if (response.error) {
        setMensaje({ tipo: 'error', texto: response.error });
      } else {
        setMensaje({ tipo: 'exito', texto: 'Permisos actualizados correctamente.' });
      }
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: 'error', texto: 'Error de red al guardar los cambios.' });
    } finally {
      setLoading(false);
    }
  };

  // Agrupar permisos por módulo para mostrarlos ordenados
  const modulos = permisos.reduce<Record<string, Permiso[]>>((acc, permiso) => {
    const mod = permiso.modulo || 'OTROS';
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(permiso);
    return acc;
  }, {});

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
      {/* Header bar */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap gap-4 items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Configuración de Accesos</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Selecciona los permisos que deseas habilitar o deshabilitar para este rol.
          </p>
        </div>
        <button 
          onClick={handleSave}
          disabled={loading || esSistema}
          className="text-xs font-semibold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      {/* Action Messages */}
      {esSistema && (
        <div className="p-4 border-b bg-amber-50 border-amber-100 text-amber-800 text-xs font-semibold flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Este es un rol del sistema y no puede ser modificado.
        </div>
      )}

      {mensaje && (
        <div className={`p-4 border-b text-xs font-semibold ${
          mensaje.tipo === 'exito' 
            ? 'bg-green-50 border-green-100 text-green-700' 
            : 'bg-red-50 border-red-100 text-red-700'
        }`}>
          {mensaje.texto}
        </div>
      )}
      
      {/* Grid containing Modules */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.keys(modulos).map(modName => (
            <div key={modName} className="border border-slate-100 rounded-xl p-5 bg-slate-50/20 hover:border-slate-200 transition-colors">
              <h3 className="text-xs font-bold text-blue-600 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2 uppercase tracking-wide">
                <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                {modName}
              </h3>
              <div className="space-y-4">
                {modulos[modName].map((permiso: Permiso) => (
                  <div key={permiso.id_permiso} className="relative flex items-start select-none">
                    <div className="flex h-5 items-center">
                      <input
                        id={`permiso-${permiso.id_permiso}`}
                        name={`permiso-${permiso.id_permiso}`}
                        type="checkbox"
                        disabled={esSistema}
                        checked={checkedIds.includes(permiso.id_permiso)}
                        onChange={(e) => handleCheckboxChange(permiso.id_permiso, e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div className="ml-3 text-xs leading-5">
                      <label htmlFor={`permiso-${permiso.id_permiso}`} className="font-semibold text-slate-800 cursor-pointer">
                        {permiso.codigo}
                      </label>
                      <p className="text-slate-500 text-[10px] mt-0.5 leading-relaxed">{permiso.descripcion}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

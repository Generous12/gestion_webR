'use client';

import React, { useState } from 'react';
import { TipoMembresia } from '@/types/gym.types';
import { useRouter } from 'next/navigation';
import { useModalAlert } from '@/context/ModalAlertContext';

interface PlanesClientProps {
  initialPlanes: TipoMembresia[];
}

export default function PlanesClient({ initialPlanes }: PlanesClientProps) {
  const router = useRouter();
  const { showConfirm, showToast } = useModalAlert();

  // Estados del formulario
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [duracionDias, setDuracionDias] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [estado, setEstado] = useState<'ACTIVA' | 'INACTIVA'>('ACTIVA');

  // Estados de carga e informes
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Inicializar edición
  const handleEditInit = (plan: TipoMembresia) => {
    setEditingPlanId(plan.id_tipo);
    setNombre(plan.nombre);
    setPrecio(String(plan.precio));
    setDuracionDias(String(plan.duracion_dias));
    setDescripcion(plan.descripcion || '');
    setEstado(plan.estado as 'ACTIVA' | 'INACTIVA');
    setFormError(null);
    setFormSuccess(null);
  };

  // Limpiar / Cancelar edición o borrador
  const handleClearForm = () => {
    setEditingPlanId(null);
    setNombre('');
    setPrecio('');
    setDuracionDias('');
    setDescripcion('');
    setEstado('ACTIVA');
    setFormError(null);
    setFormSuccess(null);
  };

  // Guardar Plan mediante el API POST/PUT /api/membresias/tipos
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormError(null);
    setFormSuccess(null);

    const priceVal = parseFloat(precio);
    const durationVal = parseInt(duracionDias);

    if (!nombre || isNaN(priceVal) || isNaN(durationVal)) {
      setFormError('Todos los campos obligatorios (*) deben ser completados con valores válidos.');
      setLoading(false);
      return;
    }

    try {
      const isEditing = editingPlanId !== null;
      const url = '/api/membresias/tipos';
      const method = isEditing ? 'PUT' : 'POST';
      
      const payload = isEditing ? {
        id_tipo: editingPlanId,
        nombre,
        precio: priceVal,
        duracion_dias: durationVal,
        descripcion: descripcion || null,
        estado
      } : {
        nombre,
        precio: priceVal,
        duracion_dias: durationVal,
        descripcion: descripcion || null
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        setFormError(result.error || 'Ocurrió un error al procesar el plan.');
        showToast(result.error || 'Error al guardar el plan de membresía', 'danger');
      } else {
        const toastMsg = isEditing ? 'Plan de membresía actualizado con éxito' : 'Plan de membresía guardado con éxito';
        setFormSuccess(isEditing ? 'Plan de membresía actualizado con éxito.' : 'Plan de membresía creado y guardado con éxito.');
        showToast(toastMsg, 'success');
        handleClearForm();
        router.refresh();
      }
    } catch (err) {
      setFormError('Error de red al intentar conectar con el servidor.');
      showToast('Error de red al conectar con el servidor', 'danger');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Eliminar o inactivar plan de membresía
  const handleDelete = async (idTipo: number, planNombre: string) => {
    const ok = await showConfirm({
      title: 'Eliminar Plan de Membresía',
      message: `¿Estás seguro de que deseas eliminar el plan de membresía "${planNombre}"?`,
      confirmText: 'Sí, Eliminar Plan',
      cancelText: 'Cancelar',
      type: 'danger'
    });

    if (!ok) return;

    setLoading(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      const response = await fetch(`/api/membresias/tipos?id=${idTipo}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (!response.ok) {
        setFormError(result.error || 'Ocurrió un error al eliminar el plan.');
      } else {
        if (result.softDeleted) {
          setFormSuccess(result.message);
          showToast(result.message, 'warning');
        } else {
          setFormSuccess('El plan de membresía fue eliminado físicamente de la base de datos.');
          showToast('Plan de membresía eliminado correctamente.', 'success');
        }

        // Si se estaba editando el plan eliminado, limpiamos el formulario
        if (editingPlanId === idTipo) {
          handleClearForm();
        }

        router.refresh();
      }
    } catch (err) {
      setFormError('Error de red al intentar conectar con el servidor.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Cambiar estado Activa / Inactiva con un clic
  const handleTogglePlanStatus = async (plan: TipoMembresia) => {
    const nuevoEstado = plan.estado === 'ACTIVA' ? 'INACTIVA' : 'ACTIVA';
    setLoading(true);
    try {
      const response = await fetch('/api/membresias/tipos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_tipo: plan.id_tipo,
          nombre: plan.nombre,
          precio: plan.precio,
          duracion_dias: plan.duracion_dias,
          descripcion: plan.descripcion,
          estado: nuevoEstado
        })
      });
      const result = await response.json();
      if (!response.ok) {
        showToast(result.error || 'Error al cambiar estado', 'danger');
      } else {
        showToast(`Membresía ${nuevoEstado === 'ACTIVA' ? 'Activada (Visible en la web)' : 'Desactivada (Oculta de la web)'}.`, 'success');
        router.refresh();
      }
    } catch {
      showToast('Error de red al actualizar membresía', 'danger');
    } finally {
      setLoading(false);
    }
  };

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
        <div className="absolute right-0 top-0 -mr-20 -mt-20 h-80 w-80 rounded-full bg-zinc-700/10 blur-3xl"></div>
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Gestión de Planes de Membresía</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Define los planes de membresía, precios y duraciones del gimnasio. Los recepcionistas seleccionarán estos planes al cobrar.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Form Card */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-xs overflow-hidden dark:bg-zinc-900 dark:border-zinc-850">
            <div className="p-5 border-b border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-zinc-850 dark:text-zinc-100">
                  {editingPlanId ? 'Editar Plan de Membresía' : 'Crear Nuevo Plan'}
                </h2>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {editingPlanId ? 'Modifica los valores y el estado de la membresía.' : 'Completa los campos para añadir un nuevo plan al catálogo.'}
                </p>
              </div>
              {editingPlanId && (
                <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                  Modo Edición
                </span>
              )}
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-250 text-emerald-700 text-xs font-semibold rounded-xl">
                  {formSuccess}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Nombre del Plan *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Plan Universitario, Trimestral VIP..."
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-850 dark:text-zinc-50 focus:outline-none placeholder-zinc-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Precio (S/) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="0.00"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-850 dark:text-zinc-50 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Duración (Días) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="30"
                    value={duracionDias}
                    onChange={(e) => setDuracionDias(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-850 dark:text-zinc-50 focus:outline-none"
                  />
                </div>
              </div>

              {editingPlanId !== null && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Estado del Plan *</label>
                  <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value as 'ACTIVA' | 'INACTIVA')}
                    className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-850 dark:text-zinc-50 focus:outline-none"
                  >
                    <option value="ACTIVA">ACTIVA (Visible en Ventas)</option>
                    <option value="INACTIVA">INACTIVA (Oculto en Ventas)</option>
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Descripción</label>
                <textarea
                  rows={3}
                  placeholder="Detalles sobre el plan y sus beneficios..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-850 dark:text-zinc-50 focus:outline-none placeholder-zinc-400"
                ></textarea>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-zinc-900 hover:bg-zinc-850 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 py-3.5 rounded-xl text-xs font-black tracking-wider transition-all cursor-pointer shadow-md"
                >
                  {editingPlanId ? 'GUARDAR CAMBIOS' : 'GUARDAR MEMBRESÍA'}
                </button>

                {(editingPlanId !== null || nombre !== '' || precio !== '' || duracionDias !== '' || descripcion !== '') && (
                  <button
                    type="button"
                    onClick={handleClearForm}
                    className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-750 py-3.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer border border-zinc-200 dark:border-zinc-700"
                  >
                    {editingPlanId ? 'CANCELAR EDICIÓN' : 'LIMPIAR BORRADOR'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Catalog List */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-xs overflow-hidden dark:bg-zinc-900 dark:border-zinc-850">
            <div className="p-5 border-b border-zinc-150 dark:border-zinc-850 bg-zinc-50/50">
              <h2 className="text-sm font-bold text-zinc-850 dark:text-zinc-100">Catálogo de Membresías</h2>
              <p className="text-[10px] text-zinc-500 mt-0.5">Catálogo de planes configurados en la base de datos del gimnasio.</p>
            </div>

            {initialPlanes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-850 text-zinc-400 font-bold border-b border-zinc-150 dark:border-zinc-800">
                      <th className="p-4 uppercase tracking-wider">Plan / Descripción</th>
                      <th className="p-4 uppercase tracking-wider text-right">Precio</th>
                      <th className="p-4 uppercase tracking-wider text-center">Duración</th>
                      <th className="p-4 uppercase tracking-wider text-center">Estado</th>
                      <th className="p-4 uppercase tracking-wider text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
                    {initialPlanes.map((plan) => (
                      <tr key={plan.id_tipo} className={`hover:bg-zinc-50/30 dark:hover:bg-zinc-850/10 ${editingPlanId === plan.id_tipo ? 'bg-amber-50/30 dark:bg-amber-500/5' : ''}`}>
                        <td className="p-4">
                          <div className="font-semibold text-zinc-800 dark:text-zinc-200">{plan.nombre}</div>
                          {plan.descripcion && (
                            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 font-medium leading-relaxed">
                              {plan.descripcion}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-right font-black text-zinc-900 dark:text-zinc-50">
                          S/ {plan.precio.toFixed(2)}
                        </td>
                        <td className="p-4 text-center font-bold text-zinc-650 dark:text-zinc-350">
                          {plan.duracion_dias} días
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleTogglePlanStatus(plan)}
                            title="Haz clic para cambiar visibilidad en la web (/unete)"
                            className={`inline-block px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase transition-colors cursor-pointer border ${
                              plan.estado === 'ACTIVA'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                            }`}
                          >
                            {plan.estado === 'ACTIVA' ? 'Visible Web' : 'Oculto Web'}
                          </button>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={() => handleEditInit(plan)}
                              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors cursor-pointer"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(plan.id_tipo, plan.nombre)}
                              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 transition-colors cursor-pointer"
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-10 text-center text-zinc-500 text-xs">
                No hay planes registrados todavía. Utiliza el formulario izquierdo para crear uno.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

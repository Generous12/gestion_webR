'use client';

import React, { useState, useEffect, useRef } from 'react';
import { buscarClientes, crearCliente, editarCliente, obtenerEstadoAccesoCliente } from '@/app/actions/clientes';
import { Cliente, TipoMembresia, MembresiaCliente } from '@/types/gym.types';
import Link from 'next/link';
import { useModalAlert } from '@/context/ModalAlertContext';

interface RecepcionClientProps {
  planes: TipoMembresia[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cajaActiva?: any;
  user: {
    usuario: string;
    roles?: string[];
    modulos?: string[];
    permisos?: string[];
  };
}

export default function RecepcionClient({ user, cajaActiva }: RecepcionClientProps) {
  const { showConfirm, showAlert, showToast } = useModalAlert();
  const [query, setQuery] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [accessState, setAccessState] = useState<{
    status: 'PERMITIDO' | 'DENEGADO' | null;
    message: string;
    detail: string;
    membresia?: MembresiaCliente | null;
  }>({ status: null, message: '', detail: '' });

  const [loading, setLoading] = useState(false);
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [revealData, setRevealData] = useState(false);

  const esAdmin = user.usuario === 'admin' || user.roles?.includes('Super Admin') || user.roles?.includes('Administrador');
  const esEntrenador = user.roles?.includes('Entrenador') && !esAdmin;
  const puedeRenovar = !esEntrenador && (esAdmin || user.modulos?.includes('Ventas') || user.roles?.includes('Recepcionista') || user.roles?.includes('Cajero'));

  const formatSensitive = (val: string | null | undefined, type: 'dni' | 'telefono') => {
    if (!val) return 'Sin registrar';
    if (revealData && esAdmin) return val;
    
    // Enmascarar con asteriscos
    if (type === 'dni') {
      if (val.length <= 4) return '****';
      return `${val.substring(0, 2)}****${val.substring(val.length - 2)}`;
    } else {
      if (val.length <= 5) return '*****';
      return `${val.substring(0, 3)}***${val.substring(val.length - 3)}`;
    }
  };

  // Modales
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Mensajes de error/éxito
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Estado para garantizar montaje limpio del lado cliente (evita hydration errors de extensiones del navegador)
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cargar lista inicial de clientes y foco automático en buscador
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
    const loadInitialClientes = async () => {
      setLoading(true);
      try {
        const data = await buscarClientes('');
        setClientes(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadInitialClientes();
  }, []);

  // Skeleton de carga seguro para hidratación perfecta
  if (!mounted) {
    return (
      <div suppressHydrationWarning className="space-y-6 animate-pulse p-2 sm:p-4">
        <div suppressHydrationWarning className="h-32 rounded-2xl bg-zinc-200/60 dark:bg-zinc-850" />
        <div suppressHydrationWarning className="h-14 rounded-2xl bg-zinc-200/60 dark:bg-zinc-850" />
        <div suppressHydrationWarning className="h-[450px] rounded-2xl bg-zinc-200/60 dark:bg-zinc-850" />
      </div>
    );
  }

  // Buscar clientes en BD
  const handleSearch = async (val: string) => {
    setQuery(val);
    setLoading(true);
    try {
      const data = await buscarClientes(val);
      setClientes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Limpiar buscador y restaurar lista completa
  const handleClearSearch = async () => {
    setQuery('');
    setLoading(true);
    try {
      const data = await buscarClientes('');
      setClientes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Seleccionar un cliente para evaluar acceso
  const handleSelectCliente = async (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setLoadingAccess(true);
    try {
      const state = await obtenerEstadoAccesoCliente(cliente.id_cliente);
      setAccessState(state as {
        status: 'PERMITIDO' | 'DENEGADO' | null;
        message: string;
        detail: string;
        membresia?: MembresiaCliente | null;
      });
    } catch (e) {
      console.error(e);
      setAccessState({
        status: 'DENEGADO',
        message: 'ERROR',
        detail: 'Ocurrió un error al verificar el acceso en el servidor.'
      });
    } finally {
      setLoadingAccess(false);
    }
  };

  // Volver a la lista de clientes (deseleccionar)
  const handleBackToDirectory = async () => {
    setSelectedCliente(null);
    setAccessState({ status: null, message: '', detail: '' });
    // Recargar clientes para reflejar cambios (por ejemplo si eliminó la membresía)
    setLoading(true);
    try {
      const data = await buscarClientes(query);
      setClientes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Crear Cliente
  const handleSubmitNew = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    const formData = new FormData(e.currentTarget);
    const res = await crearCliente(formData);
    if (res.error) {
      setFormError(res.error);
    } else {
      setFormSuccess('Cliente creado correctamente.');
      setTimeout(() => {
        setIsNewModalOpen(false);
        setFormSuccess(null);
        if (res.cliente) {
          handleSelectCliente(res.cliente);
        }
      }, 1000);
    }
  };

  // Editar Cliente
  const handleSubmitEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCliente) return;
    setFormError(null);
    setFormSuccess(null);
    const formData = new FormData(e.currentTarget);
    const res = await editarCliente(selectedCliente.id_cliente, formData);
    if (res.error) {
      setFormError(res.error);
    } else {
      setFormSuccess('Datos actualizados correctamente.');
      // Actualizar el estado del cliente seleccionado en local
      const updatedCli = { ...selectedCliente };
      formData.forEach((value, key) => {
        if (key in updatedCli) {
          (updatedCli as unknown as Record<string, unknown>)[key] = value;
        }
      });
      setSelectedCliente(updatedCli);
      setTimeout(() => {
        setIsEditModalOpen(false);
        setFormSuccess(null);
        handleSelectCliente(updatedCli);
      }, 1000);
    }
  };

  return (
    <div suppressHydrationWarning className="space-y-6">
      {/* Header Panel */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 p-6 shadow-md border border-zinc-200/10 sm:p-8 dark:border-zinc-800">
        <div className="absolute right-0 top-0 -mr-20 -mt-20 h-80 w-80 rounded-full bg-zinc-700/10 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Recepción</h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Control de acceso rápido del personal en recepción. Escribe el DNI, nombre o escanea el código.
            </p>
          </div>
          <div>
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="inline-flex items-center gap-1.5 bg-white text-zinc-950 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-zinc-100 transition-colors shadow-sm cursor-pointer border border-transparent"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Nuevo Cliente
            </button>
          </div>
        </div>
      </div>

      {/* Search Input Section */}
      <div className="relative">
        <div className="flex rounded-2xl bg-white shadow-sm border border-zinc-200/80 dark:bg-zinc-900 dark:border-zinc-850 p-2 items-center">
          <div className="pl-3 text-zinc-400 dark:text-zinc-500">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar por DNI o Nombre del Cliente..."
            className="w-full pl-3 pr-4 py-3 bg-transparent text-zinc-900 dark:text-zinc-50 text-base placeholder-zinc-400 dark:placeholder-zinc-500 font-medium focus:outline-none focus:ring-0"
          />
          {query && (
            <button
              onClick={handleClearSearch}
              className="p-1 rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer mr-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Access Evaluation Card (Show when client is selected) */}
      {loadingAccess && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-12 text-center shadow-xs">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-zinc-900 border-t-transparent dark:border-white"></div>
          <p className="mt-4 text-sm font-semibold text-zinc-500">Evaluando estado de membresía...</p>
        </div>
      )}

      {!loadingAccess && selectedCliente && accessState.status && (
        <div className={`overflow-hidden rounded-2xl border bg-white shadow-md transition-all duration-300 ${
          accessState.status === 'PERMITIDO'
            ? 'border-emerald-200 bg-emerald-50/10 dark:border-emerald-900/30'
            : 'border-rose-200 bg-rose-50/10 dark:border-rose-900/30'
        }`}>
          {/* Accent Color Band */}
          <div className={`h-2.5 ${accessState.status === 'PERMITIDO' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>

          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* Status Indicator Icon */}
                <div className={`p-4 rounded-2xl border shrink-0 ${
                  accessState.status === 'PERMITIDO'
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400'
                    : 'bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400'
                }`}>
                  {accessState.status === 'PERMITIDO' ? (
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-2">
                  <span className={`inline-flex items-center gap-1 text-xs font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full ${
                    accessState.status === 'PERMITIDO'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400'
                  }`}>
                    {accessState.message}
                  </span>
                  
                  <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
                    {selectedCliente.nombre} {selectedCliente.apellido || ''}
                  </h2>

                  <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                    DNI: <span className="font-bold text-zinc-800 dark:text-zinc-100">{selectedCliente.dni || 'Sin registrar'}</span> — 
                    Teléfono: <span className="font-bold text-zinc-800 dark:text-zinc-100">{selectedCliente.telefono || 'Sin registrar'}</span>
                  </p>

                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 max-w-xl leading-relaxed">
                    {accessState.detail}
                  </p>
                </div>
              </div>

              {/* Quick actions panel */}
              <div className="flex md:flex-col gap-2.5 w-full md:w-auto mt-4 md:mt-0">
                <button
                  onClick={handleBackToDirectory}
                  className="flex-1 md:flex-initial text-center bg-zinc-900 hover:bg-zinc-850 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-transparent"
                >
                  Volver al Directorio
                </button>
                <button
                  onClick={() => setIsProfileModalOpen(true)}
                  className="flex-1 md:flex-initial text-center bg-zinc-100 hover:bg-zinc-200/80 text-zinc-800 dark:bg-zinc-850 dark:hover:bg-zinc-800 dark:text-zinc-200 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-750"
                >
                  Ver Ficha
                </button>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="flex-1 md:flex-initial text-center bg-zinc-100 hover:bg-zinc-200/80 text-zinc-800 dark:bg-zinc-850 dark:hover:bg-zinc-800 dark:text-zinc-200 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-750"
                >
                  Editar
                </button>
                {puedeRenovar && (
                  cajaActiva ? (
                    <Link
                      href={`/admin/ventas?cliente=${selectedCliente.id_cliente}`}
                      className="flex-1 md:flex-initial text-center bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 px-5 py-2.5 rounded-xl text-xs font-black transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                      {accessState.status === 'DENEGADO' ? 'Renovar Membresía' : 'Renovar / Vender Plan'}
                    </Link>
                  ) : (
                    <button
                      onClick={() => showAlert({
                        title: 'Arqueo de Caja Requerido',
                        message: 'La caja diaria se encuentra cerrada. Para poder registrar cobros y renovar membresías, debes abrir caja primero.',
                        type: 'warning'
                      })}
                      className="flex-1 md:flex-initial text-center bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-not-allowed opacity-80 flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-zinc-750"
                      title="Caja cerrada: Abre caja para renovar"
                    >
                      <span className="text-amber-500">🔒</span>
                      <span>Caja Cerrada (Abrir Caja para Renovar)</span>
                    </button>
                  )
                )}
                {esAdmin && accessState.membresia && (
                  <button
                    onClick={async () => {
                      const idMembresia = accessState.membresia?.id_membresia;
                      if (!idMembresia) return;
                      const ok = await showConfirm({
                        title: 'Eliminar Membresía de Socio',
                        message: '¿Estás seguro de que deseas ELIMINAR esta membresía? Se borrarán de forma permanente todos los pagos e ingresos de caja vinculados.',
                        confirmText: 'Sí, Eliminar Membresía',
                        cancelText: 'Cancelar',
                        type: 'danger'
                      });

                      if (!ok) return;

                      setLoadingAccess(true);
                      const { eliminarMembresiaCliente } = await import('@/app/actions/membresias');
                      const res = await eliminarMembresiaCliente(idMembresia);
                      if (res.error) {
                        await showAlert({
                          title: 'Error al eliminar membresía',
                          message: res.error,
                          type: 'danger'
                        });
                      } else {
                        showToast('Membresía eliminada correctamente.', 'success');
                        handleSelectCliente(selectedCliente);
                      }
                      setLoadingAccess(false);
                    }}
                    className="flex-1 md:flex-initial text-center bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-rose-200/30"
                  >
                    Eliminar Membresía
                  </button>
                )}
              </div>
            </div>

            {/* Emergency and observation information */}
            {(selectedCliente.contacto_emergencia || selectedCliente.observaciones) && (
              <div className="mt-8 pt-6 border-t border-zinc-200/60 dark:border-zinc-850/60 grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedCliente.contacto_emergencia && (
                  <div className="bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-xl border border-zinc-200/40 dark:border-zinc-850/40">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Contacto de Emergencia</p>
                    <p className="font-semibold text-sm text-zinc-800 dark:text-zinc-200 mt-1">{selectedCliente.contacto_emergencia}</p>
                    {selectedCliente.telefono_emergencia && (
                      <p className="text-xs text-zinc-500 font-semibold mt-0.5">Tel: {selectedCliente.telefono_emergencia}</p>
                    )}
                  </div>
                )}
                {selectedCliente.observaciones && (
                  <div className="bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-xl border border-zinc-200/40 dark:border-zinc-850/40">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Observaciones Médicas / Gym</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-350 font-medium leading-relaxed mt-1">{selectedCliente.observaciones}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Directory listing: shown only when no client is selected */}
      {!selectedCliente && !loadingAccess && (
        !esAdmin && query.trim().length === 0 ? (
          /* VISTA TERMINAL SEGURO DE RECEPCIÓN (Para personal no administrador) */
          <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-xs p-10 text-center dark:bg-zinc-900 dark:border-zinc-850 space-y-4">
            <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Terminal de Control de Acceso y Recepción</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-md mx-auto leading-relaxed">
                Por seguridad y protección de datos, el directorio completo está reservado a la Administración. Escribe el <strong>DNI o Nombre</strong> en el buscador para consultar su membresía y validar su acceso.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap justify-center gap-2">
              <span className="inline-flex items-center gap-1 bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400 px-3 py-1.5 rounded-lg text-[10px] font-semibold">
                🔒 Directorio Protegido
              </span>
              <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-lg text-[10px] font-semibold">
                ⚡ Check-in por DNI / Código
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-xs overflow-hidden dark:bg-zinc-900 dark:border-zinc-850">
            <div className="p-5 border-b border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 flex justify-between items-center flex-wrap gap-4">
              <div>
                <h2 className="text-sm font-bold text-zinc-850 dark:text-zinc-100">
                  {esAdmin ? 'Directorio de Clientes' : 'Resultados de Búsqueda de Socios'}
                </h2>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {esAdmin ? 'Selecciona un cliente para evaluar su estado de acceso al gimnasio.' : 'Haz clic en el socio para abrir su ficha y registrar su ingreso.'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500">
                  {clientes.length} socio(s) encontrado(s)
                </span>
                
                {esAdmin ? (
                  <button
                    onClick={() => setRevealData(!revealData)}
                    className="inline-flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200/80 text-zinc-700 dark:bg-zinc-850 dark:hover:bg-zinc-800 dark:text-zinc-200 px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-colors border border-zinc-250 dark:border-zinc-700"
                  >
                    {revealData ? (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                        Ocultar Datos
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Revelar Datos
                      </>
                    )}
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-zinc-50 dark:bg-zinc-850 text-zinc-400 dark:text-zinc-650 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-zinc-200/50">
                    <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Datos Enmascarados
                  </span>
                )}
              </div>
            </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-zinc-900 border-t-transparent dark:border-white"></div>
              <p className="mt-2 text-xs text-zinc-400 font-medium">Buscando clientes...</p>
            </div>
          ) : clientes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-850 text-zinc-400 font-bold border-b border-zinc-150 dark:border-zinc-800">
                    <th className="p-4 uppercase tracking-wider">Cliente</th>
                    <th className="p-4 uppercase tracking-wider">DNI</th>
                    <th className="p-4 uppercase tracking-wider">Teléfono</th>
                    <th className="p-4 uppercase tracking-wider text-center">Estado</th>
                    <th className="p-4 uppercase tracking-wider text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
                  {clientes.map((c) => (
                    <tr key={c.id_cliente} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-850/10">
                      <td className="p-4 font-bold text-zinc-850 dark:text-zinc-200">
                        {c.nombre} {c.apellido || ''}
                      </td>
                      <td className="p-4 text-zinc-600 dark:text-zinc-400 font-semibold">{formatSensitive(c.dni, 'dni')}</td>
                      <td className="p-4 text-zinc-650 dark:text-zinc-400">{formatSensitive(c.telefono, 'telefono')}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                          c.estado === 'ACTIVO' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                          c.estado === 'BLOQUEADO' ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400' :
                          'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}>
                          {c.estado}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {puedeRenovar && (
                            cajaActiva ? (
                              <Link
                                href={`/admin/ventas?cliente=${c.id_cliente}`}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs inline-flex items-center gap-1"
                                title="Renovar o Vender Membresía para este cliente"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                </svg>
                                Renovar
                              </Link>
                            ) : (
                              <button
                                onClick={() => showAlert({
                                  title: 'Arqueo de Caja Requerido',
                                  message: 'La caja diaria se encuentra cerrada. Debes abrir caja para poder registrar cobros y renovar membresías.',
                                  type: 'warning'
                                })}
                                className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-400 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-not-allowed opacity-80 inline-flex items-center gap-1 border border-zinc-200 dark:border-zinc-750"
                                title="Caja cerrada: Abre caja para renovar"
                              >
                                <span className="text-amber-500">🔒</span>
                                <span>Caja Cerrada</span>
                              </button>
                            )
                          )}
                          <button
                            onClick={() => handleSelectCliente(c)}
                            className="bg-zinc-900 hover:bg-zinc-850 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs border border-transparent"
                          >
                            Evaluar Acceso
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-zinc-500">
              No hay clientes registrados en el sistema. Registra uno nuevo arriba.
            </div>
          )}
        </div>
      )
    )}

      {/* ----------------- MODAL CREAR CLIENTE ----------------- */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-850">
            <div className="px-6 py-5 border-b border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 flex justify-between items-center">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-50">Registrar Nuevo Cliente</h3>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmitNew} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold">
                  {formSuccess}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">DNI (Identificación)</label>
                  <input
                    type="text"
                    name="dni"
                    className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-50 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Nombre *</label>
                  <input
                    type="text"
                    name="nombre"
                    required
                    className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-50 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Apellido</label>
                  <input
                    type="text"
                    name="apellido"
                    className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-50 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Teléfono</label>
                  <input
                    type="tel"
                    name="telefono"
                    maxLength={9}
                    pattern="[0-9]{9}"
                    placeholder="Ej. 987654321"
                    className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-50 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Email</label>
                  <input
                    type="email"
                    name="email"
                    className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-50 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Fecha de Nacimiento</label>
                  <input
                    type="date"
                    name="fecha_nacimiento"
                    className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Dirección</label>
                <input
                  type="text"
                  name="direccion"
                  className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-50 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Contacto de Emergencia</label>
                  <input
                    type="text"
                    name="contacto_emergencia"
                    className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-50 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Teléfono Emergencia</label>
                  <input
                    type="tel"
                    name="telefono_emergencia"
                    maxLength={9}
                    pattern="[0-9]{9}"
                    placeholder="Ej. 987654321"
                    className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Observaciones</label>
                <textarea
                  name="observaciones"
                  rows={2}
                  className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-800 dark:text-zinc-50 focus:outline-none"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="bg-zinc-150 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-750 dark:text-zinc-200 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-zinc-900 hover:bg-zinc-850 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 px-5 py-2.5 rounded-xl text-xs font-black cursor-pointer"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL EDITAR CLIENTE ----------------- */}
      {isEditModalOpen && selectedCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-850">
            <div className="px-6 py-5 border-b border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 flex justify-between items-center">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-50">Editar Datos del Cliente</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmitEdit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold">
                  {formSuccess}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">DNI (Identificación)</label>
                  <input
                    type="text"
                    name="dni"
                    defaultValue={selectedCliente.dni || ''}
                    className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-50 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Nombre *</label>
                  <input
                    type="text"
                    name="nombre"
                    defaultValue={selectedCliente.nombre}
                    required
                    className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-50 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Apellido</label>
                  <input
                    type="text"
                    name="apellido"
                    defaultValue={selectedCliente.apellido || ''}
                    className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-50 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Teléfono</label>
                  <input
                    type="tel"
                    name="telefono"
                    defaultValue={selectedCliente.telefono || ''}
                    maxLength={9}
                    pattern="[0-9]{9}"
                    placeholder="Ej. 987654321"
                    className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-50 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Email</label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={selectedCliente.email || ''}
                    className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-50 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Fecha de Nacimiento</label>
                  <input
                    type="date"
                    name="fecha_nacimiento"
                    defaultValue={selectedCliente.fecha_nacimiento || ''}
                    className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Estado del Cliente</label>
                  <select
                    name="estado"
                    defaultValue={selectedCliente.estado}
                    className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-50 focus:outline-none"
                  >
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="INACTIVO">INACTIVO</option>
                    <option value="BLOQUEADO">BLOQUEADO</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Dirección</label>
                  <input
                    type="text"
                    name="direccion"
                    defaultValue={selectedCliente.direccion || ''}
                    className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Contacto de Emergencia</label>
                  <input
                    type="text"
                    name="contacto_emergencia"
                    defaultValue={selectedCliente.contacto_emergencia || ''}
                    className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-50 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Teléfono Emergencia</label>
                  <input
                    type="tel"
                    name="telefono_emergencia"
                    defaultValue={selectedCliente.telefono_emergencia || ''}
                    maxLength={9}
                    pattern="[0-9]{9}"
                    placeholder="Ej. 987654321"
                    className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Observaciones</label>
                <textarea
                  name="observaciones"
                  rows={2}
                  defaultValue={selectedCliente.observaciones || ''}
                  className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-800 dark:text-zinc-50 focus:outline-none"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="bg-zinc-150 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-750 dark:text-zinc-200 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-zinc-900 hover:bg-zinc-850 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 px-5 py-2.5 rounded-xl text-xs font-black cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL VER PERFIL ----------------- */}
      {isProfileModalOpen && selectedCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-850">
            <div className="px-6 py-5 border-b border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 flex justify-between items-center">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-50">Ficha Completa del Cliente</h3>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Avatar and name */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 dark:bg-white flex items-center justify-center text-xl font-bold text-white dark:text-zinc-950 uppercase shrink-0">
                  {selectedCliente.nombre.charAt(0)}{selectedCliente.apellido?.charAt(0) || ''}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 truncate">{selectedCliente.nombre} {selectedCliente.apellido || ''}</h4>
                  <p className="text-xs text-zinc-500 font-semibold mt-0.5">DNI: {selectedCliente.dni || 'Sin registrar'}</p>
                </div>
              </div>

              {/* Information Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-bold text-zinc-400 block">Teléfono</span>
                  <span className="text-zinc-800 dark:text-zinc-200 font-semibold text-sm mt-0.5 block">{selectedCliente.telefono || 'Sin registrar'}</span>
                </div>
                <div>
                  <span className="font-bold text-zinc-400 block">Email</span>
                  <span className="text-zinc-800 dark:text-zinc-200 font-semibold text-sm mt-0.5 block truncate">{selectedCliente.email || 'Sin registrar'}</span>
                </div>
                <div>
                  <span className="font-bold text-zinc-400 block">Fecha Nacimiento</span>
                  <span className="text-zinc-800 dark:text-zinc-200 font-semibold text-sm mt-0.5 block">
                    {selectedCliente.fecha_nacimiento ? new Date(selectedCliente.fecha_nacimiento + 'T00:00:00').toLocaleDateString() : 'Sin registrar'}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-zinc-400 block">Dirección</span>
                  <span className="text-zinc-800 dark:text-zinc-200 font-semibold text-sm mt-0.5 block truncate">{selectedCliente.direccion || 'Sin registrar'}</span>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-zinc-150 dark:border-zinc-850">
                <div>
                  <span className="font-bold text-zinc-400 text-xs block">Contacto Emergencia</span>
                  <p className="text-zinc-800 dark:text-zinc-200 text-sm font-semibold mt-1">
                    {selectedCliente.contacto_emergencia || 'Sin registrar'}
                    {selectedCliente.telefono_emergencia && ` (Tel: ${selectedCliente.telefono_emergencia})`}
                  </p>
                </div>
                <div>
                  <span className="font-bold text-zinc-400 text-xs block">Observaciones</span>
                  <p className="text-zinc-650 dark:text-zinc-350 text-xs font-medium leading-relaxed mt-1">
                    {selectedCliente.observaciones || 'Ninguna observación.'}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-150 dark:border-zinc-850 flex justify-end">
                <button
                  onClick={() => setIsProfileModalOpen(false)}
                  className="bg-zinc-900 hover:bg-zinc-850 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 px-5 py-2 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

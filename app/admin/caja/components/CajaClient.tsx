'use client';

import React, { useState } from 'react';
import { abrirCaja, cerrarCaja, reabrirCaja, registrarMovimientoManual, obtenerMovimientosCaja } from '@/app/actions/caja';
import { Caja, MovimientoCaja } from '@/types/gym.types';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useModalAlert } from '@/context/ModalAlertContext';

interface CajaClientProps {
  cajaActiva: Caja | null;
  movimientos: MovimientoCaja[];
  historialCajas?: Caja[];
  cajasAbiertas?: Caja[];
  currentUser?: {
    id_usuario: number;
    usuario: string;
    esAdmin: boolean;
  };
}

export default function CajaClient({
  cajaActiva,
  movimientos,
  historialCajas = [],
  cajasAbiertas = [],
  currentUser
}: CajaClientProps) {
  const router = useRouter();
  const { showConfirm, showAlert, showToast } = useModalAlert();

  // Estados de vista
  const [activeTab, setActiveTab] = useState<'turno' | 'historial'>('turno');
  const [searchTermHistorial, setSearchTermHistorial] = useState('');
  const [filterEstadoHistorial, setFilterEstadoHistorial] = useState('TODOS');

  // Estados modales
  const [isAjusteModalOpen, setIsAjusteModalOpen] = useState(false);
  const [isCierreModalOpen, setIsCierreModalOpen] = useState(false);
  const [cajaACerrar, setCajaACerrar] = useState<Caja | null>(null);

  // Modal para ver detalle de movimientos de cualquier caja del historial
  const [detalleCajaModal, setDetalleCajaModal] = useState<Caja | null>(null);
  const [detalleMovimientos, setDetalleMovimientos] = useState<MovimientoCaja[]>([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  // Estados formularios
  const [montoInicial, setMontoInicial] = useState('50.00');
  const [montoFinal, setMontoFinal] = useState('');
  const [manualTipo, setManualTipo] = useState<'INGRESO' | 'EGRESO'>('INGRESO');
  const [manualConcepto, setManualConcepto] = useState('');
  const [manualMonto, setManualMonto] = useState('');

  // Estados de carga y feedback
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Permisos: Solo Administrador puede ver auditoría/historial y cajas de otros
  const esAdmin = currentUser?.esAdmin ?? false;

  // Estados de caja seleccionada (permite al admin alternar entre turnos abiertos si hay más de 1)
  const [selectedCajaId, setSelectedCajaId] = useState<number | null>(null);

  // La caja a mostrar: si el admin eligió una específica de cajasAbiertas, o cajaActiva, o la primera abierta
  const cajaAMostrar = (esAdmin && selectedCajaId ? cajasAbiertas.find((c) => c.id_caja === selectedCajaId) : null) || cajaActiva || (cajasAbiertas.length > 0 ? cajasAbiertas[0] : null);

  // Verificar si existe alguna caja abierta actualmente en el sistema
  const hayCajaAbierta = Boolean(
    cajaActiva || 
    (cajasAbiertas && cajasAbiertas.length > 0) || 
    (historialCajas && historialCajas.some((c) => c.estado === 'ABIERTA'))
  );

  // Datos del responsable de la caja activa
  const esMiCaja = cajaAMostrar ? cajaAMostrar.id_usuario === currentUser?.id_usuario : false;
  const puedeCerrarCaja = true;
  const colaborador = cajaAMostrar?.usuarios_sistema?.equipo;
  const usuarioNombre = cajaAMostrar?.usuarios_sistema?.usuario || `Usuario #${cajaAMostrar?.id_usuario || 'S/D'}`;
  const responsableNombre = colaborador?.nombre
    ? `${colaborador.nombre} ${colaborador.apellido || ''}`
    : `@${usuarioNombre}`;
  const dniResponsable = colaborador?.dni;

  // Calcular montos de la caja activa
  const esCajaActualConMovimientos = cajaAMostrar?.id_caja === cajaActiva?.id_caja;
  const totalIngresos = esCajaActualConMovimientos
    ? movimientos
        .filter((m) => m.tipo === 'INGRESO')
        .reduce((sum, m) => sum + m.monto, 0)
    : 0;

  const totalEgresos = esCajaActualConMovimientos
    ? movimientos
        .filter((m) => m.tipo === 'EGRESO')
        .reduce((sum, m) => sum + m.monto, 0)
    : 0;

  const fondoInicial = Number(cajaAMostrar?.monto_inicial || 0);
  const saldoEsperado = fondoInicial + totalIngresos - totalEgresos;

  // Apertura de caja
  const handleAbrirCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormError(null);
    const monto = parseFloat(montoInicial);
    if (isNaN(monto) || monto < 0) {
      setFormError('El monto inicial debe ser un número válido mayor o igual a 0.');
      setLoading(false);
      return;
    }
    const res = await abrirCaja(monto);
    setLoading(false);
    if (res.error) {
      setFormError(res.error);
    } else {
      showToast('Turno de caja abierto correctamente.', 'success', 'Caja Iniciada');
      router.refresh();
    }
  };

  // Registro de movimiento manual
  const handleRegistrarManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cajaAMostrar) return;
    setLoading(true);
    setFormError(null);

    const monto = parseFloat(manualMonto);
    if (!manualConcepto.trim() || isNaN(monto) || monto <= 0) {
      setFormError('El concepto es obligatorio y el monto debe ser mayor a 0.');
      setLoading(false);
      return;
    }

    const res = await registrarMovimientoManual(cajaAMostrar.id_caja, manualTipo, manualConcepto.trim(), monto);
    setLoading(false);
    if (res.error) {
      setFormError(res.error);
    } else {
      setIsAjusteModalOpen(false);
      setManualConcepto('');
      setManualMonto('');
      showToast(`Ajuste de ${manualTipo} registrado con éxito.`, 'success');
      router.refresh();
    }
  };

  // Ver desglose de movimientos de cualquier caja del historial
  const handleVerDetalle = async (caja: Caja) => {
    setDetalleCajaModal(caja);
    setCargandoDetalle(true);
    try {
      const data = await obtenerMovimientosCaja(caja.id_caja);
      setDetalleMovimientos(data);
    } catch (err) {
      console.error(err);
      showToast('No se pudieron cargar los movimientos de esta caja.', 'danger');
    } finally {
      setCargandoDetalle(false);
    }
  };

  // Abrir modal de cierre para una caja específica
  const abrirModalCierre = (cajaTarget: Caja) => {
    setCajaACerrar(cajaTarget);
    if (cajaTarget.id_caja === cajaAMostrar?.id_caja && esCajaActualConMovimientos) {
      setMontoFinal(Math.max(0, saldoEsperado).toFixed(2));
    } else {
      setMontoFinal(Math.max(0, Number(cajaTarget.monto_inicial || 0)).toFixed(2));
    }
    setFormError(null);
    setIsCierreModalOpen(true);
  };

  // Cierre de caja y arqueo
  const handleCerrarCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    const cajaTarget = cajaACerrar || cajaAMostrar;
    if (!cajaTarget) return;

    setLoading(true);
    setFormError(null);

    const monto = parseFloat(montoFinal);
    if (isNaN(monto) || monto < 0) {
      setFormError('El monto final debe ser un número válido mayor o igual a 0.');
      setLoading(false);
      return;
    }

    const res = await cerrarCaja(cajaTarget.id_caja, monto);
    setLoading(false);
    if (res.error) {
      setFormError(res.error);
    } else {
      setIsCierreModalOpen(false);
      setCajaACerrar(null);
      setMontoFinal('');
      showToast('Caja cerrada y arqueo registrado correctamente.', 'success', 'Turno Liquidado');
      router.refresh();
    }
  };

  // Reabrir caja cerrada (si se cerró por error hoy)
  const handleReabrir = async (idCaja: number) => {
    const ok = await showConfirm({
      title: 'Reabrir Turno de Caja',
      message: '¿Estás seguro de que deseas reabrir este turno de caja para continuar registrando ventas y cobros?',
      confirmText: 'Sí, Reabrir Turno',
      cancelText: 'Cancelar',
      type: 'warning'
    });

    if (!ok) return;

    setLoading(true);
    setFormError(null);
    const res = await reabrirCaja(idCaja);
    setLoading(false);
    if (res.error) {
      await showAlert({
        title: 'No se pudo reabrir',
        message: res.error,
        type: 'danger'
      });
    } else {
      showToast('Turno de caja reabierto con éxito.', 'success', 'Caja Activa');
      router.refresh();
    }
  };

  // Filtrar historial
  const historialFiltrado = historialCajas.filter((c) => {
    const usuarioTexto = c.usuarios_sistema?.usuario?.toLowerCase() || '';
    const nombreTexto = (c.usuarios_sistema?.equipo?.nombre || '').toLowerCase();
    const apellidoTexto = (c.usuarios_sistema?.equipo?.apellido || '').toLowerCase();
    const dniTexto = c.usuarios_sistema?.equipo?.dni || '';
    const fechaTexto = c.fecha || '';

    const matchQuery =
      usuarioTexto.includes(searchTermHistorial.toLowerCase()) ||
      nombreTexto.includes(searchTermHistorial.toLowerCase()) ||
      apellidoTexto.includes(searchTermHistorial.toLowerCase()) ||
      dniTexto.includes(searchTermHistorial) ||
      fechaTexto.includes(searchTermHistorial);

    if (!matchQuery) return false;
    if (filterEstadoHistorial !== 'TODOS' && c.estado !== filterEstadoHistorial) return false;
    return true;
  });

  return (
    <div suppressHydrationWarning className="space-y-6">
      {/* Header General */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 p-6 shadow-md border border-zinc-200/10 sm:p-8 dark:border-zinc-800">
        <div className="absolute right-0 top-0 -mr-20 -mt-20 h-80 w-80 rounded-full bg-zinc-700/10 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Arqueo y Control de Caja</h1>
              {cajaActiva ? (
                <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black px-2.5 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  TURNO ABIERTO
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 bg-zinc-700/50 text-zinc-300 text-xs font-bold px-2.5 py-1 rounded-full">
                  SIN TURNO ACTIVO
                </span>
              )}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400 max-w-2xl">
              Auditoría en tiempo real de turnos de caja, control de efectivo, ingresos, egresos y registro de arqueos para colaboradores.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {cajaActiva && (
              <>
                <button
                  onClick={() => setIsAjusteModalOpen(true)}
                  className="inline-flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-750 text-white px-4 py-2.5 rounded-xl text-xs font-bold border border-zinc-700 cursor-pointer shadow-xs transition-colors"
                >
                  Registrar Ajuste
                </button>
                <button
                  onClick={() => abrirModalCierre(cajaActiva)}
                  className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl text-xs font-black cursor-pointer shadow-md transition-colors"
                >
                  Cerrar Caja / Arqueo
                </button>
              </>
            )}
          </div>
        </div>

        {/* Pestañas de Navegación (SOLO VISIBLE PARA EL ADMINISTRADOR) */}
        {esAdmin && (
          <div className="relative z-10 flex items-center gap-2 mt-6 border-t border-zinc-800 pt-4">
            <button
              onClick={() => setActiveTab('turno')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'turno'
                  ? 'bg-white text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              Turno de Caja Activo {cajaActiva ? '🟢' : ''}
            </button>
            <button
              onClick={() => setActiveTab('historial')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'historial'
                  ? 'bg-white text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              Historial de Cajas y Auditoría ({historialCajas.length})
            </button>
          </div>
        )}
      </div>

      {/* ---------------- PESTAÑA 1: TURNO ACTUAL / APERTURA ---------------- */}
      {activeTab === 'turno' && (
        <div className="space-y-6">
          {/* Si NO hay caja activa: Mostrar formulario de apertura y aviso de otras cajas para admin */}
          {!cajaActiva ? (
            <div className="space-y-6">
              {esAdmin && cajasAbiertas.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 shrink-0">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-amber-900 dark:text-amber-300 text-sm">
                          Se detectó {cajasAbiertas.length} turno(s) de caja ABIERTO(S) en el gimnasio
                        </h3>
                        <p className="text-xs text-amber-800/80 dark:text-amber-400/80 mt-1">
                          Uno de los colaboradores abrió turno de caja hoy. Puedes revisar sus movimientos o cerrarlo:
                        </p>
                        <div className="mt-3 space-y-2">
                          {cajasAbiertas.map((c) => {
                            const u = c.usuarios_sistema;
                            const nombre = u?.equipo?.nombre ? `${u.equipo.nombre} ${u.equipo.apellido || ''}` : `@${u?.usuario || 'S/D'}`;
                            return (
                              <div
                                key={c.id_caja}
                                className="flex items-center justify-between gap-3 bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 text-xs"
                              >
                                <div>
                                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{nombre}</span>{' '}
                                  <span className="text-zinc-500">(@{u?.usuario || 'N/A'})</span> •{' '}
                                  <span className="text-zinc-600 dark:text-zinc-400">
                                    Fondo inicial: S/ {Number(c.monto_inicial || 0).toFixed(2)}
                                  </span> •{' '}
                                  <span className="text-zinc-400">
                                    Apertura: {c.fecha_apertura ? new Date(c.fecha_apertura).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : c.fecha}
                                  </span>
                                </div>
                                <button
                                  onClick={() => abrirModalCierre(c)}
                                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                                >
                                  Cerrar Caja
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Formulario de Apertura o Aviso de Caja Ocupada */}
              {!esAdmin && cajasAbiertas.length > 0 ? (
                <div className="max-w-md mx-auto">
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-6 text-center shadow-md">
                    <div className="h-12 w-12 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 mx-auto flex items-center justify-center mb-3">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h3 className="font-bold text-amber-900 dark:text-amber-200 text-sm">
                      Caja Ocupada por Otro Colaborador
                    </h3>
                    <p className="text-xs text-amber-800/80 dark:text-amber-400/80 mt-2 leading-relaxed">
                      Ya existe un turno de caja activo en el gimnasio a cargo de{' '}
                      <strong>
                        {cajasAbiertas[0]?.usuarios_sistema?.equipo?.nombre
                          ? `${cajasAbiertas[0].usuarios_sistema.equipo.nombre} ${cajasAbiertas[0].usuarios_sistema.equipo.apellido || ''}`
                          : `@${cajasAbiertas[0]?.usuarios_sistema?.usuario || 'Colaborador'}`}
                      </strong>.
                      <br className="my-1" />
                      Para evitar descuadres en el cajón de efectivo, solo puede haber 1 caja activa a la vez. Debe liquidarse el turno anterior antes de abrir uno nuevo.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="max-w-md mx-auto">
                  <div className="bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
                    <div className="bg-zinc-900 p-6 text-center text-white border-b border-zinc-800">
                      <h2 className="text-xl font-black tracking-tight">Apertura de Caja Diaria</h2>
                      <p className="text-xs text-zinc-400 mt-1">
                        Inicia tu turno de caja para registrar cobros de membresías y ventas de cafetería.
                      </p>
                    </div>

                    <form onSubmit={handleAbrirCaja} className="p-6 space-y-5">
                      {formError && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
                          {formError}
                        </div>
                      )}

                      <div className="space-y-2 text-center">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                          ¿Con cuánto dinero en sencillo abres hoy?
                        </label>
                        <div className="relative max-w-xs mx-auto">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 font-extrabold text-lg">
                            S/
                          </span>
                          <input
                            type="number"
                            step="0.10"
                            min="0"
                            required
                            value={montoInicial}
                            onChange={(e) => setMontoInicial(e.target.value)}
                            className="w-full text-center bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-2xl py-3 pl-8 pr-4 font-black text-lg text-zinc-850 dark:text-zinc-50 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 py-3.5 rounded-2xl text-xs font-black tracking-wider transition-all cursor-pointer shadow-md"
                        >
                          {loading ? 'Abriendo Turno...' : 'ABRIR TURNO DE CAJA'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Vista de Caja Abierta */
            <div className="space-y-6">
              {/* Selector de Cajas Abiertas Múltiples para el Administrador */}
              {esAdmin && cajasAbiertas.length > 1 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                        Hay {cajasAbiertas.length} turnos de caja abiertos simultáneamente hoy
                      </h4>
                      <p className="text-[11px] text-amber-800/80 dark:text-amber-400 mt-0.5">
                        Haz clic en cualquiera de las cajas para alternar la vista y liquidar el turno que corresponda:
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {cajasAbiertas.map((c) => {
                      const u = c.usuarios_sistema;
                      const nombre = u?.equipo?.nombre ? `${u.equipo.nombre} ${u.equipo.apellido || ''}` : `@${u?.usuario || 'S/D'}`;
                      const isSelected = c.id_caja === cajaAMostrar?.id_caja;
                      return (
                        <div
                          key={c.id_caja}
                          className={`flex items-center gap-2 rounded-xl px-3 py-1.5 border transition-all ${
                            isSelected
                              ? 'bg-white dark:bg-zinc-800 border-emerald-500 shadow-xs ring-2 ring-emerald-500/20'
                              : 'bg-white/60 dark:bg-zinc-900 border-amber-200 dark:border-amber-900/60 hover:bg-white'
                          }`}
                        >
                          <button
                            onClick={() => setSelectedCajaId(c.id_caja)}
                            className="text-xs font-bold text-zinc-900 dark:text-zinc-100 cursor-pointer text-left"
                          >
                            <span className="block text-[10px] text-zinc-400">ID #{c.id_caja}</span>
                            <span>{nombre} (S/ {Number(c.monto_inicial || 0).toFixed(2)})</span>
                          </button>
                          <button
                            onClick={() => abrirModalCierre(c)}
                            className="ml-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-lg cursor-pointer transition-colors shadow-2xs"
                          >
                            Cerrar
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Banner de Auditoría del Responsable */}
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/20 dark:via-zinc-900 dark:to-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="h-11 w-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-base shadow-sm shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Cajero Responsable:</span>
                        <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                          {responsableNombre}
                        </span>
                        <span className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-md">
                          @{usuarioNombre}
                        </span>
                        {dniResponsable && (
                          <span className="text-xs text-zinc-500">
                            (DNI: {dniResponsable})
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                        Turno iniciado el <strong>{cajaActiva.fecha}</strong> a las{' '}
                        <strong>
                          {cajaActiva.fecha_apertura
                            ? new Date(cajaActiva.fecha_apertura).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '-'}
                        </strong>
                        {!esMiCaja && (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold ml-2">
                            • (Auditoría: Visualizando turno abierto por colaborador)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {puedeCerrarCaja && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => abrirModalCierre(cajaActiva)}
                        className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-black transition-colors shadow-xs cursor-pointer"
                      >
                        {esMiCaja ? 'Cerrar mi Turno de Caja' : `Cerrar Turno de ${colaborador?.nombre || usuarioNombre}`}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Tarjetas de Métricas de Caja */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Fondo inicial */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 shadow-xs border border-zinc-200/80 dark:border-zinc-800 border-l-4 border-l-zinc-500 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Fondo Inicial</span>
                    <p className="text-xl font-bold text-zinc-850 dark:text-zinc-100">S/ {fondoInicial.toFixed(2)}</p>
                  </div>
                  <div className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>

                {/* Ingresos */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 shadow-xs border border-zinc-200/80 dark:border-zinc-800 border-l-4 border-l-emerald-500 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Ingresos Turno</span>
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">S/ {totalIngresos.toFixed(2)}</p>
                  </div>
                  <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>

                {/* Egresos */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 shadow-xs border border-zinc-200/80 dark:border-zinc-800 border-l-4 border-l-rose-500 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Egresos Turno</span>
                    <p className="text-xl font-bold text-rose-600 dark:text-rose-400">S/ {totalEgresos.toFixed(2)}</p>
                  </div>
                  <div className="h-8 w-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 dark:text-rose-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                    </svg>
                  </div>
                </div>

                {/* Saldo esperado */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 shadow-xs border border-zinc-200/80 dark:border-zinc-800 border-l-4 border-l-zinc-900 dark:border-l-white flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Debes Tener en Cajón</span>
                    <p className="text-xl font-black text-zinc-900 dark:text-zinc-50">S/ {saldoEsperado.toFixed(2)}</p>
                  </div>
                  <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Tabla de Movimientos del Turno */}
              <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-xs overflow-hidden dark:bg-zinc-900 dark:border-zinc-800">
                <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850/30 flex justify-between items-center">
                  <div>
                    <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Movimientos del Turno Actual</h2>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Auditoría completa de transacciones del turno de hoy.</p>
                  </div>
                  <span className="text-xs font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg">
                    {movimientos.length} movimiento(s)
                  </span>
                </div>

                {movimientos.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-zinc-50 dark:bg-zinc-850 text-zinc-400 font-bold border-b border-zinc-100 dark:border-zinc-800">
                          <th className="p-4 uppercase tracking-wider">Concepto</th>
                          <th className="p-4 uppercase tracking-wider">Registrado Por</th>
                          <th className="p-4 uppercase tracking-wider text-center">Tipo</th>
                          <th className="p-4 uppercase tracking-wider text-right">Monto</th>
                          <th className="p-4 uppercase tracking-wider text-right">Hora</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {movimientos.map((mov) => {
                          const cajeroName = mov.usuarios_sistema?.equipo?.nombre
                            ? `${mov.usuarios_sistema.equipo.nombre} ${mov.usuarios_sistema.equipo.apellido || ''}`
                            : mov.usuarios_sistema?.usuario
                            ? `@${mov.usuarios_sistema.usuario}`
                            : 'Sistema';
                          return (
                            <tr key={mov.id_movimiento} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/20">
                              <td className="p-4 font-semibold text-zinc-800 dark:text-zinc-200">{mov.concepto}</td>
                              <td className="p-4">
                                <span className="font-semibold text-zinc-800 dark:text-zinc-200 block text-xs">
                                  {cajeroName}
                                </span>
                                {mov.usuarios_sistema?.usuario && (
                                  <span className="text-[10px] text-zinc-400">
                                    @{mov.usuarios_sistema.usuario}
                                  </span>
                                )}
                              </td>
                              <td className="p-4 text-center">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-md font-bold text-[10px] ${
                                    mov.tipo === 'INGRESO'
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                                      : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                                  }`}
                                >
                                  {mov.tipo}
                                </span>
                              </td>
                              <td
                                className={`p-4 text-right font-black ${
                                  mov.tipo === 'INGRESO' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {mov.tipo === 'INGRESO' ? '+' : '-'} S/ {Number(mov.monto).toFixed(2)}
                              </td>
                              <td className="p-4 text-right text-zinc-400 dark:text-zinc-500">
                                {mov.fecha
                                  ? new Date(mov.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                                  : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-10 text-center text-zinc-500">
                    <p className="text-sm font-semibold">No se han registrado movimientos todavía en este turno.</p>
                    <p className="text-xs text-zinc-400 mt-1">Los cobros de membresías y ventas de cafetería aparecerán aquí.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------- PESTAÑA 2: HISTORIAL Y AUDITORÍA DE TODAS LAS CAJAS (SOLO ADMINISTRADOR) ---------------- */}
      {esAdmin && activeTab === 'historial' && (
        <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-xs overflow-hidden dark:bg-zinc-900 dark:border-zinc-800">
          {/* Header y Filtros del Historial */}
          <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850/30 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Auditoría Completa de Turnos de Caja
              </h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Historial de apertura, montos y cierres efectuados por cada colaborador del equipo.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Buscar por colaborador, usuario o fecha..."
                value={searchTermHistorial}
                onChange={(e) => setSearchTermHistorial(e.target.value)}
                className="bg-white dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750 text-xs rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-100 focus:outline-none w-full sm:w-64"
              />
              <select
                value={filterEstadoHistorial}
                onChange={(e) => setFilterEstadoHistorial(e.target.value)}
                className="bg-white dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750 text-xs rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-100 focus:outline-none"
              >
                <option value="TODOS">Todos los estados</option>
                <option value="ABIERTA">ABIERTAS</option>
                <option value="CERRADA">CERRADAS</option>
              </select>
            </div>
          </div>

          {/* Tabla de Historial */}
          {historialFiltrado.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-850 text-zinc-400 font-bold border-b border-zinc-100 dark:border-zinc-800">
                    <th className="p-4 uppercase tracking-wider">Fecha / ID</th>
                    <th className="p-4 uppercase tracking-wider">Responsable</th>
                    <th className="p-4 uppercase tracking-wider">Fondo Inicial</th>
                    <th className="p-4 uppercase tracking-wider">Monto Final</th>
                    <th className="p-4 uppercase tracking-wider">Descuadre</th>
                    <th className="p-4 uppercase tracking-wider">Estado</th>
                    <th className="p-4 uppercase tracking-wider">Horario</th>
                    <th className="p-4 uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {historialFiltrado.map((c) => {
                    const eq = c.usuarios_sistema?.equipo;
                    const nombreColaborador = eq?.nombre
                      ? `${eq.nombre} ${eq.apellido || ''}`
                      : `@${c.usuarios_sistema?.usuario || 'Sistema'}`;
                    const usuarioStr = c.usuarios_sistema?.usuario;
                    const dniStr = eq?.dni;

                    const fInicial = Number(c.monto_inicial || 0);
                    const fFinal = c.monto_final !== null ? Number(c.monto_final) : null;
                    const dif = fFinal !== null ? fFinal - fInicial : null;

                    return (
                      <tr key={c.id_caja} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/20 transition-colors">
                        <td className="p-4">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100 block">{c.fecha}</span>
                          <span className="text-[10px] text-zinc-400">ID #{c.id_caja}</span>
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-zinc-850 dark:text-zinc-200 block">
                            {nombreColaborador}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-zinc-500 font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.2 rounded">
                              @{usuarioStr || 'N/A'}
                            </span>
                            {dniStr && (
                              <span className="text-[10px] text-zinc-400">
                                DNI: {dniStr}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 font-bold text-zinc-700 dark:text-zinc-300">
                          S/ {fInicial.toFixed(2)}
                        </td>
                        <td className="p-4 font-bold text-zinc-900 dark:text-zinc-100">
                          {fFinal !== null ? `S/ ${fFinal.toFixed(2)}` : <span className="text-zinc-400">En Curso</span>}
                        </td>
                        <td className="p-4">
                          {dif !== null ? (
                            <span
                              className={`text-[11px] font-bold ${
                                dif === 0 ? 'text-zinc-500' : dif > 0 ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {dif > 0 ? `+ S/ ${dif.toFixed(2)}` : dif < 0 ? `- S/ ${Math.abs(dif).toFixed(2)}` : 'S/ 0.00'}
                            </span>
                          ) : (
                            <span className="text-zinc-400 text-[10px]">—</span>
                          )}
                        </td>
                        <td className="p-4">
                          {c.estado === 'ABIERTA' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              ABIERTA
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 px-2 py-0.5 rounded-full">
                              CERRADA
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-[11px] text-zinc-500">
                          <div>
                            Apertura:{' '}
                            {c.fecha_apertura
                              ? new Date(c.fecha_apertura).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : '-'}
                          </div>
                          {c.fecha_cierre && (
                            <div className="text-zinc-400">
                              Cierre:{' '}
                              {new Date(c.fecha_cierre).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleVerDetalle(c)}
                              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/60 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                              title="Ver desglose de todos los ingresos y egresos de este turno"
                            >
                              Ver Movimientos
                            </button>
                            {c.estado === 'ABIERTA' ? (
                              <button
                                onClick={() => abrirModalCierre(c)}
                                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-2xs"
                              >
                                Cerrar Turno
                              </button>
                            ) : (
                              !hayCajaAbierta && c.fecha === new Date().toISOString().split('T')[0] && (esAdmin || c.id_usuario === currentUser?.id_usuario) && (
                                <button
                                  onClick={() => handleReabrir(c.id_caja)}
                                  disabled={loading}
                                  className="text-[10px] font-bold text-amber-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200 bg-amber-100/70 hover:bg-amber-200/70 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-800/60 px-2 py-1 rounded-md transition-colors cursor-pointer"
                                  title="Reabrir este turno si fue cerrado por error hoy"
                                >
                                  Reabrir
                                </button>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-zinc-500">
              <p className="text-sm font-semibold">No se encontraron turnos de caja con los filtros seleccionados.</p>
            </div>
          )}
        </div>
      )}

      {/* ----------------- MODAL AJUSTE MANUAL ----------------- */}
      {isAjusteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-850">
            <div className="px-6 py-5 border-b border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 flex justify-between items-center">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-50">Registrar Ajuste en Caja</h3>
              <button
                onClick={() => setIsAjusteModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 transition-colors p-1 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleRegistrarManual} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Tipo de Movimiento</label>
                <select
                  value={manualTipo}
                  onChange={(e) => setManualTipo(e.target.value as 'INGRESO' | 'EGRESO')}
                  className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-850 dark:text-zinc-50 focus:outline-none"
                >
                  <option value="INGRESO">INGRESO (Entrada de Efectivo)</option>
                  <option value="EGRESO">EGRESO (Salida de Efectivo)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Concepto / Glosa</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Sencillo adicional, Compra de agua destilada..."
                  value={manualConcepto}
                  onChange={(e) => setManualConcepto(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-850 dark:text-zinc-50 focus:outline-none placeholder-zinc-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Monto (S/)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={manualMonto}
                  onChange={(e) => setManualMonto(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-850 dark:text-zinc-50 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-zinc-150 dark:border-zinc-850 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAjusteModalOpen(false)}
                  className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-750 dark:text-zinc-200 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-zinc-900 hover:bg-zinc-850 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 px-5 py-2.5 rounded-xl text-xs font-black cursor-pointer"
                >
                  {loading ? 'Registrando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL CIERRE DE CAJA Y ARQUEO ----------------- */}
      {isCierreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-850">
            <div className="px-6 py-5 border-b border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-50">Cierre de Caja y Arqueo</h3>
                {cajaACerrar && (
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Responsable:{' '}
                    <strong>
                      {cajaACerrar.usuarios_sistema?.equipo?.nombre
                        ? `${cajaACerrar.usuarios_sistema.equipo.nombre} ${cajaACerrar.usuarios_sistema.equipo.apellido || ''}`
                        : `@${cajaACerrar.usuarios_sistema?.usuario || 'Sistema'}`}
                    </strong>
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setIsCierreModalOpen(false);
                  setCajaACerrar(null);
                }}
                className="text-zinc-400 hover:text-zinc-600 transition-colors p-1 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCerrarCaja} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div className="bg-zinc-50 dark:bg-zinc-850/50 p-4 rounded-xl space-y-2 border border-zinc-200/50">
                <div className="flex justify-between text-xs font-medium text-zinc-500">
                  <span>Fondo Inicial:</span>
                  <span>S/ {fondoInicial.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs font-medium text-zinc-500">
                  <span>(+) Ingresos:</span>
                  <span className="text-emerald-600">S/ {totalIngresos.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs font-medium text-zinc-500">
                  <span>(-) Egresos:</span>
                  <span className="text-rose-600">S/ {totalEgresos.toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex justify-between text-sm font-bold text-zinc-800 dark:text-zinc-100">
                  <span>Monto Esperado:</span>
                  <span>S/ {saldoEsperado.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2 text-center pt-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                  ¿Cuánto dinero hay FÍSICAMENTE en cajón?
                </label>
                <div className="relative max-w-xs mx-auto">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 font-extrabold text-lg">
                    S/
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={montoFinal}
                    onChange={(e) => setMontoFinal(e.target.value)}
                    className="w-full text-center bg-zinc-50 border border-zinc-250 dark:bg-zinc-850 dark:border-zinc-800 rounded-2xl py-3 pl-8 pr-4 font-black text-lg text-zinc-850 dark:text-zinc-50 focus:outline-none"
                  />
                </div>
              </div>

              {montoFinal && parseFloat(montoFinal) !== saldoEsperado && (
                <div className="p-3 bg-amber-50 text-amber-800 border border-amber-100 rounded-xl text-[10px] leading-relaxed font-semibold">
                  Aviso: El dinero reportado difiere del monto contable esperado (Diferencia: S/ {(parseFloat(montoFinal) - saldoEsperado).toFixed(2)}). Esto se registrará en el log de seguridad de auditoría.
                </div>
              )}

              <div className="pt-4 border-t border-zinc-150 dark:border-zinc-850 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCierreModalOpen(false);
                    setCajaACerrar(null);
                  }}
                  className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-750 dark:text-zinc-200 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl text-xs font-black cursor-pointer shadow-sm"
                >
                  {loading ? 'Cerrando...' : 'Confirmar Cierre de Caja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL DETALLE DE MOVIMIENTOS (CUALQUIER CAJA) ----------------- */}
      {detalleCajaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-850 flex flex-col max-h-[85vh]">
            <div className="px-6 py-5 border-b border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-850/40 flex justify-between items-center shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-50">
                    Detalle de Movimientos • Caja ID #{detalleCajaModal.id_caja}
                  </h3>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase ${
                    detalleCajaModal.estado === 'ABIERTA'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}>
                    {detalleCajaModal.estado}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Fecha: <strong>{detalleCajaModal.fecha}</strong> • Responsable:{' '}
                  <strong>
                    {detalleCajaModal.usuarios_sistema?.equipo?.nombre
                      ? `${detalleCajaModal.usuarios_sistema.equipo.nombre} ${detalleCajaModal.usuarios_sistema.equipo.apellido || ''}`
                      : `@${detalleCajaModal.usuarios_sistema?.usuario || 'Sistema'}`}
                  </strong>
                </p>
              </div>
              <button
                onClick={() => {
                  setDetalleCajaModal(null);
                  setDetalleMovimientos([]);
                }}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Resumen del Turno */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-zinc-50/50 dark:bg-zinc-850/20 border-b border-zinc-150 dark:border-zinc-800 shrink-0 text-xs">
              <div className="bg-white dark:bg-zinc-850 p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Fondo Inicial</span>
                <p className="font-extrabold text-sm text-zinc-850 dark:text-zinc-100 mt-0.5">
                  S/ {Number(detalleCajaModal.monto_inicial || 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-white dark:bg-zinc-850 p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Total Ingresos</span>
                <p className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">
                  S/ {detalleMovimientos.filter(m => m.tipo === 'INGRESO').reduce((sum, m) => sum + Number(m.monto), 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-white dark:bg-zinc-850 p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Total Egresos</span>
                <p className="font-extrabold text-sm text-rose-600 dark:text-rose-400 mt-0.5">
                  S/ {detalleMovimientos.filter(m => m.tipo === 'EGRESO').reduce((sum, m) => sum + Number(m.monto), 0).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Lista de Transacciones y Ajustes */}
            <div className="flex-1 overflow-y-auto p-4">
              {cargandoDetalle ? (
                <div className="p-12 text-center text-zinc-400 text-xs animate-pulse">
                  Cargando movimientos de auditoría...
                </div>
              ) : detalleMovimientos.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-zinc-50 dark:bg-zinc-850 text-zinc-400 font-bold border-b border-zinc-100 dark:border-zinc-800">
                        <th className="p-3 uppercase tracking-wider">Concepto / Glosa</th>
                        <th className="p-3 uppercase tracking-wider">Registrado Por</th>
                        <th className="p-3 uppercase tracking-wider text-center">Tipo</th>
                        <th className="p-3 uppercase tracking-wider text-right">Monto</th>
                        <th className="p-3 uppercase tracking-wider text-right">Hora</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {detalleMovimientos.map((mov) => {
                        const cajeroName = mov.usuarios_sistema?.equipo?.nombre
                          ? `${mov.usuarios_sistema.equipo.nombre} ${mov.usuarios_sistema.equipo.apellido || ''}`
                          : mov.usuarios_sistema?.usuario
                          ? `@${mov.usuarios_sistema.usuario}`
                          : 'Sistema';
                        return (
                          <tr key={mov.id_movimiento} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/20">
                            <td className="p-3 font-semibold text-zinc-800 dark:text-zinc-200">
                              {mov.concepto}
                            </td>
                            <td className="p-3">
                              <span className="font-semibold text-zinc-800 dark:text-zinc-200 block text-xs">
                                {cajeroName}
                              </span>
                              {mov.usuarios_sistema?.usuario && (
                                <span className="text-[10px] text-zinc-400">
                                  @{mov.usuarios_sistema.usuario}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                mov.tipo === 'INGRESO'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                              }`}>
                                {mov.tipo}
                              </span>
                            </td>
                            <td className={`p-3 text-right font-black ${
                              mov.tipo === 'INGRESO' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}>
                              {mov.tipo === 'INGRESO' ? '+' : '-'} S/ {Number(mov.monto).toFixed(2)}
                            </td>
                            <td className="p-3 text-right text-zinc-400 dark:text-zinc-500 text-[11px]">
                              {mov.fecha
                                ? new Date(mov.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                                : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-10 text-center text-zinc-400 text-xs">
                  No se registraron movimientos en este turno.
                </div>
              )}
            </div>

            <div className="p-4 border-t border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-850/30 flex justify-end shrink-0">
              <button
                onClick={() => {
                  setDetalleCajaModal(null);
                  setDetalleMovimientos([]);
                }}
                className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 px-5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

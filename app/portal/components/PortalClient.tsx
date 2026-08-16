'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { consultarSocioPortal, SocioPortalData } from '@/app/actions/stripe';
import ThemeToggle from '@/components/theme/ThemeToggle';
import {
  Dumbbell,
  Search,
  User,
  CreditCard,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  History,
  FileText,
  Zap,
  ArrowLeft
} from 'lucide-react';

export default function PortalClient() {
  const [identificador, setIdentificador] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [socioData, setSocioData] = useState<SocioPortalData | null>(null);
  const [activeHistoryTab, setActiveHistoryTab] = useState<'membresias' | 'pagos'>('membresias');

  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identificador.trim()) {
      setErrorMsg('Ingresa tu DNI o Correo Electrónico.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await consultarSocioPortal(identificador.trim());
      if (res.error) {
        setErrorMsg(res.error);
        setSocioData(null);
      } else if (res.data) {
        setSocioData(res.data);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleLimpiar = () => {
    setSocioData(null);
    setIdentificador('');
    setErrorMsg(null);
  };

  return (
    <div suppressHydrationWarning className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-blue-600 selection:text-white pb-20 transition-colors duration-200">
      
      {/* Header Sticky */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800/80 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 block leading-tight">GestionWeb</span>
              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 block uppercase tracking-wider">Portal de Socios</span>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Link
              href="/unete"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 sm:px-4 py-2 rounded-xl transition-all shadow-md shadow-blue-500/20 inline-flex items-center gap-1.5"
            >
              <span>Comprar <span className="hidden sm:inline">Membresía</span></span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/"
              className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors hidden sm:inline"
            >
              Inicio
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 space-y-8">
        {/* Title Block */}
        <div className="text-center max-w-lg mx-auto space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-medium">
            <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            Autoservicio para Socios
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
            Consulta tu Membresía y Estado
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            Ingresa tu DNI o Correo Electrónico para consultar tus días de vigencia e historial.
          </p>
        </div>

        {/* Search Box */}
        <form onSubmit={handleBuscar} className="max-w-md mx-auto">
          <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus-within:border-blue-500 dark:focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 rounded-2xl p-1.5 shadow-xs transition-all">
            <div className="pl-3 text-blue-600 dark:text-blue-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              maxLength={80}
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value.replace(/[^a-zA-Z0-9@._-]/g, '').slice(0, 80))}
              placeholder="Digita tu DNI o Correo..."
              className="w-full pl-2.5 pr-3 py-2 bg-transparent text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none font-medium"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {loading ? 'Consultando...' : 'Consultar'}
            </button>
          </div>

          {errorMsg && (
            <div className="mt-3 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 text-center flex flex-col items-center gap-1.5">
              <p>{errorMsg}</p>
              <Link
                href="/unete"
                className="text-blue-600 dark:text-blue-400 hover:underline font-bold text-xs inline-flex items-center gap-1"
              >
                <span>¿Aún no tienes plan? Inscríbete en línea aquí</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </form>

        {/* ------------------------------------------------------------- */}
        {/* DASHBOARD DEL SOCIO (SI SE ENCONTRÓ) */}
        {/* ------------------------------------------------------------- */}
        {socioData && (
          <div className="space-y-6 animate-fadeIn">
            {/* Header del Perfil del Socio */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-xs">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-black text-lg flex items-center justify-center shadow-md shadow-blue-500/20">
                  {socioData.cliente.nombre.charAt(0)}{socioData.cliente.apellido?.charAt(0) || ''}
                </div>
                <div className="space-y-0.5">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {socioData.cliente.nombre} {socioData.cliente.apellido || ''}
                  </h2>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                    <span>DNI: {socioData.cliente.dni}</span>
                    {socioData.cliente.telefono && <span>• Tel: {socioData.cliente.telefono}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleLimpiar}
                  className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Nueva consulta
                </button>
              </div>
            </div>

            {/* Tarjeta de Membresía Actual */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 space-y-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Estado de Membresía</h3>
                    <span className="text-xs text-zinc-500">Acceso al Gimnasio con DNI</span>
                  </div>
                </div>

                {socioData.membresiaActiva ? (
                  socioData.membresiaActiva.estado === 'ACTIVA' ? (
                    <span className="inline-flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-bold px-3 py-1 rounded-full w-fit">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>MEMBRESÍA ACTIVA</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-bold px-3 py-1 rounded-full w-fit">
                      <span>PLAN VENCIDO</span>
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-semibold px-3 py-1 rounded-full w-fit">
                    SIN MEMBRESÍA ACTIVA
                  </span>
                )}
              </div>

              {socioData.membresiaActiva ? (
                <div className="space-y-6">
                  {/* Grid de Información de Vigencia */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-1">
                      <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Plan Actual</span>
                      <p className="font-bold text-blue-600 dark:text-blue-400 text-sm">{socioData.membresiaActiva.planNombre}</p>
                    </div>

                    <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-1">
                      <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Fecha de Vencimiento</span>
                      <p className="font-bold text-zinc-900 dark:text-zinc-100 text-sm font-mono">{socioData.membresiaActiva.fecha_fin}</p>
                    </div>

                    <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-1">
                      <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Días Restantes</span>
                      <p className={`text-xl font-black font-mono ${
                        socioData.membresiaActiva.diasRestantes > 5 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                      }`}>
                        {socioData.membresiaActiva.diasRestantes} días
                      </p>
                    </div>
                  </div>

                  {/* Botón de Renovación Online */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30">
                    <div className="text-left space-y-0.5">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">¿Deseas extender o renovar tu plan?</span>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">Paga en línea con Stripe sin hacer filas en recepción.</span>
                    </div>
                    <Link
                      href="/unete"
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all text-center inline-flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Renovar Mi Plan</span>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 space-y-3">
                  <p className="text-xs text-zinc-500">Actualmente no cuentas con una membresía activa registrada.</p>
                  <Link
                    href="/unete"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all"
                  >
                    <span>Inscribirme a un Plan Online</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>

            {/* Historial de Membresías y Pagos */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Historial Registrado</h3>
                </div>

                <div className="flex gap-1.5">
                  <button
                    onClick={() => setActiveHistoryTab('membresias')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      activeHistoryTab === 'membresias'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    Membresías ({socioData.historialMembresias.length})
                  </button>
                  <button
                    onClick={() => setActiveHistoryTab('pagos')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      activeHistoryTab === 'pagos'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    Pagos ({socioData.pagos.length})
                  </button>
                </div>
              </div>

              {activeHistoryTab === 'membresias' ? (
                <div className="overflow-x-auto">
                  {socioData.historialMembresias.length > 0 ? (
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-100 dark:border-zinc-800 text-zinc-400">
                          <th className="py-2.5 font-medium">Plan</th>
                          <th className="py-2.5 font-medium">Inicio</th>
                          <th className="py-2.5 font-medium">Fin</th>
                          <th className="py-2.5 font-medium">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {socioData.historialMembresias.map(m => (
                          <tr key={m.id_membresia} className="text-zinc-700 dark:text-zinc-300">
                            <td className="py-2.5 font-semibold text-zinc-900 dark:text-zinc-100">{m.planNombre}</td>
                            <td className="py-2.5 font-mono text-zinc-500">{m.fecha_inicio}</td>
                            <td className="py-2.5 font-mono text-zinc-500">{m.fecha_fin}</td>
                            <td className="py-2.5">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                m.estado === 'ACTIVA'
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                              }`}>
                                {m.estado}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-xs text-zinc-400 py-4 text-center">No hay membresías registradas.</p>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {socioData.pagos.length > 0 ? (
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-100 dark:border-zinc-800 text-zinc-400">
                          <th className="py-2.5 font-medium">Fecha</th>
                          <th className="py-2.5 font-medium">Concepto</th>
                          <th className="py-2.5 font-medium">Método</th>
                          <th className="py-2.5 font-medium text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {socioData.pagos.map(p => (
                          <tr key={p.id_pago} className="text-zinc-700 dark:text-zinc-300">
                            <td className="py-2.5 font-mono text-zinc-500">{p.fecha}</td>
                            <td className="py-2.5 font-semibold text-zinc-900 dark:text-zinc-100">{p.concepto}</td>
                            <td className="py-2.5 text-zinc-500">{p.metodo}</td>
                            <td className="py-2.5 font-mono font-bold text-blue-600 dark:text-blue-400 text-right">S/ {p.monto.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-xs text-zinc-400 py-4 text-center">No hay registros de pago.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

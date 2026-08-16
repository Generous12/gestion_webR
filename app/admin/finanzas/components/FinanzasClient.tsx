'use client';

import React, { useState, useEffect } from 'react';
import { crearGasto, pagarGasto } from '@/app/actions/gastos';
import { obtenerReporteContableMensual, ReporteContableMensual } from '@/app/actions/contabilidad';
import { generarTextoResumenContable } from '@/utils/exportadorContable';
import { exportarExcelConsolidadoGeneral } from '@/utils/exportadorExcel';
import { Gasto, CategoriaGasto, Caja } from '@/types/gym.types';
import { useRouter } from 'next/navigation';

interface PagoData {
  monto: number;
  metodos_pago: { nombre: string } | { nombre: string }[] | null;
}

interface MovimientoData {
  monto: number;
  tipo: 'INGRESO' | 'EGRESO';
  fecha: string;
}

interface FinanzasClientProps {
  cajaActiva: Caja | null;
  gastos: Gasto[];
  categorias: CategoriaGasto[];
  pagosData: PagoData[];
  movimientosData: MovimientoData[];
}

export default function FinanzasClient({
  cajaActiva,
  gastos,
  categorias,
  pagosData,
  movimientosData
}: FinanzasClientProps) {
  const router = useRouter();

  // Modales
  const [isNewGastoModalOpen, setIsNewGastoModalOpen] = useState(false);
  const [selectedGastoParaPagar, setSelectedGastoParaPagar] = useState<Gasto | null>(null);
  const [montoFinalPago, setMontoFinalPago] = useState('');

  // Modal de Exportación Contable
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportYear, setExportYear] = useState<number>(new Date().getFullYear());
  const [exportMonth, setExportMonth] = useState<number>(new Date().getMonth() + 1);
  const [exportReporte, setExportReporte] = useState<ReporteContableMensual | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Estados carga
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Cargar datos contables para el mes y año seleccionados
  const cargarReporteContable = async (y: number, m: number) => {
    setExportLoading(true);
    setExportError(null);
    setCopiedSuccess(false);
    try {
      const res = await obtenerReporteContableMensual(y, m);
      if (res.error) {
        setExportError(res.error);
      } else if (res.data) {
        setExportReporte(res.data);
      }
    } catch (e: unknown) {
      const mensaje = e instanceof Error ? e.message : 'Error desconocido';
      setExportError('Error al generar el consolidado contable: ' + mensaje);
    } finally {
      setExportLoading(false);
    }
  };

  const handleAbrirModalExportacion = () => {
    setIsExportModalOpen(true);
    cargarReporteContable(exportYear, exportMonth);
  };

  const handleCambiarMesExportacion = (nuevoMes: number, nuevoAño: number) => {
    setExportMonth(nuevoMes);
    setExportYear(nuevoAño);
    cargarReporteContable(nuevoAño, nuevoMes);
  };

  const handleDescargarExcel = async () => {
    if (!exportReporte) return;
    const nombreArchivo = `Reporte_Contable_Gym_${exportReporte.periodo.año}_${exportReporte.periodo.mes.toString().padStart(2, '0')}.xlsx`;
    await exportarExcelConsolidadoGeneral(exportReporte, nombreArchivo);
  };

  const handleCopiarWhatsApp = async () => {
    if (!exportReporte) return;
    const texto = generarTextoResumenContable(exportReporte);
    try {
      await navigator.clipboard.writeText(texto);
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 3000);
    } catch (e) {
      console.error('Error al copiar al portapapeles:', e);
    }
  };

  // 1. CÁLCULO DE MÉTRICAS GENERALES
  const ingresosTotales = movimientosData
    .filter((m) => m.tipo === 'INGRESO')
    .reduce((sum, m) => sum + m.monto, 0);

  const egresosCaja = movimientosData
    .filter((m) => m.tipo === 'EGRESO')
    .reduce((sum, m) => sum + m.monto, 0);

  const gastosPagados = gastos
    .filter((g) => g.estado === 'PAGADO')
    .reduce((sum, g) => sum + Number(g.monto_final !== null && g.monto_final !== undefined ? g.monto_final : g.monto_estimado), 0);

  // Egresos totales de la empresa (gastos pagados + salidas de caja chica)
  const egresosTotales = egresosCaja + gastosPagados;

  const balanceNeto = ingresosTotales - egresosTotales;

  const gastosPendientes = gastos.filter((g) => g.estado === 'PENDIENTE');
  const totalPendientesMonto = gastosPendientes.reduce((sum, g) => sum + g.monto_estimado, 0);

  // 2. AGRUPAR INGRESOS POR MÉTODO DE PAGO
  const metodosDistribucion: { [key: string]: number } = {};
  let totalPagosVal = 0;

  pagosData.forEach((p) => {
    const metodos = p.metodos_pago;
    const metodoNombre = (Array.isArray(metodos) ? metodos[0]?.nombre : metodos?.nombre) || 'Otros';
    metodosDistribucion[metodoNombre] = (metodosDistribucion[metodoNombre] || 0) + p.monto;
    totalPagosVal += p.monto;
  });

  const metodosStats = Object.keys(metodosDistribucion).map((key) => {
    const valor = metodosDistribucion[key];
    const porcentaje = totalPagosVal > 0 ? (valor / totalPagosVal) * 100 : 0;
    return { name: key, value: valor, percentage: porcentaje };
  }).sort((a, b) => b.value - a.value);

  // Colores para el Pie Chart / Barras
  const colors = [
    'bg-zinc-950 dark:bg-white text-zinc-950 dark:text-white',
    'bg-emerald-600 dark:bg-emerald-500 text-emerald-600',
    'bg-blue-600 dark:bg-blue-500 text-blue-600',
    'bg-amber-500 dark:bg-amber-400 text-amber-500',
    'bg-rose-600 dark:bg-rose-500 text-rose-600'
  ];

  // 3. AGRUPAR MOVIMIENTOS POR MES (GRÁFICO DE BARRAS)
  const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const monthlyData: { [key: string]: { ingreso: number; egreso: number } } = {};

  // Inicializar últimos 6 meses
  const ultimosMeses = [];
  const fechaActual = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(fechaActual.getFullYear(), fechaActual.getMonth() - i, 1);
    const key = `${mesesNombres[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`;
    ultimosMeses.push(key);
    monthlyData[key] = { ingreso: 0, egreso: 0 };
  }

  movimientosData.forEach((m) => {
    const f = new Date(m.fecha);
    const key = `${mesesNombres[f.getMonth()]} ${f.getFullYear().toString().substring(2)}`;
    if (key in monthlyData) {
      if (m.tipo === 'INGRESO') {
        monthlyData[key].ingreso += m.monto;
      } else {
        monthlyData[key].egreso += m.monto;
      }
    }
  });

  // Sumar gastos pagados al mes correspondiente
  gastos.forEach((g) => {
    if (g.estado === 'PAGADO') {
      const f = new Date(g.fecha_pago || g.fecha_programada);
      const key = `${mesesNombres[f.getMonth()]} ${f.getFullYear().toString().substring(2)}`;
      if (key in monthlyData) {
        const monto = Number(g.monto_final !== null && g.monto_final !== undefined ? g.monto_final : g.monto_estimado);
        monthlyData[key].egreso += monto;
      }
    }
  });

  const maxMensual = Math.max(
    ...ultimosMeses.map((key) => Math.max(monthlyData[key].ingreso, monthlyData[key].egreso)),
    100 // default min height scale
  );

  // Programar nuevo gasto
  const handleCrearGasto = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setFormError(null);
    const formData = new FormData(e.currentTarget);
    const res = await crearGasto(formData);
    setLoading(false);
    if (res.error) {
      setFormError(res.error);
    } else {
      setIsNewGastoModalOpen(false);
      router.refresh();
    }
  };

  // Confirmar Pago de Gasto
  const handleConfirmarPagoGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGastoParaPagar) return;
    setLoading(true);
    setFormError(null);

    const monto = parseFloat(montoFinalPago);
    if (isNaN(monto) || monto < 0) {
      setFormError('El monto final debe ser un número positivo mayor o igual a 0.');
      setLoading(false);
      return;
    }

    const res = await pagarGasto(selectedGastoParaPagar.id_gasto, monto);
    setLoading(false);
    if (res.error) {
      setFormError(res.error);
    } else {
      setSelectedGastoParaPagar(null);
      setMontoFinalPago('');
      router.refresh();
    }
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div suppressHydrationWarning className="space-y-6 animate-pulse p-2 sm:p-4">
        <div suppressHydrationWarning className="h-32 rounded-2xl bg-zinc-200/60 dark:bg-zinc-850" />
        <div suppressHydrationWarning className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div suppressHydrationWarning className="h-28 rounded-2xl bg-zinc-200/60 dark:bg-zinc-850" />
          <div suppressHydrationWarning className="h-28 rounded-2xl bg-zinc-200/60 dark:bg-zinc-850" />
          <div suppressHydrationWarning className="h-28 rounded-2xl bg-zinc-200/60 dark:bg-zinc-850" />
        </div>
        <div suppressHydrationWarning className="h-[400px] rounded-2xl bg-zinc-200/60 dark:bg-zinc-850" />
      </div>
    );
  }

  return (
    <div suppressHydrationWarning className="space-y-6">
      {/* Header Panel */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 p-6 shadow-md border border-zinc-200/10 sm:p-8 dark:border-zinc-800">
        <div className="absolute right-0 top-0 -mr-20 -mt-20 h-80 w-80 rounded-full bg-zinc-700/10 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Control Financiero</h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Panel de tesorería y analíticas contables. Monitorea ingresos, egresos y el calendario de cuentas por pagar.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleAbrirModalExportacion}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <span className="text-sm">📊</span>
              <span>Exportar Contabilidad (Excel / CSV)</span>
            </button>
            <button
              onClick={() => setIsNewGastoModalOpen(true)}
              className="inline-flex items-center gap-1.5 bg-white text-zinc-950 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-zinc-100 transition-colors shadow-sm cursor-pointer"
            >
              <span>+</span>
              <span>Programar Gasto</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Ingresos Históricos */}
        <div className="bg-white rounded-xl p-5 shadow-xs border border-zinc-200/60 dark:bg-zinc-900 dark:border-zinc-850 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Ingresos Totales</span>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">S/ {ingresosTotales.toFixed(2)}</p>
          </div>
          <span className="text-lg">💰</span>
        </div>

        {/* Egresos Históricos */}
        <div className="bg-white rounded-xl p-5 shadow-xs border border-zinc-200/60 dark:bg-zinc-900 dark:border-zinc-850 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Egresos y Gastos Totales</span>
            <p className="text-xl font-bold text-rose-600 dark:text-rose-455">S/ {egresosTotales.toFixed(2)}</p>
            <span className="text-[9px] font-bold text-zinc-400 block">S/ {gastosPagados.toFixed(2)} gastos pagados + S/ {egresosCaja.toFixed(2)} caja</span>
          </div>
          <span className="text-lg">💸</span>
        </div>

        {/* Balance */}
        <div className="bg-white rounded-xl p-5 shadow-xs border border-zinc-200/60 dark:bg-zinc-900 dark:border-zinc-850 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Balance General Neto</span>
            <p className={`text-xl font-bold ${balanceNeto >= 0 ? 'text-zinc-900 dark:text-white' : 'text-rose-600'}`}>
              S/ {balanceNeto.toFixed(2)}
            </p>
          </div>
          <span className="text-lg">⚖️</span>
        </div>

        {/* Cuentas por pagar */}
        <div className="bg-white rounded-xl p-5 shadow-xs border border-zinc-200/60 dark:bg-zinc-900 dark:border-zinc-850 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Gastos Pendientes</span>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">S/ {totalPendientesMonto.toFixed(2)}</p>
            <span className="text-[9px] font-bold text-zinc-400 block">{gastosPendientes.length} programado(s)</span>
          </div>
          <span className="text-lg">🕒</span>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly evolution Bar Chart */}
        <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-xs p-6 dark:bg-zinc-900 dark:border-zinc-850">
          <h2 className="text-sm font-bold text-zinc-850 dark:text-zinc-100 mb-6">Evolución Mensual (Ingresos vs Egresos)</h2>
          <div className="flex h-56 items-end justify-between gap-2.5 pt-4 px-2">
            {ultimosMeses.map((key) => {
              const val = monthlyData[key];
              const hIngreso = (val.ingreso / maxMensual) * 100;
              const hEgreso = (val.egreso / maxMensual) * 100;
              return (
                <div key={key} className="flex flex-col items-center flex-1 space-y-2.5 h-full justify-end">
                  <div className="flex gap-1.5 w-full items-end justify-center h-full max-h-[80%]">
                    {/* Ingresos bar */}
                    <div
                      style={{ height: `${hIngreso}%` }}
                      className="w-3 bg-emerald-500 rounded-t-sm transition-all hover:bg-emerald-600 relative group cursor-pointer"
                      title={`Ingresos: S/ ${val.ingreso.toFixed(2)}`}
                    ></div>
                    {/* Egresos bar */}
                    <div
                      style={{ height: `${hEgreso}%` }}
                      className="w-3 bg-rose-500 rounded-t-sm transition-all hover:bg-rose-600 relative group cursor-pointer"
                      title={`Egresos: S/ ${val.egreso.toFixed(2)}`}
                    ></div>
                  </div>
                  <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500">{key}</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 justify-center pt-5 text-[10px] font-bold">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
              <span className="text-zinc-500">Ingresos</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span>
              <span className="text-zinc-500">Egresos</span>
            </div>
          </div>
        </div>

        {/* Payment Methods Distribution Pie Chart */}
        <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-xs p-6 dark:bg-zinc-900 dark:border-zinc-850">
          <h2 className="text-sm font-bold text-zinc-850 dark:text-zinc-100 mb-6">Distribución por Método de Pago</h2>
          {metodosStats.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center justify-around h-56 gap-6">
              {/* Progress listing */}
              <div className="space-y-3.5 w-full sm:max-w-xs">
                {metodosStats.map((item, idx) => {
                  const colorClass = colors[idx % colors.length];
                  return (
                    <div key={item.name} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-zinc-650 dark:text-zinc-350">
                        <span className="flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${colorClass.split(' ')[0]}`}></span>
                          {item.name}
                        </span>
                        <span>S/ {item.value.toFixed(2)} ({item.percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${item.percentage}%` }}
                          className={`h-full rounded-full ${colorClass.split(' ')[0]}`}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-500 text-xs">
              No hay transacciones registradas para analizar.
            </div>
          )}
        </div>
      </div>

      {/* Accounts Payable List */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-xs overflow-hidden dark:bg-zinc-900 dark:border-zinc-850">
        <div className="p-5 border-b border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-bold text-zinc-850 dark:text-zinc-100">Calendario de Cuentas por Pagar (Gastos Programados)</h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">Controla y liquida las facturas o egresos programados para el local.</p>
          </div>
        </div>

        {gastos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-850 text-zinc-400 font-bold border-b border-zinc-150 dark:border-zinc-800">
                  <th className="p-4 uppercase tracking-wider">Gasto / Categoría</th>
                  <th className="p-4 uppercase tracking-wider">Fecha Programada</th>
                  <th className="p-4 uppercase tracking-wider">Importe</th>
                  <th className="p-4 uppercase tracking-wider">Estado</th>
                  <th className="p-4 uppercase tracking-wider">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
                {gastos.map((g) => {
                  let badge = '';
                  if (g.estado === 'PENDIENTE') {
                    badge = 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400';
                  } else if (g.estado === 'PAGADO') {
                    badge = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400';
                  } else {
                    badge = 'bg-zinc-100 text-zinc-650 dark:bg-zinc-800 dark:text-zinc-400';
                  }

                  const isOverdue = g.estado === 'PENDIENTE' && new Date(g.fecha_programada + 'T00:00:00') < new Date(new Date().setHours(0,0,0,0));

                  return (
                    <tr key={g.id_gasto} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-850/10">
                      <td className="p-4">
                        <div className="font-semibold text-zinc-800 dark:text-zinc-200">{g.concepto}</div>
                        <div className="text-[10px] text-zinc-450 dark:text-zinc-500 mt-0.5">
                          Categoría: {g.categorias_gasto?.nombre || 'General'}
                          {g.descripcion && ` — ${g.descripcion}`}
                        </div>
                      </td>
                      <td className="p-4 font-semibold text-zinc-600 dark:text-zinc-400">
                        {new Date(g.fecha_programada + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                        {isOverdue && (
                          <span className="block text-[9px] font-black text-rose-500 mt-0.5">⚠️ VENCIDO/ATRASADO</span>
                        )}
                      </td>
                      <td className="p-4 font-black text-zinc-850 dark:text-zinc-100">
                        S/ {(g.estado === 'PAGADO' ? g.monto_final : g.monto_estimado)?.toFixed(2)}
                      </td>
                      <td className="p-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-md font-bold ${badge}`}>
                          {g.estado}
                        </span>
                      </td>
                      <td className="p-4">
                        {g.estado === 'PENDIENTE' ? (
                          <button
                            onClick={() => {
                              setSelectedGastoParaPagar(g);
                              setMontoFinalPago(g.monto_estimado.toString());
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400 font-bold px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer text-xs"
                            title="Marcar gasto como pagado / cancelado"
                          >
                            Marcar Pagado
                          </button>
                        ) : (
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold">
                            Pagado el {g.fecha_pago ? new Date(g.fecha_pago + 'T00:00:00').toLocaleDateString() : ''}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-zinc-500">
            <p className="text-sm font-semibold">No hay gastos programados registrados.</p>
          </div>
        )}
      </div>

      {/* ----------------- MODAL CREAR GASTO ----------------- */}
      {isNewGastoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-850">
            <div className="px-6 py-5 border-b border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 flex justify-between items-center">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-50">Programar Nuevo Gasto</h3>
              <button
                onClick={() => setIsNewGastoModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleCrearGasto} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Categoría</label>
                <select
                  name="id_categoria"
                  className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-850 dark:text-zinc-50 focus:outline-none"
                >
                  <option value="">Sin Categoría / General</option>
                  {categorias.map((c) => (
                    <option key={c.id_categoria} value={c.id_categoria}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Concepto / Nombre *</label>
                <input
                  type="text"
                  name="concepto"
                  required
                  placeholder="Ej. Alquiler Local del mes..."
                  className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-850 dark:text-zinc-50 focus:outline-none placeholder-zinc-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Descripción</label>
                <textarea
                  name="descripcion"
                  rows={2}
                  className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-850 dark:text-zinc-50 focus:outline-none"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Monto Estimado (S/) *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="monto_estimado"
                    required
                    placeholder="0.00"
                    className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-850 dark:text-zinc-50 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Fecha Programada *</label>
                  <input
                    type="date"
                    name="fecha_programada"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-850 dark:text-zinc-50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-150 dark:border-zinc-850 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewGastoModalOpen(false)}
                  className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-750 dark:text-zinc-200 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-zinc-900 hover:bg-zinc-850 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 px-5 py-2.5 rounded-xl text-xs font-black cursor-pointer"
                >
                  {loading ? 'Programando...' : 'Programar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL CONFIRMAR PAGO DE GASTO ----------------- */}
      {selectedGastoParaPagar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-850">
            <div className="px-6 py-5 border-b border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-50">Marcar Gasto como Pagado</h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Control administrativo (no afecta la caja del día)</p>
              </div>
              <button
                onClick={() => setSelectedGastoParaPagar(null)}
                className="text-zinc-400 hover:text-zinc-600 transition-colors p-1 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleConfirmarPagoGasto} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Gasto Seleccionado</span>
                <p className="font-bold text-sm text-zinc-800 dark:text-zinc-100">{selectedGastoParaPagar.concepto}</p>
                <p className="text-xs text-zinc-500 leading-relaxed">{selectedGastoParaPagar.descripcion || 'Sin descripción adicional.'}</p>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-850/55 p-3.5 rounded-xl border border-zinc-200/50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 block uppercase">Estimado Inicial</span>
                  <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">S/ {selectedGastoParaPagar.monto_estimado.toFixed(2)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-zinc-400 block uppercase">Fecha Programada</span>
                  <span className="font-semibold text-xs text-zinc-700 dark:text-zinc-300">{selectedGastoParaPagar.fecha_programada}</span>
                </div>
              </div>

              <div className="space-y-2 text-center pt-2">
                <label className="text-xs font-bold text-zinc-450 uppercase block">¿Monto Final Liquidado / Pagado?</label>
                <div className="relative max-w-xs mx-auto">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-450 dark:text-zinc-500 font-extrabold text-lg">S/</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={montoFinalPago}
                    onChange={(e) => setMontoFinalPago(e.target.value)}
                    className="w-full text-center bg-zinc-50 border border-zinc-250 dark:bg-zinc-850 dark:border-zinc-800 rounded-2xl py-3 pl-8 pr-4 font-black text-lg text-zinc-850 dark:text-zinc-50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-150 dark:border-zinc-850 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedGastoParaPagar(null)}
                  className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-850 dark:hover:bg-zinc-750 dark:text-zinc-200 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400 px-5 py-2.5 rounded-xl text-xs font-black cursor-pointer"
                >
                  {loading ? 'Guardando...' : 'Confirmar como Pagado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL EXPORTACIÓN CONTABLE EXCEL / CSV ----------------- */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-850 max-h-[90vh] flex flex-col">
            {/* Header del Modal */}
            <div className="px-6 py-5 border-b border-zinc-150 dark:border-zinc-850 bg-gradient-to-r from-emerald-950/10 via-zinc-50 to-emerald-950/10 dark:from-emerald-950/30 dark:via-zinc-900 dark:to-emerald-950/30 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">📊</span>
                <div>
                  <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-50">
                    Exportación Contable Mensual
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    Genera el consolidado de ingresos, egresos y arqueos de caja para el contador (Excel / CSV / WhatsApp).
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-1 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenido scrolleable */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* Selector de Período */}
              <div className="bg-zinc-50 dark:bg-zinc-850/50 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 space-y-3">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Seleccionar Mes y Año Contable
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[140px]">
                    <label className="text-[10px] font-semibold text-zinc-500 block mb-1">Mes</label>
                    <select
                      value={exportMonth}
                      onChange={(e) => handleCambiarMesExportacion(parseInt(e.target.value), exportYear)}
                      className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none"
                    >
                      {[
                        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                      ].map((nombre, idx) => (
                        <option key={idx + 1} value={idx + 1}>
                          {nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-28">
                    <label className="text-[10px] font-semibold text-zinc-500 block mb-1">Año</label>
                    <select
                      value={exportYear}
                      onChange={(e) => handleCambiarMesExportacion(exportMonth, parseInt(e.target.value))}
                      className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none"
                    >
                      {[2024, 2025, 2026, 2027, 2028].map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Atajos Rápidos */}
                  <div className="flex items-end gap-2 pt-4 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        handleCambiarMesExportacion(now.getMonth() + 1, now.getFullYear());
                      }}
                      className="bg-zinc-200/80 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-bold px-3 py-2 rounded-xl transition-all cursor-pointer"
                    >
                      Este Mes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const mesAnt = now.getMonth() === 0 ? 12 : now.getMonth();
                        const anioAnt = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
                        handleCambiarMesExportacion(mesAnt, anioAnt);
                      }}
                      className="bg-zinc-200/80 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-bold px-3 py-2 rounded-xl transition-all cursor-pointer"
                    >
                      Mes Anterior
                    </button>
                  </div>
                </div>
              </div>

              {/* Estado de carga */}
              {exportLoading && (
                <div className="py-8 text-center text-zinc-400 space-y-2">
                  <div className="inline-block animate-spin text-xl">⏳</div>
                  <p className="text-xs font-medium">Consolidando libro de ingresos, gastos y arqueos del mes...</p>
                </div>
              )}

              {/* Mensaje de Error */}
              {exportError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold">
                  ⚠️ {exportError}
                </div>
              )}

              {/* Vista Previa de Cifras Contables */}
              {!exportLoading && exportReporte && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-800 dark:text-zinc-200 text-xs">
                      Resumen Preliminar: {exportReporte.periodo.nombreMes} {exportReporte.periodo.año}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      Rango: {exportReporte.periodo.fechaInicio} al {exportReporte.periodo.fechaFin}
                    </span>
                  </div>

                  {/* Grid de 4 KPIs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/30 rounded-xl p-3">
                      <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide block">
                        Ingresos Totales
                      </span>
                      <p className="text-base font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                        S/ {exportReporte.totales.ingresos.toFixed(2)}
                      </p>
                      <span className="text-[9px] text-emerald-600/80 block mt-0.5">
                        {exportReporte.ingresos.length} transacción(es)
                      </span>
                    </div>

                    <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/30 rounded-xl p-3">
                      <span className="text-[9px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wide block">
                        Egresos Totales
                      </span>
                      <p className="text-base font-black text-rose-700 dark:text-rose-300 mt-0.5">
                        S/ {exportReporte.totales.egresos.toFixed(2)}
                      </p>
                      <span className="text-[9px] text-rose-600/80 block mt-0.5">
                        Gastos liquidados
                      </span>
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide block">
                        Balance Neto
                      </span>
                      <p className={`text-base font-black mt-0.5 ${exportReporte.totales.balanceNeto >= 0 ? 'text-zinc-900 dark:text-white' : 'text-rose-600'}`}>
                        S/ {exportReporte.totales.balanceNeto.toFixed(2)}
                      </p>
                      <span className="text-[9px] text-zinc-400 block mt-0.5">
                        Utilidad del mes
                      </span>
                    </div>

                    <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 rounded-xl p-3">
                      <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide block">
                        Gastos Pendientes
                      </span>
                      <p className="text-base font-black text-amber-700 dark:text-amber-300 mt-0.5">
                        S/ {exportReporte.totales.gastosPendientes.toFixed(2)}
                      </p>
                      <span className="text-[9px] text-amber-600/80 block mt-0.5">
                        Por liquidar
                      </span>
                    </div>
                  </div>

                  {/* Desglose por métodos de pago */}
                  {exportReporte.distribucionMetodosPago.length > 0 && (
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-850/40 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">
                        Distribución por Método de Pago en el Mes
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {exportReporte.distribucionMetodosPago.map((m) => (
                          <div
                            key={m.metodo}
                            className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2.5 py-1 rounded-lg text-[11px] font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5"
                          >
                            <span>💳 {m.metodo}:</span>
                            <span className="text-emerald-600 dark:text-emerald-400">S/ {m.total.toFixed(2)}</span>
                            <span className="text-zinc-400 text-[9px]">({m.porcentaje.toFixed(0)}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Información de compatibilidad con Excel */}
                  <div className="flex items-start gap-2 p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 rounded-xl text-[11px] text-blue-800 dark:text-blue-300 font-medium">
                    <span className="text-sm">💡</span>
                    <div>
                      El archivo exportado incluye codificación <strong>UTF-8 BOM</strong> y formato contable estándar.
                      Se abre con doble clic directamente en <strong>Microsoft Excel</strong>, Google Sheets y LibreOffice sin distorsión de tildes ni caracteres.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer con Acciones de Descarga */}
            <div className="px-6 py-4 border-t border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-900/80 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleCopiarWhatsApp}
                  disabled={!exportReporte || exportLoading}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-100 px-4 py-2.5 rounded-xl font-bold transition-colors cursor-pointer disabled:opacity-40"
                  title="Copia el resumen contable formateado para enviar por WhatsApp o Email"
                >
                  <span>{copiedSuccess ? '✅' : '📋'}</span>
                  <span>{copiedSuccess ? '¡Copiado al Portapapeles!' : 'Copiar Resumen WhatsApp'}</span>
                </button>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 px-4 py-2.5 rounded-xl font-bold cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={handleDescargarExcel}
                  disabled={!exportReporte || exportLoading}
                  className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-40"
                >
                  <span>📥</span>
                  <span>Descargar Excel (.xlsx)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

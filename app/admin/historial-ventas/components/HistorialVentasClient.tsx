'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { obtenerVentasReportePorDia, subirComprobanteVenta, ReporteVentaItem } from '@/app/actions/ventas_productos';
import { descargarArchivoCSV, generarCSVVentasDia } from '@/utils/exportadorContable';
import { useModalAlert } from '@/context/ModalAlertContext';

interface HistorialVentasClientProps {
  initialVentas: ReporteVentaItem[];
  initialFecha: string;
}

export default function HistorialVentasClient({
  initialVentas,
  initialFecha
}: HistorialVentasClientProps) {
  const { showAlert, showToast } = useModalAlert();
  const [fecha, setFecha] = useState<string>(initialFecha);
  const [ventas, setVentas] = useState<ReporteVentaItem[]>(initialVentas);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Modales
  const [selectedTicket, setSelectedTicket] = useState<ReporteVentaItem | null>(null);
  const [viewerPhotoUrl, setViewerPhotoUrl] = useState<string | null>(null);
  const [uploadModalItem, setUploadModalItem] = useState<{ id: number; tipo: 'TIENDA' | 'MEMBRESIA'; titulo: string } | null>(null);
  const [newVoucherBase64, setNewVoucherBase64] = useState<string>('');
  const [uploadingVoucher, setUploadingVoucher] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const cargarReporte = async (fechaFiltro: string) => {
    setLoading(true);
    try {
      const data = await obtenerVentasReportePorDia(fechaFiltro);
      setVentas(data);
    } catch (err) {
      console.error('Error al cargar ventas del día:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (newDate: string) => {
    setFecha(newDate);
    cargarReporte(newDate);
  };

  const handleSetToday = () => {
    const today = new Date().toISOString().split('T')[0];
    handleDateChange(today);
  };

  const handleSetYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterday = d.toISOString().split('T')[0];
    handleDateChange(yesterday);
  };

  // Helper para procesar imagen en base64
  const processImageFile = (file: File, callback: (base64: string) => void) => {
    if (!file.type.startsWith('image/')) {
      showAlert({
        title: 'Archivo no compatible',
        message: 'Por favor selecciona un archivo de imagen válido (PNG, JPG, WEBP).',
        type: 'warning'
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        callback(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Subir / actualizar comprobante desde el modal
  const handleGuardarNuevoComprobante = async () => {
    if (!uploadModalItem || !newVoucherBase64) {
      await showAlert({
        title: 'Comprobante Requerido',
        message: 'Por favor selecciona o sube una imagen de comprobante válida.',
        type: 'warning'
      });
      return;
    }
    setUploadingVoucher(true);
    try {
      const res = await subirComprobanteVenta(uploadModalItem.id, uploadModalItem.tipo, newVoucherBase64);
      if (res.error) {
        await showAlert({
          title: 'Error al Guardar',
          message: res.error,
          type: 'danger'
        });
      } else {
        setUploadModalItem(null);
        setNewVoucherBase64('');
        showToast('Comprobante adjuntado con éxito.', 'success');
        await cargarReporte(fecha);
      }
    } catch (e) {
      console.error(e);
      await showAlert({
        title: 'Error al Guardar',
        message: 'Ocurrió un error al guardar el comprobante.',
        type: 'danger'
      });
    } finally {
      setUploadingVoucher(false);
    }
  };

  // Filtros y KPIs
  const filteredVentas = ventas.filter((v) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      v.clienteNombre.toLowerCase().includes(q) ||
      (v.clienteDni && v.clienteDni.includes(q)) ||
      v.metodoPago.toLowerCase().includes(q) ||
      v.usuarioNombre.toLowerCase().includes(q) ||
      v.id.toString().includes(q)
    );
  });

  const totalDiaRecaudado = ventas.reduce((sum, v) => sum + v.total, 0);
  const totalEfectivo = ventas.filter((v) => v.metodoPago.toLowerCase().includes('efectivo')).reduce((sum, v) => sum + v.total, 0);
  const totalYape = ventas.filter((v) => v.metodoPago.toLowerCase().includes('yape')).reduce((sum, v) => sum + v.total, 0);
  const totalPlin = ventas.filter((v) => v.metodoPago.toLowerCase().includes('plin')).reduce((sum, v) => sum + v.total, 0);
  const totalStripe = ventas.filter((v) => v.metodoPago.toLowerCase().includes('stripe')).reduce((sum, v) => sum + v.total, 0);
  const ventasPendientesFoto = ventas.filter((v) => ['yape', 'plin'].includes(v.metodoPago.toLowerCase()) && !v.comprobanteUrl).length;

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 p-6 shadow-md border border-zinc-200/10 sm:p-8 dark:border-zinc-800">
        <div className="absolute right-0 top-0 -mr-20 -mt-20 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                Módulo Autorizado: Admin • Caja • Recepción
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl mt-2">
              Historial de Ventas y Comprobantes
            </h1>
            <p className="mt-1 text-xs sm:text-sm leading-relaxed text-zinc-400">
              Auditoría diaria de cobros, verificación de fotos de transferencia (Yape y Plin) y detalles de tickets.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/ventas"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <span>+</span> Nueva Venta / Cobro
            </Link>
          </div>
        </div>
      </div>

      {/* FILTROS DE FECHA Y RESUMEN KPI */}
      <div className="bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-850 rounded-2xl shadow-xs p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="font-bold text-zinc-900 dark:text-zinc-50 text-base">Filtrar por Día</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Consulta las transacciones y estado de fotos del día seleccionado.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={fecha}
              onChange={(e) => handleDateChange(e.target.value)}
              className="bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none"
            />
            <button
              onClick={handleSetToday}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-xs"
            >
              Hoy
            </button>
            <button
              onClick={handleSetYesterday}
              className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer"
            >
              Ayer
            </button>
            <button
              onClick={() => cargarReporte(fecha)}
              className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer"
              title="Refrescar datos"
            >
              🔄
            </button>
            <button
              onClick={() => {
                const csv = generarCSVVentasDia(filteredVentas, fecha);
                descargarArchivoCSV(csv, `Ventas_Gym_${fecha}.csv`);
              }}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
              title="Descargar detalle del día en Excel / CSV"
            >
              <span>📥</span>
              <span>Exportar Día (Excel)</span>
            </button>
          </div>
        </div>

        {/* ALERTA DE COMPROBANTES PENDIENTES */}
        {ventasPendientesFoto > 0 && (
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-850 dark:text-amber-300 font-semibold">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>
                Hay <strong>{ventasPendientesFoto}</strong> cobro(s) con Yape / Plin sin foto de comprobante en este día.
              </span>
            </div>
            <span className="text-[10px] bg-amber-200 dark:bg-amber-900/60 px-2 py-0.5 rounded-md font-bold uppercase">
              Requiere Atención
            </span>
          </div>
        )}

        {/* KPI TILES DEL DÍA */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          <div className="bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 p-3.5 rounded-xl">
            <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
              Total Recaudado
            </span>
            <span className="text-base font-black text-blue-950 dark:text-blue-100 mt-1 block">
              S/ {totalDiaRecaudado.toFixed(2)}
            </span>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-850/60 border border-zinc-150 dark:border-zinc-850 p-3.5 rounded-xl">
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">
              Efectivo
            </span>
            <span className="text-sm font-black text-zinc-800 dark:text-zinc-100 mt-1 block">
              S/ {totalEfectivo.toFixed(2)}
            </span>
          </div>
          <div className="bg-purple-50/70 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 p-3.5 rounded-xl">
            <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
              Yape
            </span>
            <span className="text-sm font-black text-purple-950 dark:text-purple-100 mt-1 block">
              S/ {totalYape.toFixed(2)}
            </span>
          </div>
          <div className="bg-cyan-50/70 dark:bg-cyan-950/20 border border-cyan-100 dark:border-cyan-900/30 p-3.5 rounded-xl">
            <span className="text-[9px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider block">
              Plin
            </span>
            <span className="text-sm font-black text-cyan-950 dark:text-cyan-100 mt-1 block">
              S/ {totalPlin.toFixed(2)}
            </span>
          </div>
          <div className="bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 p-3.5 rounded-xl">
            <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
              Stripe
            </span>
            <span className="text-sm font-black text-indigo-950 dark:text-indigo-100 mt-1 block">
              S/ {totalStripe.toFixed(2)}
            </span>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-850/60 border border-zinc-150 dark:border-zinc-850 p-3.5 rounded-xl">
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">
              Nº Operaciones
            </span>
            <span className="text-sm font-black text-zinc-800 dark:text-zinc-100 mt-1 block">
              {ventas.length} Tickets
            </span>
          </div>
        </div>
      </div>

      {/* TABLA DE VENTAS DEL DÍA */}
      <div className="bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-850 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-zinc-150 dark:border-zinc-850 flex justify-between items-center gap-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por cliente, DNI, método de pago o Ticket ID..."
            className="w-full max-w-sm bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-800 dark:text-zinc-50 focus:outline-none"
          />
          <span className="text-xs text-zinc-400 font-semibold hidden sm:inline">
            Mostrando {filteredVentas.length} de {ventas.length} registros
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-blue-600 border-t-transparent"></div>
            <p className="mt-2 text-xs text-zinc-400 font-semibold">Cargando reporte de ventas...</p>
          </div>
        ) : filteredVentas.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-850/60 text-zinc-400 font-bold border-b border-zinc-150 dark:border-zinc-850">
                  <th className="p-4 uppercase tracking-wider">Ticket</th>
                  <th className="p-4 uppercase tracking-wider">Tipo</th>
                  <th className="p-4 uppercase tracking-wider">Hora</th>
                  <th className="p-4 uppercase tracking-wider">Cliente</th>
                  <th className="p-4 uppercase tracking-wider">Atendido por</th>
                  <th className="p-4 uppercase tracking-wider">Método de Pago</th>
                  <th className="p-4 uppercase tracking-wider">Comprobante Foto</th>
                  <th className="p-4 uppercase tracking-wider text-right">Total</th>
                  <th className="p-4 uppercase tracking-wider text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
                {filteredVentas.map((v) => {
                  const isYapeOrPlin = ['yape', 'plin'].includes(v.metodoPago.toLowerCase());
                  const hasVoucher = !!v.comprobanteUrl;

                  return (
                    <tr key={`${v.tipoVenta}-${v.id}`} className="hover:bg-zinc-50/40 dark:hover:bg-zinc-850/20">
                      <td className="p-4 font-black text-zinc-800 dark:text-zinc-200">
                        #{v.id}
                      </td>
                      <td className="p-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-md font-black text-[9px] uppercase ${
                          v.tipoVenta === 'MEMBRESIA'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          {v.tipoVenta === 'MEMBRESIA' ? 'Membresía' : 'Tienda'}
                        </span>
                      </td>
                      <td className="p-4 text-zinc-500 font-medium whitespace-nowrap">
                        {new Date(v.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-4 font-bold text-zinc-800 dark:text-zinc-200">
                        <div>{v.clienteNombre}</div>
                        {v.clienteDni && <div className="text-[10px] text-zinc-400 font-normal">DNI: {v.clienteDni}</div>}
                      </td>
                      <td className="p-4 text-zinc-600 dark:text-zinc-400 font-medium">
                        {v.usuarioNombre}
                      </td>
                      <td className="p-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-md font-bold text-[10px] ${
                          v.metodoPago.toLowerCase().includes('yape') ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
                          v.metodoPago.toLowerCase().includes('plin') ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300' :
                          v.metodoPago.toLowerCase().includes('stripe') ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' :
                          'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                        }`}>
                          {v.metodoPago}
                        </span>
                      </td>
                      
                      {/* ESTADO DE COMPROBANTE DE YAPE / PLIN */}
                      <td className="p-4">
                        {isYapeOrPlin ? (
                          hasVoucher ? (
                            <button
                              onClick={() => setViewerPhotoUrl(v.comprobanteUrl!)}
                              className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 px-2.5 py-1 rounded-lg text-[10px] font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
                              title="Ver captura de pantalla del voucher"
                            >
                              <span>📷</span> Ver Voucher
                            </button>
                          ) : (
                            <button
                              onClick={() => setUploadModalItem({ id: v.id, tipo: v.tipoVenta, titulo: `Ticket #${v.id} - ${v.clienteNombre}` })}
                              className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/40 px-2.5 py-1 rounded-lg text-[10px] font-bold hover:bg-amber-100 transition-colors cursor-pointer animate-pulse"
                              title="Pago Yape/Plin sin foto. Haz clic para subir el comprobante"
                            >
                              <span>⚠️</span> Subir Foto
                            </button>
                          )
                        ) : (
                          <span className="text-zinc-400 text-[10px] font-medium">No requerido</span>
                        )}
                      </td>

                      <td className="p-4 font-black text-right text-zinc-900 dark:text-zinc-100">
                        S/ {v.total.toFixed(2)}
                      </td>

                      <td className="p-4 text-center">
                        <button
                          onClick={() => setSelectedTicket(v)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-xs"
                        >
                          Ver Detalle
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-zinc-400 text-xs">
            No se encontraron ventas para el día {fecha}.
          </div>
        )}
      </div>

      {/* ----------------- MODAL VER DETALLE / TICKET ----------------- */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-850">
            <div className="px-6 py-5 border-b border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-50">
                  Detalle del Ticket #{selectedTicket.id}
                </h3>
                <span className="text-[10px] text-zinc-400 font-medium">
                  {new Date(selectedTicket.fecha).toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-zinc-400 hover:text-zinc-600 transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-4 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-150/40 dark:border-zinc-850">
                <div>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase block">Cliente</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-100">{selectedTicket.clienteNombre}</span>
                  {selectedTicket.clienteDni && <div className="text-[10px] text-zinc-500">DNI: {selectedTicket.clienteDni}</div>}
                </div>
                <div>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase block">Atendido por</span>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">{selectedTicket.usuarioNombre}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase block">Método de Pago</span>
                  <span className="font-bold text-blue-600">{selectedTicket.metodoPago}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase block">Tipo de Venta</span>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">{selectedTicket.tipoVenta}</span>
                </div>
              </div>

              {/* LISTA DE ITEMS / PRODUCTOS */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Desglose de Productos / Membresía:
                </span>
                <div className="border border-zinc-150 dark:border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-850">
                  {selectedTicket.detalles.map((d, i) => (
                    <div key={i} className="p-3 flex justify-between items-center bg-white dark:bg-zinc-900">
                      <div>
                        <p className="font-bold text-zinc-850 dark:text-zinc-200">{d.nombre}</p>
                        <p className="text-[10px] text-zinc-400">{d.cantidad} x S/ {d.precioUnitario.toFixed(2)}</p>
                      </div>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">S/ {d.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center text-sm font-black p-3 bg-blue-50/60 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <span>Total Cobrado:</span>
                <span className="text-blue-600 text-base">S/ {selectedTicket.total.toFixed(2)}</span>
              </div>

              {/* FOTO VOUCHER SI EXISTE */}
              {selectedTicket.comprobanteUrl && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Comprobante de Transferencia Adjunto:
                  </span>
                  <div className="border border-zinc-200 dark:border-zinc-850 rounded-xl overflow-hidden p-2 bg-zinc-50 dark:bg-zinc-950">
                    <img src={selectedTicket.comprobanteUrl} alt="Comprobante" className="w-full max-h-52 object-contain rounded-lg" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- MODAL VER FOTO / ZOOM VOUCHER ----------------- */}
      {viewerPhotoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 max-w-lg w-full rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-850">
            <div className="px-6 py-4 border-b border-zinc-150 dark:border-zinc-850 flex justify-between items-center">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">Comprobante de Pago Yape / Plin</h3>
              <button onClick={() => setViewerPhotoUrl(null)} className="text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer">
                ✕
              </button>
            </div>
            <div className="p-6 flex justify-center bg-zinc-950">
              <img src={viewerPhotoUrl} alt="Comprobante Completo" className="max-h-[70vh] object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}

      {/* ----------------- MODAL SUBIR COMPROBANTE PENDIENTE ----------------- */}
      {uploadModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 max-w-md w-full rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-850">
            <div className="px-6 py-4 border-b border-zinc-150 dark:border-zinc-850 flex justify-between items-center">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">Subir Comprobante Yape/Plin</h3>
              <button onClick={() => setUploadModalItem(null)} className="text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer">
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <p className="text-zinc-500 font-semibold">{uploadModalItem.titulo}</p>
              
              <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 p-6 rounded-2xl text-center space-y-3">
                {newVoucherBase64 ? (
                  <div className="space-y-2">
                    <img src={newVoucherBase64} alt="Voucher" className="w-full max-h-48 object-contain rounded-lg mx-auto" />
                    <button
                      onClick={() => setNewVoucherBase64('')}
                      className="text-rose-600 font-bold hover:underline text-[10px] cursor-pointer"
                    >
                      Elegir otra imagen
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) processImageFile(file, (b64) => setNewVoucherBase64(b64));
                      }}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold transition-colors cursor-pointer shadow-xs"
                    >
                      📷 Seleccionar Foto de Voucher
                    </button>
                    <p className="text-[10px] text-zinc-400 mt-2">Formatos JPG, PNG, WEBP o captura de pantalla</p>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setUploadModalItem(null);
                    setNewVoucherBase64('');
                  }}
                  className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-850 dark:hover:bg-zinc-800 dark:text-zinc-200 px-4 py-2 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  disabled={!newVoucherBase64 || uploadingVoucher}
                  onClick={handleGuardarNuevoComprobante}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {uploadingVoucher ? 'Guardando...' : 'Guardar Comprobante'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

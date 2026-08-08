'use client';

import React, { useState, useEffect, useRef } from 'react';
import { buscarClientes, crearCliente } from '@/app/actions/clientes';
import { venderMembresia } from '@/app/actions/membresias';
import { registrarVentaProductos, obtenerVentasReportePorDia, subirComprobanteVenta, ReporteVentaItem } from '@/app/actions/ventas_productos';
import { Cliente, TipoMembresia, MetodoPago, Caja } from '@/types/gym.types';
import { Producto } from '@/app/actions/productos';
import Link from 'next/link';
import { useModalAlert } from '@/context/ModalAlertContext';

interface VentasClientProps {
  cajaActiva: Caja | null;
  planes: TipoMembresia[];
  metodosPago: MetodoPago[];
  preSelectedClient: Cliente | null;
  productos: Producto[];
}

interface PagoItem {
  id_metodo: number;
  monto: number;
  numero_operacion: string;
  comprobante_url?: string;
}

interface CartItem {
  producto: Producto;
  cantidad: number;
}

export default function VentasClient({
  cajaActiva,
  planes,
  metodosPago,
  preSelectedClient,
  productos
}: VentasClientProps) {
  const { showConfirm, showAlert, showToast } = useModalAlert();

  // Modo de Checkout: Venta de Membresía, Venta de Productos (Tienda) o Historial por Día
  const [activeMode, setActiveMode] = useState<'membresia' | 'tienda' | 'reporte'>('membresia');

  // =========================================================================
  // ESTADOS COMUNES
  // =========================================================================
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(preSelectedClient);
  const [saving, setSaving] = useState(false);
  const [saleError, setSaleError] = useState<string | null>(null);
  const [saleSuccess, setSaleSuccess] = useState<boolean>(false);
  const [successSaleId, setSuccessSaleId] = useState<number | null>(null);

  // Estado para garantizar montaje limpio del lado cliente (evita hydration errors de extensiones del navegador)
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Buscador de clientes
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Cliente[]>([]);
  const [searching, setSearching] = useState(false);

  // Métodos de pago sin Stripe
  const metodosPagoDisponibles = metodosPago.filter(m => !m.nombre.toLowerCase().includes('stripe'));

  // Modal registrar cliente rápido
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Ajustamos el estado durante el renderizado para evitar renders en cascada
  const [prevPreSelectedClient, setPrevPreSelectedClient] = useState<Cliente | null>(preSelectedClient);
  if (preSelectedClient !== prevPreSelectedClient) {
    setPrevPreSelectedClient(preSelectedClient);
    setSelectedClient(preSelectedClient);
  }

  // =========================================================================
  // ESTADOS MODULO 1: CHECKOUT MEMBRESÍAS
  // =========================================================================
  const [membresiaStep, setMembresiaStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<TipoMembresia | null>(null);
  const [fechaInicio] = useState(new Date().toISOString().split('T')[0]);
  const [pagos, setPagos] = useState<PagoItem[]>([
    { id_metodo: metodosPagoDisponibles[0]?.id_metodo || metodosPago[0]?.id_metodo || 0, monto: 0, numero_operacion: '', comprobante_url: '' }
  ]);
  const [membresiaVoucher, setMembresiaVoucher] = useState<string>('');

  // =========================================================================
  // ESTADOS MODULO 2: CHECKOUT TIENDA / PRODUCTOS
  // =========================================================================
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tiendaSearch, setTiendaSearch] = useState('');
  const [tiendaCategory, setTiendaCategory] = useState<string>('TODOS');
  const [tiendaPaymentMethod, setTiendaPaymentMethod] = useState<string>('Efectivo');
  const [tiendaOpCode, setTiendaOpCode] = useState<string>('');
  const [tiendaVoucher, setTiendaVoucher] = useState<string>('');
  const [isProductsModalOpen, setIsProductsModalOpen] = useState<boolean>(false);
  const [modalProductSearch, setModalProductSearch] = useState<string>('');
  const [modalStockFilter, setModalStockFilter] = useState<'TODOS' | 'CON_STOCK' | 'POCO_STOCK'>('TODOS');

  // =========================================================================
  // ESTADOS MODULO 3: HISTORIAL Y REPORTE DE VENTAS POR DÍA
  // =========================================================================
  const [reporteFecha, setReporteFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reporteVentas, setReporteVentas] = useState<ReporteVentaItem[]>([]);
  const [loadingReporte, setLoadingReporte] = useState<boolean>(false);
  const [searchReporteQuery, setSearchReporteQuery] = useState<string>('');
  const [selectedTicket, setSelectedTicket] = useState<ReporteVentaItem | null>(null);
  const [viewerPhotoUrl, setViewerPhotoUrl] = useState<string | null>(null);
  const [uploadModalItem, setUploadModalItem] = useState<{ id: number; tipo: 'TIENDA' | 'MEMBRESIA'; titulo: string } | null>(null);
  const [newVoucherBase64, setNewVoucherBase64] = useState<string>('');
  const [uploadingVoucher, setUploadingVoucher] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar reporte de ventas cuando cambia la fecha o el tab
  const cargarReporte = async (fecha?: string) => {
    setLoadingReporte(true);
    try {
      const data = await obtenerVentasReportePorDia(fecha || reporteFecha);
      setReporteVentas(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReporte(false);
    }
  };

  useEffect(() => {
    let isCancelled = false;
    if (activeMode === 'reporte') {
      obtenerVentasReportePorDia(reporteFecha)
        .then((data) => {
          if (!isCancelled) {
            setReporteVentas(data);
          }
        })
        .catch((e) => console.error(e));
    }
    return () => {
      isCancelled = true;
    };
  }, [activeMode, reporteFecha]);

  // Si no hay caja abierta, bloquear checkout
  if (!cajaActiva) {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 pt-12">
        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-rose-900 dark:text-rose-400">Arqueo de Caja Requerido</h2>
          <p className="text-sm text-rose-750 dark:text-rose-300 leading-relaxed">
            No es posible realizar ventas ni cobros si no tienes un turno de caja abierta hoy. Por favor, abre la caja primero.
          </p>
          <div className="pt-2">
            <Link
              href="/admin/caja"
              className="inline-block bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-5 py-3 rounded-xl transition-all shadow-sm shadow-rose-500/10 cursor-pointer"
            >
              Ir a abrir Caja
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // HANDLERS CLIENTES (PASO 1)
  // =========================================================================
  const handleClientSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.trim().length === 0) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await buscarClientes(val);
      setSearchResults(res);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const handleQuickClientSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const res = await crearCliente(formData);
      if (res.error) {
        setFormError(res.error);
      } else {
        setFormSuccess('¡Cliente registrado con éxito!');
        if (res.cliente) {
          setSelectedClient(res.cliente);
        }
        setTimeout(() => {
          setIsNewClientModalOpen(false);
          setFormSuccess(null);
          setFormError(null);
        }, 800);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al registrar');
    }
  };

  // Helper para procesar subida de imágenes a Base64
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

  // =========================================================================
  // HANDLERS CHECKOUT MEMBRESÍA (PASO 2 Y 3)
  // =========================================================================
  const addPagoRow = () => {
    setPagos([...pagos, { id_metodo: metodosPago[0]?.id_metodo || 0, monto: 0, numero_operacion: '', comprobante_url: '' }]);
  };

  const removePagoRow = (idx: number) => {
    setPagos(pagos.filter((_, i) => i !== idx));
  };

  const updatePagoField = (idx: number, field: keyof PagoItem, val: string | number) => {
    const updated = [...pagos];
    if (field === 'monto') {
      updated[idx].monto = parseFloat(val as string) || 0;
    } else if (field === 'id_metodo') {
      updated[idx].id_metodo = parseInt(val as string, 10);
    } else if (field === 'numero_operacion') {
      updated[idx].numero_operacion = val as string;
    } else if (field === 'comprobante_url') {
      updated[idx].comprobante_url = val as string;
    }
    setPagos(updated);
  };

  const totalPagado = pagos.reduce((sum, p) => sum + p.monto, 0);
  const planPrecio = selectedPlan ? selectedPlan.precio : 0;
  const saldoRestante = planPrecio - totalPagado;

  const handleConfirmarVenta = async () => {
    if (!selectedClient || !selectedPlan) return;

    if (Math.abs(saldoRestante) > 0.01) {
      await showAlert({
        title: 'Monto de Pago Incompleto',
        message: `El monto total pagado (S/ ${totalPagado.toFixed(2)}) no coincide con el precio del plan (S/ ${planPrecio.toFixed(2)}). Por favor cuadre los montos de pago.`,
        type: 'warning'
      });
      return;
    }

    setSaving(true);
    setSaleError(null);

    // Ajustar pagos con voucher
    const finalPagos = pagos.map(p => {
      const mObj = metodosPagoDisponibles.find(m => m.id_metodo === p.id_metodo);
      const isYapeOrPlin = mObj && ['yape', 'plin'].includes(mObj.nombre.toLowerCase());
      return {
        ...p,
        comprobante_url: isYapeOrPlin ? (p.comprobante_url || membresiaVoucher || undefined) : undefined
      };
    });

    try {
      const res = await venderMembresia(
        selectedClient.id_cliente,
        selectedPlan.id_tipo,
        planPrecio,
        fechaInicio,
        finalPagos
      );

      if (res.error) {
        setSaleError(res.error);
      } else {
        setSaleSuccess(true);
        if (res.id_membresia) {
          setSuccessSaleId(res.id_membresia);
        }
      }
    } catch (e) {
      setSaleError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  };

  // =========================================================================
  // HANDLERS CHECKOUT TIENDA / PRODUCTOS
  // =========================================================================
  const filteredProducts = productos.filter(p =>
    p.estado === 'ACTIVO' &&
    (p.nombre.toLowerCase().includes(tiendaSearch.toLowerCase()) ||
      (p.codigo_barras && p.codigo_barras.includes(tiendaSearch)))
  );

  const addToCart = (prod: Producto) => {
    const existing = cart.find(c => c.producto.id_producto === prod.id_producto);
    if (existing) {
      if (prod.stock <= existing.cantidad) {
        showToast(`Stock máximo alcanzado para "${prod.nombre}" (${prod.stock} unidades).`, 'warning');
        return;
      }
      setCart(cart.map(c =>
        c.producto.id_producto === prod.id_producto
          ? { ...c, cantidad: c.cantidad + 1 }
          : c
      ));
    } else {
      if (prod.stock <= 0) {
        showToast(`El producto "${prod.nombre}" está agotado.`, 'danger');
        return;
      }
      setCart([...cart, { producto: prod, cantidad: 1 }]);
    }
  };

  const removeFromCart = (idProducto: number) => {
    setCart(cart.filter(c => c.producto.id_producto !== idProducto));
  };

  const updateCartQty = (idProducto: number, cantidad: number) => {
    const item = cart.find(c => c.producto.id_producto === idProducto);
    if (!item) return;

    if (cantidad <= 0) {
      removeFromCart(idProducto);
      return;
    }

    if (item.producto.stock < cantidad) {
      showToast(`Solo quedan ${item.producto.stock} unidades disponibles en inventario.`, 'warning');
      return;
    }

    setCart(cart.map(c =>
      c.producto.id_producto === idProducto
        ? { ...c, cantidad }
        : c
    ));
  };

  const totalTienda = cart.reduce((sum, item) => sum + (item.cantidad * item.producto.precio_venta), 0);

  const handleConfirmarVentaTienda = async () => {
    if (cart.length === 0) return;

    setSaving(true);
    setSaleError(null);

    const items = cart.map(c => ({
      id_producto: c.producto.id_producto,
      cantidad: c.cantidad,
      precio_unitario: c.producto.precio_venta
    }));

    const isYapeOrPlin = ['yape', 'plin'].includes(tiendaPaymentMethod.toLowerCase());

    try {
      const res = await registrarVentaProductos(
        selectedClient ? selectedClient.id_cliente : null,
        items,
        tiendaPaymentMethod,
        tiendaOpCode,
        isYapeOrPlin ? (tiendaVoucher || undefined) : undefined
      );

      if (res.error) {
        setSaleError(res.error);
      } else {
        setSaleSuccess(true);
        if (res.id_venta) {
          setSuccessSaleId(res.id_venta);
        }
      }
    } catch (e) {
      setSaleError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  };

  // =========================================================================
  // SUBIDA DE COMPROBANTE DIRECTO DESDE EL REPORTE
  // =========================================================================
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
        await cargarReporte();
      }
    } catch (e) {
      console.error(e);
      await showAlert({
        title: 'Error al Guardar',
        message: 'Ocurrió un fallo de red al subir el comprobante.',
        type: 'danger'
      });
    } finally {
      setUploadingVoucher(false);
    }
  };

  // =========================================================================
  // RESETEA COMPONENTES / BORRADOR
  // =========================================================================
  const handleResetSale = () => {
    setSelectedClient(null);
    setSelectedPlan(null);
    setCart([]);
    setPagos([{ id_metodo: metodosPagoDisponibles[0]?.id_metodo || metodosPago[0]?.id_metodo || 0, monto: 0, numero_operacion: '', comprobante_url: '' }]);
    setMembresiaStep(1);
    setSaleError(null);
    setSaleSuccess(false);
    setSuccessSaleId(null);
    setMembresiaVoucher('');
    setTiendaVoucher('');
  };

  // =========================================================================
  // FILTRAR REPORTES DE VENTAS DEL DÍA
  // =========================================================================
  const filteredReporteVentas = reporteVentas.filter(v => {
    const q = searchReporteQuery.toLowerCase();
    if (!q) return true;
    return (
      v.clienteNombre.toLowerCase().includes(q) ||
      (v.clienteDni && v.clienteDni.includes(q)) ||
      v.metodoPago.toLowerCase().includes(q) ||
      v.id.toString().includes(q)
    );
  });

  const totalDiaRecaudado = reporteVentas.reduce((sum, v) => sum + v.total, 0);
  const totalEfectivo = reporteVentas.filter(v => v.metodoPago.toLowerCase().includes('efectivo')).reduce((sum, v) => sum + v.total, 0);
  const totalYape = reporteVentas.filter(v => v.metodoPago.toLowerCase().includes('yape')).reduce((sum, v) => sum + v.total, 0);
  const totalPlin = reporteVentas.filter(v => v.metodoPago.toLowerCase().includes('plin')).reduce((sum, v) => sum + v.total, 0);
  const totalStripe = reporteVentas.filter(v => v.metodoPago.toLowerCase().includes('stripe')).reduce((sum, v) => sum + v.total, 0);

  // Skeleton de carga para sincronización de hidratación inicial segura
  if (!mounted) {
    return (
      <div suppressHydrationWarning className="space-y-6 animate-pulse p-2 sm:p-4">
        <div suppressHydrationWarning className="h-32 rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/60" />
        <div suppressHydrationWarning className="h-10 w-80 rounded-xl bg-zinc-200/60 dark:bg-zinc-800/60" />
        <div suppressHydrationWarning className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div suppressHydrationWarning className="lg:col-span-2 h-[550px] rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/60" />
          <div suppressHydrationWarning className="h-[550px] rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/60" />
        </div>
      </div>
    );
  }

  // =========================================================================
  // PANTALLA ÉXITO
  // =========================================================================
  if (saleSuccess) {
    return (
      <div suppressHydrationWarning className="max-w-md mx-auto text-center space-y-6 pt-12">
        <div suppressHydrationWarning className="bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-emerald-500"></div>

          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 animate-bounce">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">¡Venta Procesada!</h2>

          <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-150/50 dark:border-zinc-850 text-xs text-zinc-600 dark:text-zinc-400 mt-4 leading-relaxed font-semibold">
            El cobro se ha validado y se ha registrado el ingreso en la caja diaria activa. El comprobante virtual #{successSaleId || 'N/A'} ha sido emitido.
          </div>

          <div className="pt-6 flex flex-col gap-2.5">
            <button
              onClick={handleResetSale}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 py-3.5 rounded-xl text-xs font-black transition-all cursor-pointer"
            >
              Iniciar Nueva Venta
            </button>
            <Link
              href="/admin/historial-ventas"
              className="bg-zinc-100 hover:bg-zinc-200/80 text-zinc-800 dark:bg-zinc-850 dark:hover:bg-zinc-800 dark:text-zinc-200 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
            >
              Ir al Módulo de Historial de Ventas
            </Link>
          </div>
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
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Punto de Venta y Cobros</h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Inscripciones de membresías, venta de suplementos y control detallado de comprobantes (Yape, Plin, Efectivo y Stripe).
            </p>
          </div>
        </div>
      </div>

      {/* Selector de Modo (Membresías vs. Tienda vs. Historial por Día) */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-850 overflow-x-auto">
        <button
          onClick={() => {
            setActiveMode('membresia');
            setSaleError(null);
          }}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${activeMode === 'membresia'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-extrabold'
              : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
            }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
          </svg>
          Cobro de Membresías
        </button>
        <button
          onClick={() => {
            setActiveMode('tienda');
            setSaleError(null);
          }}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${activeMode === 'tienda'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-extrabold'
              : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
            }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          Venta de Suplementos / Tienda
        </button>
        <button
          onClick={() => {
            setActiveMode('reporte');
            setSaleError(null);
          }}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${activeMode === 'reporte'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-extrabold'
              : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
            }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Historial de Ventas por Día
        </button>
      </div>

      {/* =========================================================================
          VISTA 1 Y 2: CHECKOUT (MEMBRESÍA O TIENDA)
          ========================================================================= */}
      {activeMode !== 'reporte' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* COLUMNA IZQUIERDA: PANELES DE CONFIGURACIÓN */}
          <div className="lg:col-span-2 space-y-6">

            {/* MÓDULO DE CLIENTE (OPCIONAL EN TIENDA, OBLIGATORIO EN MEMBRESÍA) */}
            <div className="bg-white border border-zinc-200/80 dark:bg-zinc-900 dark:border-zinc-850 rounded-2xl shadow-xs p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-zinc-850 dark:text-zinc-100 text-sm">
                    {activeMode === 'membresia' ? 'Paso 1: Asignar Cliente *' : 'Cliente (Opcional)'}
                  </h3>
                  <p className="text-[10px] text-zinc-450 mt-0.5">
                    {activeMode === 'membresia' ? 'Debes seleccionar el titular de la membresía.' : 'Asocia la venta de productos a un cliente o déjalo vacío como venta rápida anónima.'}
                  </p>
                </div>
                {!selectedClient && (
                  <button
                    onClick={() => setIsNewClientModalOpen(true)}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 underline cursor-pointer"
                  >
                    Nuevo Cliente Rápido
                  </button>
                )}
              </div>

              {selectedClient ? (
                <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-850/40 p-4 rounded-xl border border-zinc-150/40 dark:border-zinc-800">
                  <div className="min-w-0">
                    <h4 className="font-bold text-zinc-850 dark:text-zinc-200 text-sm truncate">
                      {selectedClient.nombre} {selectedClient.apellido || ''}
                    </h4>
                    <p className="text-[11px] text-zinc-500 font-semibold mt-0.5">DNI: {selectedClient.dni || 'Sin registrar'}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedClient(null);
                      setSearchResults([]);
                      setSearchQuery('');
                    }}
                    className="p-1 rounded-full text-zinc-450 hover:bg-zinc-200 dark:hover:bg-zinc-850 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleClientSearch(e.target.value)}
                    placeholder="Escribe DNI o Nombre para buscar cliente..."
                    className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-850 dark:text-zinc-50 focus:outline-none"
                  />

                  {searching ? (
                    <div className="py-2 text-center text-xs text-zinc-400 font-medium">Buscando...</div>
                  ) : searchResults.length > 0 ? (
                    <div className="border border-zinc-150 dark:border-zinc-800 rounded-xl max-h-44 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-850 bg-white dark:bg-zinc-900 text-xs">
                      {searchResults.map((c) => (
                        <button
                          key={c.id_cliente}
                          onClick={() => setSelectedClient(c)}
                          className="w-full text-left px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-850 flex justify-between items-center cursor-pointer"
                        >
                          <span className="font-bold text-zinc-800 dark:text-zinc-200">{c.nombre} {c.apellido || ''}</span>
                          <span className="text-[10px] text-zinc-400">DNI: {c.dni || 'Sin registrar'}</span>
                        </button>
                      ))}
                    </div>
                  ) : searchQuery.trim().length > 0 && (
                    <div className="p-3 text-center text-xs text-zinc-400">No se encontraron coincidencias.</div>
                  )}
                </div>
              )}
            </div>

            {/* MODO 1: FLUJO DE COBRO DE MEMBRESÍA */}
            {activeMode === 'membresia' && selectedClient && (
              <div className="space-y-6">
                {/* PASO 2: SELECCIÓN DE PLAN */}
                {membresiaStep === 1 && (
                  <div className="bg-white border border-zinc-200/80 dark:bg-zinc-900 dark:border-zinc-850 rounded-2xl shadow-xs p-6 space-y-4">
                    <h3 className="font-bold text-zinc-850 dark:text-zinc-100 text-sm">Paso 2: Seleccionar Plan de Membresía</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {planes.map((p) => {
                        const isSelected = selectedPlan?.id_tipo === p.id_tipo;
                        return (
                          <button
                            key={p.id_tipo}
                            onClick={() => {
                              setSelectedPlan(p);
                              if (pagos.length === 1 && pagos[0].monto === 0) {
                                setPagos([{ ...pagos[0], monto: p.precio }]);
                              }
                            }}
                            className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${isSelected
                                ? 'border-blue-500 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/30 shadow-xs ring-1 ring-blue-500/30'
                                : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-750'
                              }`}
                          >
                            <div className="flex justify-between items-start">
                              <h4 className="font-bold text-zinc-850 dark:text-zinc-100 text-xs truncate pr-2">{p.nombre}</h4>
                              <span className="text-zinc-900 dark:text-white font-extrabold text-xs shrink-0">S/ {p.precio}</span>
                            </div>
                            <p className="text-[9px] text-zinc-500 font-semibold mt-1">Duración: {p.duracion_dias} días</p>
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-4 border-t border-zinc-150 dark:border-zinc-850 flex justify-between">
                      <button
                        disabled
                        className="bg-zinc-100 text-zinc-400 px-5 py-2.5 rounded-xl text-xs font-bold opacity-50 cursor-not-allowed"
                      >
                        Atrás
                      </button>
                      <button
                        disabled={!selectedPlan}
                        onClick={() => setMembresiaStep(2)}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 px-5 py-2.5 rounded-xl text-xs font-black cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        Siguiente paso
                      </button>
                    </div>
                  </div>
                )}

                {/* PASO 3: MÉTODOS DE PAGO Y COMPROBANTE FOTOGRÁFICO */}
                {membresiaStep === 2 && selectedPlan && (
                  <div className="bg-white border border-zinc-200/80 dark:bg-zinc-900 dark:border-zinc-850 rounded-2xl shadow-xs p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-zinc-850 dark:text-zinc-100 text-sm">Paso 3: Métodos de Pago y Comprobante</h3>
                      <button
                        onClick={addPagoRow}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 underline cursor-pointer"
                      >
                        Dividir / Agregar Cobro
                      </button>
                    </div>

                    <div className="space-y-3">
                      {pagos.map((pago, idx) => {
                        const mObj = metodosPagoDisponibles.find(m => m.id_metodo === pago.id_metodo) || metodosPago[0];
                        const esYapeOrPlin = mObj && ['yape', 'plin'].includes(mObj.nombre.toLowerCase());

                        return (
                          <div key={idx} className="space-y-3 bg-zinc-50 dark:bg-zinc-950 p-3.5 rounded-xl border border-zinc-150/40 dark:border-zinc-850">
                            <div className="flex gap-3 items-end">
                              <div className="flex-1 space-y-1">
                                <label className="text-[9px] font-bold text-zinc-400 uppercase">Método</label>
                                <select
                                  value={pago.id_metodo}
                                  onChange={(e) => updatePagoField(idx, 'id_metodo', e.target.value)}
                                  className="w-full bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg px-2.5 py-2 text-xs text-zinc-800 dark:text-zinc-50 focus:outline-none"
                                >
                                  {metodosPagoDisponibles.map((m) => (
                                    <option key={m.id_metodo} value={m.id_metodo}>{m.nombre}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="w-28 space-y-1">
                                <label className="text-[9px] font-bold text-zinc-400 uppercase">Monto (S/)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={pago.monto || ''}
                                  onChange={(e) => updatePagoField(idx, 'monto', e.target.value)}
                                  className="w-full bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg px-2.5 py-2 text-xs text-zinc-800 dark:text-zinc-50 focus:outline-none"
                                />
                              </div>

                              <div className="flex-1 space-y-1">
                                <label className="text-[9px] font-bold text-zinc-400 uppercase">
                                  Nº Operación / Ref
                                </label>
                                <input
                                  type="text"
                                  value={pago.numero_operacion}
                                  onChange={(e) => updatePagoField(idx, 'numero_operacion', e.target.value)}
                                  placeholder="Opcional"
                                  className="w-full bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg px-2.5 py-2 text-xs text-zinc-800 dark:text-zinc-50 focus:outline-none font-medium"
                                />
                              </div>

                              {pagos.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removePagoRow(idx)}
                                  className="bg-zinc-100 hover:bg-rose-50 text-zinc-400 hover:text-rose-600 p-2.5 rounded-lg border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 cursor-pointer"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>

                            {/* ADJUNTO DE FOTO PARA YAPE / PLIN */}
                            {esYapeOrPlin && (
                              <div className="p-3 bg-amber-50/70 border border-amber-200/80 dark:bg-amber-950/20 dark:border-amber-900/40 rounded-xl space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-amber-850 dark:text-amber-400 text-[11px] flex items-center gap-1.5">
                                    <span>📸</span> Comprobante Requerido ({mObj.nombre}):
                                  </span>
                                  {membresiaVoucher && (
                                    <button
                                      type="button"
                                      onClick={() => setMembresiaVoucher('')}
                                      className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer"
                                    >
                                      Quitar foto
                                    </button>
                                  )}
                                </div>
                                <p className="text-[10px] text-amber-700 dark:text-amber-300">
                                  Los pagos vía Yape y Plin requieren captura de pantalla de la transferencia.
                                </p>

                                {membresiaVoucher ? (
                                  <div className="flex items-center gap-3 pt-1">
                                    <img src={membresiaVoucher} alt="Voucher" className="w-16 h-16 object-cover rounded-lg border border-amber-300" />
                                    <span className="text-emerald-700 dark:text-emerald-400 font-bold text-xs">✓ Foto adjunta lista</span>
                                  </div>
                                ) : (
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) processImageFile(file, (b64) => setMembresiaVoucher(b64));
                                    }}
                                    className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-600 file:text-white hover:file:bg-amber-700 cursor-pointer"
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-4 border-t border-zinc-150 dark:border-zinc-850 flex justify-between">
                      <button
                        onClick={() => setMembresiaStep(1)}
                        className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-850 dark:hover:bg-zinc-800 dark:text-zinc-200 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Atrás
                      </button>
                      <button
                        disabled={saving || Math.abs(saldoRestante) > 0.01}
                        onClick={handleConfirmarVenta}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 px-6 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? 'Procesando...' : 'Confirmar Venta'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MODO 2: FLUJO DE TIENDA Y STOCK DE PRODUCTOS */}
            {activeMode === 'tienda' && (() => {
              const filteredProducts = productos.filter((p) => {
                const matchSearch = p.nombre.toLowerCase().includes(tiendaSearch.toLowerCase()) ||
                  (p.codigo_barras && p.codigo_barras.toLowerCase().includes(tiendaSearch.toLowerCase())) ||
                  (p.descripcion && p.descripcion.toLowerCase().includes(tiendaSearch.toLowerCase()));
                return matchSearch && p.estado === 'ACTIVO';
              });

              return (
                <div className="bg-white border border-zinc-200/80 dark:bg-zinc-900 dark:border-zinc-850 rounded-2xl shadow-xs p-6 space-y-4">
                  {/* Encabezado y Barra de Búsqueda */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h3 className="font-bold text-zinc-850 dark:text-zinc-100 text-sm">Catálogo de Productos y Suplementos</h3>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Selecciona los productos para agregarlos al carrito de compra ({filteredProducts.length} disponibles).</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-56">
                        <input
                          type="text"
                          value={tiendaSearch}
                          onChange={(e) => setTiendaSearch(e.target.value)}
                          placeholder="Buscar suplemento o código..."
                          className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-zinc-850 dark:text-zinc-50 focus:outline-none"
                        />
                        <svg className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        {tiendaSearch && (
                          <button
                            onClick={() => setTiendaSearch('')}
                            className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs"
                          >
                            ×
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setModalProductSearch('');
                          setIsProductsModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs"
                        title="Abrir ventana con todo el catálogo para selección rápida"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        <span>Ver Todo el Catálogo</span>
                      </button>
                    </div>
                  </div>

                  {/* Listado de Productos en Grid */}
                  {filteredProducts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[52vh] overflow-y-auto pr-1">
                      {filteredProducts.map((p) => {
                        const inCart = cart.find(c => c.producto.id_producto === p.id_producto);
                        const qtyInCart = inCart?.cantidad || 0;
                        const stockRestante = p.stock - qtyInCart;

                        return (
                          <div
                            key={p.id_producto}
                            className={`p-3.5 border rounded-2xl flex flex-col justify-between gap-3 transition-all ${qtyInCart > 0
                                ? 'border-blue-500/50 bg-blue-50/20 dark:bg-blue-950/10 dark:border-blue-800/40 shadow-xs'
                                : 'border-zinc-200/80 dark:border-zinc-850 bg-zinc-50/40 dark:bg-zinc-950/40 hover:border-zinc-300 dark:hover:border-zinc-750'
                              }`}
                          >
                            <div className="flex gap-3 items-start min-w-0">
                              <div className="w-14 h-14 rounded-xl bg-white dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                                {p.imagen_url ? (
                                  <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover" />
                                ) : (
                                  <svg className="w-6 h-6 text-zinc-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                                  </svg>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                {p.codigo_barras && (
                                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block truncate">
                                    Cód: {p.codigo_barras}
                                  </span>
                                )}
                                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs leading-snug truncate" title={p.nombre}>
                                  {p.nombre}
                                </h4>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                  <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                                    S/ {p.precio_venta.toFixed(2)}
                                  </span>
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${stockRestante > 5
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                      : stockRestante > 0
                                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                    }`}>
                                    {stockRestante > 0 ? `Stock: ${stockRestante}` : 'Agotado'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-zinc-150/60 dark:border-zinc-850/60">
                              {qtyInCart > 0 ? (
                                <div className="flex items-center gap-2 w-full justify-between">
                                  <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                                    En Carrito: {qtyInCart}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => updateCartQty(p.id_producto, qtyInCart - 1)}
                                      className="w-6 h-6 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 rounded-lg flex items-center justify-center font-bold text-xs cursor-pointer"
                                    >
                                      -
                                    </button>
                                    <span className="font-black text-xs w-5 text-center">{qtyInCart}</span>
                                    <button
                                      onClick={() => updateCartQty(p.id_producto, qtyInCart + 1)}
                                      disabled={stockRestante <= 0}
                                      className="w-6 h-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center font-bold text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => addToCart(p)}
                                  disabled={stockRestante <= 0}
                                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold py-2 rounded-xl cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs flex items-center justify-center gap-1"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                  </svg>
                                  Agregar al Carrito
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-10 text-center text-xs text-zinc-400 bg-zinc-50/50 dark:bg-zinc-950/40 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 space-y-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-850 text-zinc-400 mx-auto flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <p>No se encontraron productos con el filtro aplicado.</p>
                      {tiendaSearch && (
                        <button
                          onClick={() => setTiendaSearch('')}
                          className="text-blue-600 font-bold hover:underline cursor-pointer"
                        >
                          Limpiar búsqueda
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* COLUMNA DERECHA: TICKET VIRTUAL DE CHECKOUT */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-850 rounded-2xl shadow-md p-6 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-600"></div>

              <div className="text-center pb-4 border-b border-dashed border-zinc-200 dark:border-zinc-850">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Resumen de Venta</p>
                <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-200 mt-1">TICKET VIRTUAL</h3>
              </div>

              {/* MODO 1: DETALLES DE TICKET MEMBRESÍA */}
              {activeMode === 'membresia' && (
                <div className="space-y-4 text-xs">
                  <div>
                    <span className="font-bold text-zinc-400 block uppercase text-[9px] tracking-wider">Cliente Titular</span>
                    <span className="text-zinc-800 dark:text-zinc-200 font-semibold text-xs mt-0.5 block truncate">
                      {selectedClient ? `${selectedClient.nombre} ${selectedClient.apellido || ''}` : 'Ninguno'}
                    </span>
                    {selectedClient?.dni && (
                      <span className="text-zinc-400 block mt-0.5 text-[10px]">DNI: {selectedClient.dni}</span>
                    )}
                  </div>

                  <div>
                    <span className="font-bold text-zinc-400 block uppercase text-[9px] tracking-wider">Plan Adquirido</span>
                    <span className="text-zinc-800 dark:text-zinc-200 font-semibold text-xs mt-0.5 block">
                      {selectedPlan ? selectedPlan.nombre : 'Ninguno'}
                    </span>
                    {selectedPlan && (
                      <span className="text-zinc-400 block mt-0.5 text-[10px]">Duración: {selectedPlan.duracion_dias} días</span>
                    )}
                  </div>

                  <div className="pt-4 border-t border-dashed border-zinc-200 dark:border-zinc-850 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500 font-medium">Total Plan:</span>
                      <span className="font-bold text-zinc-850 dark:text-zinc-200">S/ {planPrecio.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500 font-medium">Total Pagado:</span>
                      <span className="font-bold text-emerald-600">S/ {totalPagado.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm font-black pt-2 border-t border-zinc-100 dark:border-zinc-850">
                      <span>Saldo Pendiente:</span>
                      <span className={saldoRestante === 0 ? 'text-emerald-600' : 'text-rose-600'}>
                        S/ {saldoRestante.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {saleError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-[10px] font-semibold">
                      {saleError}
                    </div>
                  )}
                </div>
              )}

              {/* MODO 2: DETALLES DE TICKET TIENDA */}
              {activeMode === 'tienda' && (
                <div className="space-y-4 text-xs">
                  <div>
                    <span className="font-bold text-zinc-400 block uppercase text-[9px] tracking-wider">Cliente</span>
                    <span className="text-zinc-800 dark:text-zinc-200 font-semibold text-xs mt-0.5 block truncate">
                      {selectedClient ? `${selectedClient.nombre} ${selectedClient.apellido || ''}` : 'Venta Rápida (Mostrador)'}
                    </span>
                  </div>

                  <div>
                    <span className="font-bold text-zinc-400 block uppercase text-[9px] tracking-wider mb-1.5">Productos en Carrito</span>
                    {cart.length > 0 ? (
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {cart.map((item) => (
                          <div key={item.producto.id_producto} className="flex justify-between items-center text-xs bg-zinc-50 dark:bg-zinc-850 p-2 rounded-lg">
                            <div className="min-w-0 pr-2">
                              <p className="font-bold text-zinc-800 dark:text-zinc-200 truncate">{item.producto.nombre}</p>
                              <p className="text-[10px] text-zinc-400">S/ {item.producto.precio_venta.toFixed(2)} c/u</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => updateCartQty(item.producto.id_producto, item.cantidad - 1)}
                                className="w-5 h-5 bg-zinc-200 dark:bg-zinc-750 text-zinc-800 dark:text-zinc-200 rounded flex items-center justify-center font-bold"
                              >
                                -
                              </button>
                              <span className="font-bold text-xs w-4 text-center">{item.cantidad}</span>
                              <button
                                onClick={() => updateCartQty(item.producto.id_producto, item.cantidad + 1)}
                                className="w-5 h-5 bg-zinc-200 dark:bg-zinc-750 text-zinc-800 dark:text-zinc-200 rounded flex items-center justify-center font-bold"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-[10px] text-zinc-400 bg-zinc-50 dark:bg-zinc-950 rounded-xl">
                        Carrito vacío.
                      </div>
                    )}
                  </div>

                  {/* SELECTOR DE MÉTODO DE PAGO TIENDA */}
                  <div className="pt-2 border-t border-dashed border-zinc-200 dark:border-zinc-850 space-y-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase">Método de Pago</label>
                      <select
                        value={tiendaPaymentMethod}
                        onChange={(e) => setTiendaPaymentMethod(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-lg px-2.5 py-2 text-xs text-zinc-800 dark:text-zinc-50 focus:outline-none"
                      >
                        {['Efectivo', 'Yape', 'Plin', 'Tarjeta', 'Transferencia'].map((met) => (
                          <option key={met} value={met}>{met}</option>
                        ))}
                      </select>
                    </div>

                    {/* ADJUNTO DE FOTO YAPE / PLIN EN TIENDA */}
                    {['yape', 'plin'].includes(tiendaPaymentMethod.toLowerCase()) && (
                      <div className="p-3 bg-amber-50/70 border border-amber-200/80 dark:bg-amber-950/20 dark:border-amber-900/40 rounded-xl space-y-2">
                        <span className="font-bold text-amber-850 dark:text-amber-400 text-[10px] block">
                          📸 Foto Comprobante ({tiendaPaymentMethod}):
                        </span>
                        {tiendaVoucher ? (
                          <div className="flex items-center gap-2">
                            <img src={tiendaVoucher} alt="Voucher" className="w-12 h-12 object-cover rounded-lg border border-amber-300" />
                            <button
                              type="button"
                              onClick={() => setTiendaVoucher('')}
                              className="text-[9px] text-rose-600 font-bold hover:underline cursor-pointer"
                            >
                              Cambiar foto
                            </button>
                          </div>
                        ) : (
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) processImageFile(file, (b64) => setTiendaVoucher(b64));
                            }}
                            className="text-[10px] file:mr-1 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-amber-600 file:text-white cursor-pointer"
                          />
                        )}
                      </div>
                    )}

                    <div className="flex justify-between items-center text-sm pt-2">
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">Total a Pagar:</span>
                      <span className="font-black text-blue-600 text-base">
                        S/ {totalTienda.toFixed(2)}
                      </span>
                    </div>

                    {saleError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-[10px] font-semibold">
                        {saleError}
                      </div>
                    )}

                    <button
                      onClick={handleConfirmarVentaTienda}
                      disabled={saving || cart.length === 0}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-500/20"
                    >
                      {saving ? 'Registrando Venta...' : 'Confirmar Venta de Tienda'}
                    </button>
                  </div>
                </div>
              )}

              {/* BOTÓN DE LIMPIAR BORRADOR */}
              {(selectedClient || selectedPlan || cart.length > 0 || pagos.some(p => p.monto > 0)) && (
                <button
                  onClick={handleResetSale}
                  className="w-full mt-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-650 dark:bg-zinc-850 dark:hover:bg-zinc-800 dark:text-zinc-350 py-3 rounded-xl text-[10px] font-bold transition-all cursor-pointer border border-zinc-200 dark:border-zinc-700/80 text-center"
                >
                  Limpiar Borrador / Reiniciar Venta
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* =========================================================================
            VISTA 3: HISTORIAL Y LISTADO DE VENTAS POR DÍA
            ========================================================================= */
        <div className="space-y-6">
          {/* BARRA DE FILTRO POR FECHA Y KPI RESUMEN */}
          <div className="bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-850 rounded-2xl shadow-xs p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-zinc-50 text-base">Filtro de Ventas por Día</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Selecciona el día para auditar los tickets y comprobantes de Yape/Plin.</p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={reporteFecha}
                  onChange={(e) => setReporteFecha(e.target.value)}
                  className="bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none"
                />
                <button
                  onClick={() => setReporteFecha(new Date().toISOString().split('T')[0])}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  Hoy
                </button>
                <button
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 1);
                    setReporteFecha(d.toISOString().split('T')[0]);
                  }}
                  className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer"
                >
                  Ayer
                </button>
              </div>
            </div>

            {/* KPI TILES DEL DÍA */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
              <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 p-3.5 rounded-xl">
                <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">Total Recaudado</span>
                <span className="text-base font-black text-blue-950 dark:text-blue-100 mt-1 block">
                  S/ {reporteVentas.reduce((sum, v) => sum + v.total, 0).toFixed(2)}
                </span>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-850/60 border border-zinc-150 dark:border-zinc-850 p-3.5 rounded-xl">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Efectivo</span>
                <span className="text-sm font-black text-zinc-800 dark:text-zinc-100 mt-1 block">
                  S/ {reporteVentas.filter(v => v.metodoPago.toLowerCase().includes('efectivo')).reduce((sum, v) => sum + v.total, 0).toFixed(2)}
                </span>
              </div>
              <div className="bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 p-3.5 rounded-xl">
                <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">Yape</span>
                <span className="text-sm font-black text-purple-950 dark:text-purple-100 mt-1 block">
                  S/ {reporteVentas.filter(v => v.metodoPago.toLowerCase().includes('yape')).reduce((sum, v) => sum + v.total, 0).toFixed(2)}
                </span>
              </div>
              <div className="bg-cyan-50/60 dark:bg-cyan-950/20 border border-cyan-100 dark:border-cyan-900/30 p-3.5 rounded-xl">
                <span className="text-[9px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider block">Plin</span>
                <span className="text-sm font-black text-cyan-950 dark:text-cyan-100 mt-1 block">
                  S/ {reporteVentas.filter(v => v.metodoPago.toLowerCase().includes('plin')).reduce((sum, v) => sum + v.total, 0).toFixed(2)}
                </span>
              </div>
              <div className="bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 p-3.5 rounded-xl">
                <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">Tarjeta / Transf.</span>
                <span className="text-sm font-black text-indigo-950 dark:text-indigo-100 mt-1 block">
                  S/ {reporteVentas.filter(v => !['efectivo', 'yape', 'plin'].includes(v.metodoPago.toLowerCase())).reduce((sum, v) => sum + v.total, 0).toFixed(2)}
                </span>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-850/60 border border-zinc-150 dark:border-zinc-850 p-3.5 rounded-xl">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Nº Operaciones</span>
                <span className="text-sm font-black text-zinc-800 dark:text-zinc-100 mt-1 block">{reporteVentas.length} Tickets</span>
              </div>
            </div>
          </div>

          {/* TABLA DE VENTAS DEL DÍA */}
          <div className="bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-850 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-zinc-150 dark:border-zinc-850 flex justify-between items-center gap-4">
              <input
                type="text"
                value={searchReporteQuery}
                onChange={(e) => setSearchReporteQuery(e.target.value)}
                placeholder="Buscar por cliente, DNI, método o Ticket ID..."
                className="w-full max-w-sm bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-800 dark:text-zinc-50 focus:outline-none"
              />
              <button
                onClick={() => cargarReporte(reporteFecha)}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1 shrink-0"
              >
                <span>🔄</span> Refrescar
              </button>
            </div>

            {loadingReporte ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-blue-600 border-t-transparent"></div>
                <p className="mt-2 text-xs text-zinc-400 font-semibold">Cargando reporte de ventas...</p>
              </div>
            ) : filteredReporteVentas.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-850/60 text-zinc-400 font-bold border-b border-zinc-150 dark:border-zinc-850">
                      <th className="p-4 uppercase tracking-wider">Ticket</th>
                      <th className="p-4 uppercase tracking-wider">Tipo</th>
                      <th className="p-4 uppercase tracking-wider">Hora</th>
                      <th className="p-4 uppercase tracking-wider">Cliente</th>
                      <th className="p-4 uppercase tracking-wider">Atendido por</th>
                      <th className="p-4 uppercase tracking-wider">Método</th>
                      <th className="p-4 uppercase tracking-wider">Comprobante Foto</th>
                      <th className="p-4 uppercase tracking-wider text-right">Total</th>
                      <th className="p-4 uppercase tracking-wider text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
                    {filteredReporteVentas.map((v) => {
                      const isYapeOrPlin = ['yape', 'plin'].includes(v.metodoPago.toLowerCase());
                      const hasVoucher = !!v.comprobanteUrl;

                      return (
                        <tr key={`${v.tipoVenta}-${v.id}`} className="hover:bg-zinc-50/40 dark:hover:bg-zinc-850/20">
                          <td className="p-4 font-black text-zinc-800 dark:text-zinc-200">
                            #{v.id}
                          </td>
                          <td className="p-4">
                            <span className={`inline-block px-2 py-0.5 rounded font-black text-[9px] uppercase ${v.tipoVenta === 'MEMBRESIA'
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
                            <span className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] ${v.metodoPago.toLowerCase().includes('yape') ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
                                v.metodoPago.toLowerCase().includes('plin') ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300' :
                                  v.metodoPago.toLowerCase().includes('stripe') ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' :
                                    'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                              }`}>
                              {v.metodoPago}
                            </span>
                          </td>

                          {/* ESTADO DEL COMPROBANTE DE YAPE / PLIN */}
                          <td className="p-4">
                            {isYapeOrPlin ? (
                              hasVoucher ? (
                                <button
                                  onClick={() => setViewerPhotoUrl(v.comprobanteUrl!)}
                                  className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 px-2.5 py-1 rounded-lg text-[10px] font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
                                  title="Ver captura de pantalla del voucher"
                                >
                                  <span>📷</span> Ver Voucher
                                </button>
                              ) : (
                                <button
                                  onClick={() => setUploadModalItem({ id: v.id, tipo: v.tipoVenta, titulo: `Ticket #${v.id} - ${v.clienteNombre}` })}
                                  className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/40 px-2.5 py-1 rounded-lg text-[10px] font-bold hover:bg-amber-100 transition-colors cursor-pointer animate-pulse"
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
                No hay ventas registradas para el día {reporteFecha}.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------- MODAL CREAR CLIENTE RÁPIDO ----------------- */}
      {isNewClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-850">
            <div className="px-6 py-5 border-b border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 flex justify-between items-center">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-50">Registrar Cliente Rápido</h3>
              <button
                onClick={() => setIsNewClientModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleQuickClientSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold">
                  {formSuccess}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">DNI (Identificación)</label>
                <input
                  type="text"
                  name="dni"
                  required
                  className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-850 dark:text-zinc-50 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Nombre *</label>
                  <input
                    type="text"
                    name="nombre"
                    required
                    className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-850 dark:text-zinc-50 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Apellido</label>
                  <input
                    type="text"
                    name="apellido"
                    className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-850 dark:text-zinc-50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Teléfono</label>
                  <input
                    type="tel"
                    name="telefono"
                    placeholder="999999999"
                    className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-850 dark:text-zinc-50 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Email</label>
                  <input
                    type="email"
                    name="email"
                    className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-850 dark:text-zinc-50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-150 dark:border-zinc-850 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewClientModalOpen(false)}
                  className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-850 dark:hover:bg-zinc-800 dark:text-zinc-200 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-black cursor-pointer shadow-sm shadow-blue-500/20"
                >
                  Guardar y Asignar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Desglose de Productos / Membresía:</span>
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
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Comprobante de Transferencia Adjunto:</span>
                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden p-2 bg-zinc-50 dark:bg-zinc-950">
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
              <button onClick={() => setViewerPhotoUrl(null)} className="text-zinc-400 hover:text-zinc-600 p-1">
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
              <button onClick={() => setUploadModalItem(null)} className="text-zinc-400 hover:text-zinc-600 p-1">
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
                      className="text-rose-600 font-bold hover:underline text-[10px]"
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

      {/* ----------------- MODAL CATÁLOGO COMPLETO DE PRODUCTOS ----------------- */}
      {isProductsModalOpen && (() => {
        const modalFiltered = productos.filter((p) => {
          if (p.estado !== 'ACTIVO') return false;
          const q = modalProductSearch.toLowerCase().trim();
          const matchQ = !q || 
            p.nombre.toLowerCase().includes(q) ||
            (p.codigo_barras && p.codigo_barras.toLowerCase().includes(q)) ||
            (p.descripcion && p.descripcion.toLowerCase().includes(q));
          
          if (!matchQ) return false;

          if (modalStockFilter === 'CON_STOCK') return p.stock > 0;
          if (modalStockFilter === 'POCO_STOCK') return p.stock > 0 && p.stock <= 5;
          return true;
        });

        const totalItemsInCart = cart.reduce((sum, item) => sum + item.cantidad, 0);
        const totalPriceInCart = cart.reduce((sum, item) => sum + (item.cantidad * item.producto.precio_venta), 0);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-zinc-950/70 backdrop-blur-xs">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-5xl h-[90vh] max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 flex flex-col animate-in fade-in zoom-in-95 duration-200">
              {/* Header del Modal */}
              <div className="px-6 py-4 border-b border-zinc-150 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-850/50 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-black text-zinc-900 dark:text-zinc-50">Catálogo Completo de Productos</h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                        {modalFiltered.length} disponibles
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">Selecciona y ajusta las cantidades para agregarlos directamente a tu ticket.</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsProductsModalOpen(false)}
                  className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer text-sm font-bold"
                  title="Cerrar catálogo"
                >
                  ✕
                </button>
              </div>

              {/* Filtros y Buscador del Modal */}
              <div className="px-6 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    autoFocus
                    value={modalProductSearch}
                    onChange={(e) => setModalProductSearch(e.target.value)}
                    placeholder="Buscar por nombre, código de barras o descripción..."
                    className="w-full bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750 text-xs rounded-xl pl-9 pr-8 py-2.5 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <svg className="w-4 h-4 text-zinc-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {modalProductSearch && (
                    <button
                      onClick={() => setModalProductSearch('')}
                      className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  <button
                    onClick={() => setModalStockFilter('TODOS')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      modalStockFilter === 'TODOS'
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                        : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    Todos ({productos.filter(p => p.estado === 'ACTIVO').length})
                  </button>
                  <button
                    onClick={() => setModalStockFilter('CON_STOCK')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      modalStockFilter === 'CON_STOCK'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    Con Stock ({productos.filter(p => p.estado === 'ACTIVO' && p.stock > 0).length})
                  </button>
                  <button
                    onClick={() => setModalStockFilter('POCO_STOCK')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      modalStockFilter === 'POCO_STOCK'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    Poco Stock (≤5)
                  </button>
                </div>
              </div>

              {/* Grid de Productos dentro del Modal */}
              <div className="flex-1 overflow-y-auto p-6">
                {modalFiltered.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {modalFiltered.map((p) => {
                      const inCart = cart.find(c => c.producto.id_producto === p.id_producto);
                      const qtyInCart = inCart?.cantidad || 0;
                      const stockRestante = p.stock - qtyInCart;

                      return (
                        <div
                          key={p.id_producto}
                          className={`p-4 border rounded-2xl flex flex-col justify-between gap-3 transition-all ${
                            qtyInCart > 0
                              ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-950/20 dark:border-blue-700 shadow-sm ring-1 ring-blue-500/30'
                              : 'border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-950/40 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-xs'
                          }`}
                        >
                          <div className="space-y-3">
                            <div className="w-full h-32 rounded-xl bg-white dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 overflow-hidden flex items-center justify-center shadow-2xs relative">
                              {p.imagen_url ? (
                                <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover" />
                              ) : (
                                <svg className="w-10 h-10 text-zinc-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                                </svg>
                              )}
                              {p.codigo_barras && (
                                <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-zinc-900/80 text-white text-[9px] font-mono font-bold tracking-tight">
                                  {p.codigo_barras}
                                </span>
                              )}
                            </div>

                            <div>
                              <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs leading-snug line-clamp-2" title={p.nombre}>
                                {p.nombre}
                              </h4>
                              {p.descripcion && (
                                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 line-clamp-1">
                                  {p.descripcion}
                                </p>
                              )}
                              <div className="flex items-center justify-between gap-2 mt-2">
                                <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                                  S/ {p.precio_venta.toFixed(2)}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  stockRestante > 5
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                    : stockRestante > 0
                                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                                }`}>
                                  {stockRestante > 0 ? `Stock: ${stockRestante}` : 'Agotado'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-zinc-150 dark:border-zinc-800">
                            {qtyInCart > 0 ? (
                              <div className="flex items-center justify-between gap-2 bg-blue-600 text-white rounded-xl p-1 shadow-xs">
                                <button
                                  onClick={() => updateCartQty(p.id_producto, qtyInCart - 1)}
                                  className="w-7 h-7 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center font-black text-xs cursor-pointer transition-colors"
                                >
                                  -
                                </button>
                                <span className="font-black text-xs px-1">
                                  {qtyInCart} en carrito
                                </span>
                                <button
                                  onClick={() => updateCartQty(p.id_producto, qtyInCart + 1)}
                                  disabled={stockRestante <= 0}
                                  className="w-7 h-7 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center font-black text-xs cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addToCart(p)}
                                disabled={p.stock <= 0}
                                className="w-full bg-zinc-900 hover:bg-blue-600 text-white dark:bg-zinc-800 dark:hover:bg-blue-600 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-2xs"
                              >
                                <span>+ Agregar al Carrito</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-16 text-center text-zinc-400 space-y-2">
                    <span className="text-4xl block">🔍</span>
                    <p className="text-sm font-bold text-zinc-600 dark:text-zinc-300">No se encontraron productos coincidentes.</p>
                    <p className="text-xs">Prueba con otro término de búsqueda o cambia los filtros de stock.</p>
                  </div>
                )}
              </div>

              {/* Footer del Modal con Resumen de Carrito */}
              <div className="px-6 py-4 border-t border-zinc-150 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-zinc-500 font-medium">
                    En Carrito: <strong className="text-zinc-900 dark:text-zinc-100">{totalItemsInCart} producto(s)</strong>
                  </span>
                  <span className="text-zinc-500 font-medium">
                    Total a Cobrar: <strong className="text-emerald-600 dark:text-emerald-400 font-black text-sm">S/ {totalPriceInCart.toFixed(2)}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => setIsProductsModalOpen(false)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-black text-xs transition-colors cursor-pointer shadow-md"
                  >
                    ✓ Listo, Volver a Ticket Virtual
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}

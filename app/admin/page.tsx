import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { getSesionActual } from '@/app/actions/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

interface ClienteMembresiaJoin {
  nombre?: string | null;
  apellido?: string | null;
  dni?: string | null;
  telefono?: string | null;
}

interface TipoMembresiaJoin {
  nombre?: string | null;
}

interface MembresiaPorVencerItem {
  id_membresia: number;
  fecha_fin: string;
  precio_pagado: number;
  clientes?: ClienteMembresiaJoin | ClienteMembresiaJoin[] | null;
  tipos_membresia?: TipoMembresiaJoin | TipoMembresiaJoin[] | null;
}

interface CategoriaGastoJoin {
  nombre?: string | null;
}

interface GastoRow {
  id_gasto: number;
  monto_estimado: number;
  monto_final?: number | null;
  estado: string;
  concepto: string;
  fecha_programada: string;
  categorias_gasto?: CategoriaGastoJoin | CategoriaGastoJoin[] | null;
}

interface MetodoPagoJoin {
  nombre?: string | null;
}

interface PagoItemRow {
  id_pago: number;
  monto: number;
  concepto: string;
  metodos_pago?: MetodoPagoJoin | MetodoPagoJoin[] | null;
  fecha?: string | null;
  created_at?: string | null;
  estado?: string | null;
}

interface VentaTiendaItemRow {
  id_venta: number;
  total: number;
  metodo_pago?: string | null;
  fecha?: string | null;
  created_at?: string | null;
}

interface MovimientoCajaRow {
  id_movimiento: number;
  monto: number;
  tipo: 'INGRESO' | 'EGRESO';
  concepto: string;
  fecha: string;
}

export default async function AdminDashboardPage() {
  const user = await getSesionActual();
  if (!user) {
    redirect('/login');
  }

  if (user.usuario !== 'admin' && !user.modulos?.includes('Dashboard')) {
    if (user.modulos?.includes('Recepcion')) {
      redirect('/admin/recepcion');
    } else if (user.modulos?.includes('Ventas')) {
      redirect('/admin/ventas');
    } else if (user.modulos?.includes('Caja')) {
      redirect('/admin/caja');
    } else if (user.modulos?.includes('CRM')) {
      redirect('/admin/crm');
    } else if (user.modulos?.includes('Finanzas')) {
      redirect('/admin/finanzas');
    } else if (user.modulos?.includes('Planes')) {
      redirect('/admin/planes');
    } else if (user.modulos?.includes('EquipoUsuarios')) {
      redirect('/admin/equipo');
    } else if (user.modulos?.includes('RolesPermisos')) {
      redirect('/admin/roles');
    } else if (user.modulos?.includes('LogsSeguridad')) {
      redirect('/admin/logs');
    } else if (user.modulos?.includes('Inventario')) {
      redirect('/admin/inventario');
    } else {
      redirect('/login');
    }
  }

  const supabase = await createClient();

  // --- 1. CLIENTES & MEMBRESÍAS ---
  const { count: totalClientes } = await supabase
    .from('clientes')
    .select('*', { count: 'exact', head: true });

  const { count: membresiasActivas } = await supabase
    .from('membresias_cliente')
    .select('*', { count: 'exact', head: true })
    .eq('estado', 'ACTIVA');

  const { count: membresiasVencidas } = await supabase
    .from('membresias_cliente')
    .select('*', { count: 'exact', head: true })
    .eq('estado', 'VENCIDA');

  // Membresías por vencer en los próximos 7 días
  const hoyStr = new Date().toISOString().split('T')[0];
  const en7DiasStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const { data: rawMembPorVencer } = await supabase
    .from('membresias_cliente')
    .select(`
      id_membresia,
      fecha_fin,
      precio_pagado,
      clientes(nombre, apellido, dni, telefono),
      tipos_membresia(nombre)
    `)
    .eq('estado', 'ACTIVA')
    .gte('fecha_fin', hoyStr)
    .lte('fecha_fin', en7DiasStr)
    .order('fecha_fin', { ascending: true })
    .limit(5);

  const membPorVencer = (rawMembPorVencer as unknown as MembresiaPorVencerItem[]) || [];

  // --- 2. FLUJO DE CAJA & MOVIMIENTOS ---
  const { data: rawMovimientos } = await supabase
    .from('movimientos_caja')
    .select('id_movimiento, monto, tipo, concepto, fecha')
    .order('fecha', { ascending: false });

  const movimientos = (rawMovimientos as MovimientoCajaRow[]) || [];

  const totalIngresos = movimientos
    .filter(m => m.tipo === 'INGRESO')
    .reduce((sum, m) => sum + Number(m.monto || 0), 0);

  const totalEgresos = movimientos
    .filter(m => m.tipo === 'EGRESO')
    .reduce((sum, m) => sum + Number(m.monto || 0), 0);

  const balanceNeto = totalIngresos - totalEgresos;
  const margenUtilidad = totalIngresos > 0 ? (balanceNeto / totalIngresos) * 100 : 0;

  // --- 3. VENTAS DE TIENDA ---
  const { data: rawVentasTienda } = await supabase
    .from('ventas_productos')
    .select('id_venta, total, metodo_pago, fecha, created_at');

  const ventasTienda = (rawVentasTienda as VentaTiendaItemRow[]) || [];
  const totalVentasTienda = ventasTienda.reduce((sum, v) => sum + Number(v.total || 0), 0);
  const countVentasTienda = ventasTienda.length;

  // --- 4. COBROS DE MEMBRESÍAS ---
  const { data: rawPagosData } = await supabase
    .from('pagos')
    .select('id_pago, monto, concepto, metodos_pago(nombre), fecha, created_at, estado');

  const pagosData = (rawPagosData as unknown as PagoItemRow[]) || [];
  const totalPagosMemb = pagosData.reduce((sum, p) => sum + Number(p.monto || 0), 0);
  const countPagosMemb = pagosData.length;

  // --- 5. GASTOS PROGRAMADOS Y POR CATEGORÍA ---
  const { data: rawGastosData } = await supabase
    .from('gastos')
    .select('id_gasto, monto_estimado, monto_final, estado, concepto, fecha_programada, categorias_gasto(nombre)');

  const gastosData = (rawGastosData as unknown as GastoRow[]) || [];

  const gastosPendientesTotal = gastosData
    .filter(g => g.estado === 'PENDIENTE')
    .reduce((sum, g) => sum + Number(g.monto_estimado || 0), 0);

  const countGastosPendientes = gastosData.filter(g => g.estado === 'PENDIENTE').length;

  const gastosPorCategoria: Record<string, number> = {};
  gastosData.forEach(g => {
    const cat = Array.isArray(g.categorias_gasto) ? g.categorias_gasto[0] : g.categorias_gasto;
    const catNombre = cat?.nombre || 'General / Operativo';
    const monto = Number(g.monto_final || g.monto_estimado || 0);
    gastosPorCategoria[catNombre] = (gastosPorCategoria[catNombre] || 0) + monto;
  });

  const topCategoriasGasto = Object.entries(gastosPorCategoria)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const totalGastosCategorizados = Object.values(gastosPorCategoria).reduce((a, b) => a + b, 0) || 1;

  // --- 6. MÉTODOS DE PAGO ACUMULADOS ---
  const pagosPorMetodo: Record<string, number> = {
    'Efectivo': 0,
    'Yape / Plin': 0,
    'Tarjeta / Stripe': 0,
    'Otros': 0
  };

  pagosData.forEach(p => {
    const mp = Array.isArray(p.metodos_pago) ? p.metodos_pago[0] : p.metodos_pago;
    const nombre = (mp?.nombre || 'Efectivo').toLowerCase();
    const monto = Number(p.monto || 0);
    if (nombre.includes('efectivo')) pagosPorMetodo['Efectivo'] += monto;
    else if (nombre.includes('yape') || nombre.includes('plin')) pagosPorMetodo['Yape / Plin'] += monto;
    else if (nombre.includes('tarjeta') || nombre.includes('stripe')) pagosPorMetodo['Tarjeta / Stripe'] += monto;
    else pagosPorMetodo['Otros'] += monto;
  });

  ventasTienda.forEach(v => {
    const nombre = (v.metodo_pago || 'Efectivo').toLowerCase();
    const monto = Number(v.total || 0);
    if (nombre.includes('efectivo')) pagosPorMetodo['Efectivo'] += monto;
    else if (nombre.includes('yape') || nombre.includes('plin')) pagosPorMetodo['Yape / Plin'] += monto;
    else if (nombre.includes('tarjeta') || nombre.includes('stripe')) pagosPorMetodo['Tarjeta / Stripe'] += monto;
    else pagosPorMetodo['Otros'] += monto;
  });

  const totalMetodos = Object.values(pagosPorMetodo).reduce((a, b) => a + b, 0) || 1;

  // --- 7. CAJA ACTIVA ---
  const { data: cajaAbierta } = await supabase
    .from('cajas')
    .select('id_caja, monto_inicial, fecha_apertura, usuarios_sistema(usuario)')
    .eq('estado', 'ABIERTA')
    .order('fecha_apertura', { ascending: false })
    .limit(1)
    .maybeSingle();

  // --- 8. INVENTARIO DE PRODUCTOS ---
  const { data: productosData } = await supabase
    .from('productos')
    .select('id_producto, stock, precio_compra, precio_venta, nombre, estado');

  const valorizacionInventario = (productosData || []).reduce(
    (sum, p) => sum + Number(p.stock || 0) * Number(p.precio_venta || 0),
    0
  );
  const totalItemsInventario = (productosData || []).reduce((sum, p) => sum + Number(p.stock || 0), 0);
  const productosBajoStock = (productosData || []).filter(
    p => p.estado === 'ACTIVO' && Number(p.stock || 0) <= 5
  );

  // --- 9. TOP CARDS ---
  const mainCards = [
    {
      name: 'Ingresos Totales (Caja)',
      value: `S/ ${totalIngresos.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: `${countPagosMemb} pagos memb. + ${countVentasTienda} ventas tienda`,
      icon: (
        <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      borderColor: 'border-l-emerald-500',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
    },
    {
      name: 'Gastos y Salidas',
      value: `S/ ${totalEgresos.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: `${gastosData.length} gastos contabilizados`,
      icon: (
        <svg className="w-5 h-5 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      borderColor: 'border-l-rose-500',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
    },
    {
      name: 'Balance Neto Operativo',
      value: `S/ ${balanceNeto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: `Margen: ${margenUtilidad >= 0 ? '+' : ''}${margenUtilidad.toFixed(1)}% de rentabilidad`,
      icon: (
        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
        </svg>
      ),
      borderColor: balanceNeto >= 0 ? 'border-l-blue-500' : 'border-l-rose-600',
      badgeColor: balanceNeto >= 0 
        ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800' 
        : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
    },
    {
      name: 'Arqueo de Caja Actual',
      value: cajaAbierta 
        ? `S/ ${Number(cajaAbierta.monto_inicial || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
        : 'Cerrada',
      subtitle: cajaAbierta ? 'Turno en curso (Abierta)' : 'Sin turno activo hoy',
      icon: (
        <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      ),
      borderColor: cajaAbierta ? 'border-l-amber-500' : 'border-l-zinc-400',
      badgeColor: cajaAbierta 
        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800' 
        : 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header Panel */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-850 to-zinc-900 p-6 shadow-md border border-zinc-800 sm:p-8">
        <div className="absolute right-0 top-0 -mr-20 -mt-20 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Panel Financiero Principal
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Control Financiero y Comercial
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-zinc-400">
              Monitoreo contable en tiempo real: suscripciones, facturación de tienda, gastos operativos, balance neto y valorización de inventario.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 items-center">
            <Link
              href="/admin/caja"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 shadow-sm transition-all"
            >
              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Arqueo de Caja
            </Link>
            <Link
              href="/admin/ventas"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Vender Productos
            </Link>
            <Link
              href="/admin/finanzas"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 shadow-sm transition-all"
            >
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Gastos & Finanzas
            </Link>
          </div>
        </div>
      </div>

      {/* SECTION 1: CORE FINANCIAL STATS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Indicadores Contables Principales</h2>
            <p className="text-xs text-zinc-500">Métricas consolidadas de caja, cobros y resultados netos acumulados.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {mainCards.map((item) => (
            <div
              key={item.name}
              className={`bg-white rounded-2xl p-5 shadow-xs border border-zinc-200/80 dark:bg-zinc-900 dark:border-zinc-800 border-l-4 ${item.borderColor} flex items-start justify-between gap-3`}
            >
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">{item.name}</span>
                <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">{item.value}</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">{item.subtitle}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 dark:bg-zinc-800/80 dark:border-zinc-700">
                {item.icon}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: DESGLOSE DE FUENTES DE INGRESO, GASTOS E INVENTARIO */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Membresías */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Cobro de Membresías</span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
              {membresiasActivas ?? 0} Activas
            </span>
          </div>
          <div>
            <p className="text-xl font-black text-zinc-900 dark:text-zinc-100">
              S/ {totalPagosMemb.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {countPagosMemb} transacciones registradas
            </p>
          </div>
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500">
            <span>Vencidas: <strong className="text-rose-600 dark:text-rose-400">{membresiasVencidas ?? 0}</strong></span>
            <span>Total Clientes: <strong className="text-zinc-800 dark:text-zinc-200">{totalClientes ?? 0}</strong></span>
          </div>
        </div>

        {/* Ventas Tienda */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Ventas de Tienda</span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
              {countVentasTienda} Tickets
            </span>
          </div>
          <div>
            <p className="text-xl font-black text-zinc-900 dark:text-zinc-100">
              S/ {totalVentasTienda.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Ticket promedio: S/ {countVentasTienda > 0 ? (totalVentasTienda / countVentasTienda).toFixed(2) : '0.00'}
            </p>
          </div>
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500">
            <span>Bebidas, snacks y suplementos</span>
            <Link href="/admin/ventas" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">Ver tienda →</Link>
          </div>
        </div>

        {/* Gastos Pendientes */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Gastos por Pagar</span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
              {countGastosPendientes} Pendientes
            </span>
          </div>
          <div>
            <p className="text-xl font-black text-amber-600 dark:text-amber-400">
              S/ {gastosPendientesTotal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Compromisos operativos programados
            </p>
          </div>
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500">
            <span>Alquiler, servicios, otros</span>
            <Link href="/admin/finanzas" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">Gestionar →</Link>
          </div>
        </div>

        {/* Inventario Valorizado */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Valor en Inventario</span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
              {totalItemsInventario} Uds. Stock
            </span>
          </div>
          <div>
            <p className="text-xl font-black text-zinc-900 dark:text-zinc-100">
              S/ {valorizacionInventario.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {productosBajoStock.length > 0 ? (
                <span className="text-rose-600 dark:text-rose-400 font-medium">⚠️ {productosBajoStock.length} productos con bajo stock</span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Stock en niveles óptimos</span>
              )}
            </p>
          </div>
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500">
            <span>{productosData?.length || 0} referencias activas</span>
            <Link href="/admin/inventario" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">Inventario →</Link>
          </div>
        </div>
      </div>

      {/* SECTION 3: GRÁFICOS Y DESGLOSE ESTRUCTURAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Métodos de Pago */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-5">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Mix de Medios de Pago</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Distribución total de ingresos según la forma de cobro.</p>
          </div>

          <div className="space-y-3.5">
            {Object.entries(pagosPorMetodo).map(([metodo, monto]) => {
              const porcentaje = totalMetodos > 0 ? ((monto / totalMetodos) * 100) : 0;
              return (
                <div key={metodo} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">{metodo}</span>
                    <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                      S/ {monto.toFixed(2)} ({porcentaje.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        metodo === 'Efectivo'
                          ? 'bg-emerald-500'
                          : metodo.includes('Yape')
                          ? 'bg-purple-500'
                          : metodo.includes('Tarjeta')
                          ? 'bg-blue-500'
                          : 'bg-zinc-400'
                      }`}
                      style={{ width: `${Math.max(porcentaje, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-400 text-center">
            Total facturado multicanal: <strong className="text-zinc-800 dark:text-zinc-200">S/ {totalMetodos.toFixed(2)}</strong>
          </div>
        </div>

        {/* Estructura de Gastos por Categoría */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-5">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Distribución de Gastos</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Mayores centros de costos y egresos operativos.</p>
          </div>

          {topCategoriasGasto.length > 0 ? (
            <div className="space-y-3.5">
              {topCategoriasGasto.map(([categoria, monto]) => {
                const porcentaje = (monto / totalGastosCategorizados) * 100;
                return (
                  <div key={categoria} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300 truncate max-w-[140px]">{categoria}</span>
                      <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                        S/ {monto.toFixed(2)} ({porcentaje.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-rose-500 transition-all duration-500"
                        style={{ width: `${Math.max(porcentaje, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-zinc-400">
              No hay gastos categorizados registrados todavía.
            </div>
          )}

          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-400 text-center">
            Total en costos registrados: <strong className="text-zinc-800 dark:text-zinc-200">S/ {totalGastosCategorizados.toFixed(2)}</strong>
          </div>
        </div>

        {/* Alertas de Membresías por Vencer */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Próximos Vencimientos</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Membresías por vencer en los próximos 7 días.</p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              {membPorVencer.length} pendientes
            </span>
          </div>

          {membPorVencer.length > 0 ? (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {membPorVencer.map((m) => {
                const cli = Array.isArray(m.clientes) ? m.clientes[0] : m.clientes;
                const plan = Array.isArray(m.tipos_membresia) ? m.tipos_membresia[0] : m.tipos_membresia;
                const rawTel = cli?.telefono ? cli.telefono.replace(/\D/g, '') : '';
                const cleanPhone = rawTel.length === 9 ? `51${rawTel}` : rawTel;
                const msg = `Hola *${cli?.nombre || 'Socio'}*, te saludamos de GestionWeb Gym. Te recordamos que tu membresía de plan *${plan?.nombre || 'gimnasio'}* vence el *${m.fecha_fin}*. ¡Renueva a tiempo para mantener tu rutina y precio promocional! 💪🏋️`;
                const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}` : null;

                return (
                  <div key={m.id_membresia} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                        {cli?.nombre ? `${cli.nombre} ${cli.apellido || ''}`.trim() : 'Cliente sin nombre'}
                      </p>
                      <p className="text-[11px] text-zinc-500 truncate">
                        {plan?.nombre || 'Membresía'} — Vence: <strong className="text-amber-600 dark:text-amber-400">{m.fecha_fin}</strong>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 text-[10px] font-bold transition-colors shadow-2xs"
                          title="Enviar recordatorio de renovación por WhatsApp"
                        >
                          <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                          </svg>
                          WhatsApp
                        </a>
                      )}
                      <span className="text-xs font-black text-zinc-900 dark:text-zinc-100">
                        S/ {Number(m.precio_pagado || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-zinc-400">
              ✓ No hay membresías con vencimiento próximo en los siguientes 7 días.
            </div>
          )}

          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-center">
            <Link href="/admin/recepcion" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              Ir al Control de Acceso y Recepción →
            </Link>
          </div>
        </div>
      </div>

      {/* SECTION 4: ÚLTIMAS TRANSACCIONES FINANCIERAS (Reemplaza los logs de seguridad) */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Últimos Movimientos de Caja y Transacciones</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Historial reciente de ingresos por ventas, pagos de clientes y egresos operativos.</p>
          </div>
          <Link
            href="/admin/caja"
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline self-start sm:self-auto"
          >
            Ver todos los movimientos de caja →
          </Link>
        </div>

        {movimientos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[11px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-50/30 dark:bg-zinc-900/50">
                  <th className="py-3 px-5">Tipo</th>
                  <th className="py-3 px-5">Concepto / Detalle</th>
                  <th className="py-3 px-5">Fecha y Hora</th>
                  <th className="py-3 px-5 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                {movimientos.slice(0, 8).map((mov) => {
                  const esIngreso = mov.tipo === 'INGRESO';
                  return (
                    <tr key={mov.id_movimiento} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50 transition-colors">
                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            esIngreso
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                              : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                          }`}
                        >
                          {esIngreso ? (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                          )}
                          {mov.tipo}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 font-medium text-zinc-800 dark:text-zinc-200">
                        {mov.concepto}
                      </td>
                      <td className="py-3.5 px-5 text-zinc-500">
                        {new Date(mov.fecha).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}{' '}
                        <span className="text-[10px] text-zinc-400">
                          {new Date(mov.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className={`py-3.5 px-5 text-right font-bold text-sm ${
                        esIngreso ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {esIngreso ? '+ ' : '- '}S/ {Number(mov.monto || 0).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-zinc-400 text-xs">
            No se han registrado movimientos de caja aún.
          </div>
        )}
      </div>
    </div>
  );
}

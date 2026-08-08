'use server';

import { createClient } from '@/utils/supabase/server';
import { getSesionActual } from '@/app/actions/auth';

export interface ItemIngresoContable {
  fecha: string;
  tipo: 'MEMBRESIA' | 'VENTA_TIENDA' | 'OTRO';
  concepto: string;
  cliente: string;
  dni: string;
  metodoPago: string;
  numeroOperacion: string;
  monto: number;
  responsable: string;
}

export interface ItemEgresoContable {
  fecha: string;
  categoria: string;
  concepto: string;
  descripcion: string;
  estado: 'PAGADO' | 'PENDIENTE' | 'VENCIDO' | 'OMITIDO';
  montoEstimado: number;
  montoFinal: number;
  responsable: string;
}

export interface ItemCajaContable {
  fecha: string;
  usuario: string;
  montoInicial: number;
  montoFinal: number | null;
  estado: 'ABIERTA' | 'CERRADA';
  fechaApertura: string;
  fechaCierre: string | null;
}

export interface ReporteContableMensual {
  periodo: {
    año: number;
    mes: number;
    nombreMes: string;
    fechaInicio: string;
    fechaFin: string;
  };
  totales: {
    ingresos: number;
    egresos: number;
    balanceNeto: number;
    gastosPendientes: number;
    totalTransacciones: number;
  };
  distribucionMetodosPago: {
    metodo: string;
    total: number;
    porcentaje: number;
  }[];
  distribucionCategoriasGasto: {
    categoria: string;
    total: number;
    porcentaje: number;
  }[];
  ingresos: ItemIngresoContable[];
  egresos: ItemEgresoContable[];
  cajas: ItemCajaContable[];
}

interface PagoReporteRaw {
  id_pago: number;
  concepto: string | null;
  monto: number;
  numero_operacion: string | null;
  estado: string;
  fecha_pago: string;
  fecha_actualizacion: string;
  metodos_pago: { nombre: string } | null;
  membresias: {
    id_membresia: number;
    tipos_membresia: { nombre: string } | null;
    clientes: { nombre: string; apellido: string | null; dni: string | null } | null;
  } | null;
  usuarios_sistema: { usuario: string } | null;
}

interface VentaReporteRaw {
  id_venta: number;
  total: number;
  metodo_pago: string | null;
  estado: string;
  fecha_venta: string;
  clientes: {
    nombre: string;
    apellido: string | null;
    dni: string | null;
  } | null;
  usuarios_sistema: { usuario: string } | null;
}

interface GastoReporteRaw {
  id_gasto: number;
  concepto: string | null;
  descripcion: string | null;
  monto_estimado: number;
  monto_final: number | null;
  fecha_programada: string;
  fecha_pago: string | null;
  estado: 'PAGADO' | 'PENDIENTE' | 'VENCIDO' | 'OMITIDO';
  categorias_gasto: { nombre: string } | null;
  usuarios_sistema: { usuario: string } | null;
}

interface CajaReporteRaw {
  id_caja: number;
  fecha: string;
  monto_inicial: number;
  monto_final: number | null;
  estado: 'ABIERTA' | 'CERRADA';
  fecha_apertura: string;
  fecha_cierre: string | null;
  usuarios_sistema: { usuario: string } | null;
}

const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export async function obtenerReporteContableMensual(
  año: number,
  mes: number // 1 a 12
): Promise<{ success?: boolean; error?: string; data?: ReporteContableMensual }> {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) {
    return { error: 'No autorizado. Por favor inicie sesión.' };
  }

  // Validar permisos (Admin o módulo Finanzas)
  const tieneAcceso = loggedInUser.usuario === 'admin' || loggedInUser.modulos?.includes('Finanzas');
  if (!tieneAcceso) {
    return { error: 'No tienes permisos para generar exportaciones contables.' };
  }

  try {
    const supabase = await createClient();

    // Rango de fechas del mes en formato ISO YYYY-MM-DD
    const mesFormateado = mes.toString().padStart(2, '0');
    const ultimoDia = new Date(año, mes, 0).getDate();
    const fechaInicio = `${año}-${mesFormateado}-01`;
    const fechaFin = `${año}-${mesFormateado}-${ultimoDia}`;
    const fechaInicioISO = `${fechaInicio}T00:00:00.000Z`;
    const fechaFinISO = `${fechaFin}T23:59:59.999Z`;

    // 1. OBTENER PAGOS DE MEMBRESÍAS Y COBROS
    const { data: pagos, error: errPagos } = await supabase
      .from('pagos')
      .select(`
        id_pago,
        concepto,
        monto,
        numero_operacion,
        estado,
        fecha_pago,
        fecha_actualizacion,
        metodos_pago(nombre),
        membresias(
          id_membresia,
          tipos_membresia(nombre),
          clientes(nombre, apellido, dni)
        ),
        usuarios_sistema(usuario)
      `)
      .gte('fecha_pago', fechaInicio)
      .lte('fecha_pago', fechaFin)
      .eq('estado', 'CONFIRMADO')
      .order('fecha_pago', { ascending: true });

    if (errPagos) {
      console.error('Error al consultar pagos para reporte contable:', errPagos);
    }

    // 2. OBTENER VENTAS DE PRODUCTOS DE LA TIENDA
    const { data: ventas, error: errVentas } = await supabase
      .from('ventas_productos')
      .select(`
        id_venta,
        total,
        metodo_pago,
        estado,
        fecha_venta,
        clientes(nombre, apellido, dni),
        usuarios_sistema(usuario)
      `)
      .gte('fecha_venta', fechaInicioISO)
      .lte('fecha_venta', fechaFinISO)
      .eq('estado', 'COMPLETADA')
      .order('fecha_venta', { ascending: true });

    if (errVentas) {
      console.error('Error al consultar ventas para reporte contable:', errVentas);
    }

    // 3. OBTENER GASTOS Y EGRESOS DEL MES
    const { data: gastos, error: errGastos } = await supabase
      .from('gastos')
      .select(`
        id_gasto,
        concepto,
        descripcion,
        monto_estimado,
        monto_final,
        fecha_programada,
        fecha_pago,
        estado,
        categorias_gasto(nombre),
        usuarios_sistema(usuario)
      `)
      .or(`and(fecha_pago.gte.${fechaInicio},fecha_pago.lte.${fechaFin}),and(fecha_programada.gte.${fechaInicio},fecha_programada.lte.${fechaFin})`)
      .order('fecha_programada', { ascending: true });

    if (errGastos) {
      console.error('Error al consultar gastos para reporte contable:', errGastos);
    }

    // 4. OBTENER ARQUEOS DE CAJA
    const { data: cajas, error: errCajas } = await supabase
      .from('cajas')
      .select(`
        id_caja,
        fecha,
        monto_inicial,
        monto_final,
        estado,
        fecha_apertura,
        fecha_cierre,
        usuarios_sistema(usuario)
      `)
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin)
      .order('fecha', { ascending: true });

    if (errCajas) {
      console.error('Error al consultar cajas para reporte contable:', errCajas);
    }

    // ----------------------------------------------------
    // PROCESAMIENTO Y CONSOLIDACIÓN DE DATOS
    // ----------------------------------------------------
    const listaIngresos: ItemIngresoContable[] = [];
    const metodosMap: Record<string, number> = {};
    let totalIngresos = 0;

    // Procesar Pagos
    const pagosTipados = (pagos || []) as unknown as PagoReporteRaw[];
    pagosTipados.forEach((p) => {
      const cli = p.membresias?.clientes;
      const clienteNombre = cli ? `${cli.nombre || ''} ${cli.apellido || ''}`.trim() || 'Cliente' : 'Cliente General';
      const clienteDni = cli?.dni || 'S/D';
      const metodo = p.metodos_pago?.nombre || 'Otros';
      const usuarioResp = p.usuarios_sistema?.usuario || 'Sistema';

      listaIngresos.push({
        fecha: p.fecha_pago,
        tipo: 'MEMBRESIA',
        concepto: p.concepto || 'Cobro de Membresía',
        cliente: clienteNombre,
        dni: clienteDni,
        metodoPago: metodo,
        numeroOperacion: p.numero_operacion || 'S/N',
        monto: Number(p.monto) || 0,
        responsable: usuarioResp
      });

      totalIngresos += Number(p.monto) || 0;
      metodosMap[metodo] = (metodosMap[metodo] || 0) + (Number(p.monto) || 0);
    });

    // Procesar Ventas de Tienda
    const ventasTipadas = (ventas || []) as unknown as VentaReporteRaw[];
    ventasTipadas.forEach((v) => {
      const cli = v.clientes;
      const clienteNombre = cli ? `${cli.nombre || ''} ${cli.apellido || ''}`.trim() || 'Cliente Mostrador' : 'Cliente Mostrador';
      const clienteDni = cli?.dni || 'S/D';
      const metodo = v.metodo_pago || 'Efectivo';
      const usuarioResp = v.usuarios_sistema?.usuario || 'Cajero';
      const fechaVentaCorta = v.fecha_venta ? v.fecha_venta.split('T')[0] : fechaInicio;

      listaIngresos.push({
        fecha: fechaVentaCorta,
        tipo: 'VENTA_TIENDA',
        concepto: `Venta de Mostrador #${v.id_venta}`,
        cliente: clienteNombre,
        dni: clienteDni,
        metodoPago: metodo,
        numeroOperacion: 'VENTA-' + v.id_venta,
        monto: Number(v.total) || 0,
        responsable: usuarioResp
      });

      totalIngresos += Number(v.total) || 0;
      metodosMap[metodo] = (metodosMap[metodo] || 0) + (Number(v.total) || 0);
    });

    // Procesar Gastos y Egresos
    const listaEgresos: ItemEgresoContable[] = [];
    const categoriasMap: Record<string, number> = {};
    let totalEgresosPagados = 0;
    let totalGastosPendientes = 0;

    const gastosTipados = (gastos || []) as unknown as GastoReporteRaw[];
    gastosTipados.forEach((g) => {
      const cat = g.categorias_gasto?.nombre || 'General';
      const usuarioResp = g.usuarios_sistema?.usuario || 'Administración';
      const montoEstimado = Number(g.monto_estimado) || 0;
      const montoFinal = g.monto_final !== null && g.monto_final !== undefined ? Number(g.monto_final) : montoEstimado;
      const fechaRegistro = g.fecha_pago || g.fecha_programada;

      listaEgresos.push({
        fecha: fechaRegistro,
        categoria: cat,
        concepto: g.concepto || 'Gasto Operativo',
        descripcion: g.descripcion || '',
        estado: g.estado || 'PENDIENTE',
        montoEstimado: montoEstimado,
        montoFinal: montoFinal,
        responsable: usuarioResp
      });

      if (g.estado === 'PAGADO') {
        totalEgresosPagados += montoFinal;
        categoriasMap[cat] = (categoriasMap[cat] || 0) + montoFinal;
      } else if (g.estado === 'PENDIENTE') {
        totalGastosPendientes += montoEstimado;
      }
    });

    // Procesar Cajas
    const cajasTipadas = (cajas || []) as unknown as CajaReporteRaw[];
    const listaCajas: ItemCajaContable[] = cajasTipadas.map((c) => ({
      fecha: c.fecha,
      usuario: c.usuarios_sistema?.usuario || 'Cajero',
      montoInicial: Number(c.monto_inicial) || 0,
      montoFinal: c.monto_final !== null ? Number(c.monto_final) : null,
      estado: c.estado,
      fechaApertura: c.fecha_apertura,
      fechaCierre: c.fecha_cierre
    }));

    // Métodos de Pago y Categorías
    const distribucionMetodosPago = Object.entries(metodosMap).map(([metodo, total]) => ({
      metodo,
      total,
      porcentaje: totalIngresos > 0 ? (total / totalIngresos) * 100 : 0
    })).sort((a, b) => b.total - a.total);

    const distribucionCategoriasGasto = Object.entries(categoriasMap).map(([categoria, total]) => ({
      categoria,
      total,
      porcentaje: totalEgresosPagados > 0 ? (total / totalEgresosPagados) * 100 : 0
    })).sort((a, b) => b.total - a.total);

    const balanceNeto = totalIngresos - totalEgresosPagados;

    const reporte: ReporteContableMensual = {
      periodo: {
        año,
        mes,
        nombreMes: NOMBRES_MESES[mes - 1] || 'Mes',
        fechaInicio,
        fechaFin
      },
      totales: {
        ingresos: totalIngresos,
        egresos: totalEgresosPagados,
        balanceNeto,
        gastosPendientes: totalGastosPendientes,
        totalTransacciones: listaIngresos.length + listaEgresos.length
      },
      distribucionMetodosPago,
      distribucionCategoriasGasto,
      ingresos: listaIngresos,
      egresos: listaEgresos,
      cajas: listaCajas
    };

    return { success: true, data: reporte };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error general al generar reporte contable:', error);
    return { error: `Error al generar reporte contable: ${errorMsg}` };
  }
}

'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { getSesionActual } from '@/app/actions/auth';
import { obtenerCajaActiva } from '@/app/actions/caja';

export interface VentaProductoItem {
  id_producto: number;
  cantidad: number;
  precio_unitario: number;
}

export async function registrarVentaProductos(
  idCliente: number | null,
  items: VentaProductoItem[],
  metodoPago: string,
  stripeIntentId?: string,
  comprobanteUrl?: string
) {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) {
    return { error: 'No autorizado. Por favor inicie sesión.' };
  }

  if (!items || items.length === 0) {
    return { error: 'Debes seleccionar al menos un producto para la venta.' };
  }

  const supabase = await createClient();

  // 1. Validar que la caja esté ABIERTA
  const cajaActiva = await obtenerCajaActiva();
  if (!cajaActiva) {
    return { error: 'Debes tener una caja ABIERTA en tu turno para registrar ventas de productos. Ve al módulo "Arqueo de Caja".' };
  }

  // 2. Validar existencias de stock y precios de todos los productos
  const total = items.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);

  if (total <= 0) {
    return { error: 'El total de la venta debe ser mayor a cero.' };
  }

  // Verificar cada producto
  for (const item of items) {
    const { data: prod, error: errProd } = await supabase
      .from('productos')
      .select('stock, nombre, estado')
      .eq('id_producto', item.id_producto)
      .single();

    if (errProd || !prod) {
      return { error: `El producto con ID ${item.id_producto} no existe.` };
    }

    if (prod.estado === 'INACTIVO') {
      return { error: `El producto "${prod.nombre}" no está activo y no se puede vender.` };
    }

    if (prod.stock < item.cantidad) {
      return { error: `Stock insuficiente para "${prod.nombre}". Solicitado: ${item.cantidad}, Disponible: ${prod.stock}.` };
    }
  }

  // 3. Registrar Venta Principal
  const basePayload: Record<string, unknown> = {
    id_cliente: idCliente || null,
    id_usuario: loggedInUser.id_usuario,
    total: total,
    estado: 'COMPLETADA'
  };

  let { data: venta, error: errVenta } = await supabase
    .from('ventas_productos')
    .insert({
      ...basePayload,
      id_caja: cajaActiva.id_caja,
      metodo_pago: metodoPago,
      id_stripe_intent: stripeIntentId || null,
      comprobante_url: comprobanteUrl || null
    })
    .select()
    .single();

  // Si falló por columnas que aún no existen en el schema (ej. id_caja, metodo_pago, comprobante_url)
  if (errVenta && (errVenta.message?.includes('column') || errVenta.code === 'PGRST204')) {
    const fallback = await supabase
      .from('ventas_productos')
      .insert(basePayload)
      .select()
      .single();

    venta = fallback.data;
    errVenta = fallback.error;
  }

  if (errVenta || !venta) {
    console.error('Error al crear venta de productos:', errVenta);
    return { error: `Error al registrar la venta: ${errVenta?.message}` };
  }

  // 4. Registrar detalles de venta, disminuir stock y registrar movimientos de inventario
  for (const item of items) {
    const subtotal = item.cantidad * item.precio_unitario;

    // A. Detalle
    const { error: errDetalle } = await supabase
      .from('detalle_ventas_productos')
      .insert({
        id_venta: venta.id_venta,
        id_producto: item.id_producto,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: subtotal
      });

    if (errDetalle) {
      console.error('Error al registrar detalle de venta:', errDetalle);
    }

    // B. Obtener stock actual para el descuento
    const { data: prodData } = await supabase
      .from('productos')
      .select('stock, nombre')
      .eq('id_producto', item.id_producto)
      .single();

    const stockActual = prodData?.stock || 0;
    const nuevoStock = stockActual - item.cantidad;

    // C. Disminuir stock
    await supabase
      .from('productos')
      .update({ stock: nuevoStock })
      .eq('id_producto', item.id_producto);

    // D. Registrar movimiento de inventario (EGRESO por Venta)
    await supabase
      .from('movimientos_inventario')
      .insert({
        id_producto: item.id_producto,
        id_usuario: loggedInUser.id_usuario,
        tipo: 'VENTA',
        cantidad: -item.cantidad,
        concepto: `Venta de productos en Tkt #${venta.id_venta}`
      });
  }

  // 5. Registrar movimiento en la caja diaria activa (INGRESO)
  const { error: errMovCaja } = await supabase
    .from('movimientos_caja')
    .insert({
      id_caja: cajaActiva.id_caja,
      id_usuario: loggedInUser.id_usuario,
      tipo: 'INGRESO',
      concepto: `Venta Tienda Tkt #${venta.id_venta} (${metodoPago})`,
      monto: total
    });

  if (errMovCaja) {
    console.error('Error al registrar ingreso en caja:', errMovCaja);
  }

  // 6. Log de Auditoría
  await supabase.from('logs_seguridad').insert({
    id_usuario: loggedInUser.id_usuario,
    accion: 'VENTA_TIENDA',
    detalle: `Venta de productos completada con éxito. Ticket: #${venta.id_venta}, Total: S/ ${total.toFixed(2)}, Mét. Pago: ${metodoPago}`
  });

  revalidatePath('/admin/caja');
  revalidatePath('/admin/ventas');
  revalidatePath('/admin');
  
  return { success: true, id_venta: venta.id_venta };
}

export interface ReporteVentaItem {
  id: number;
  tipoVenta: 'TIENDA' | 'MEMBRESIA';
  fecha: string;
  total: number;
  metodoPago: string;
  clienteNombre: string;
  clienteDni: string | null;
  usuarioNombre: string;
  numeroOperacion?: string | null;
  comprobanteUrl?: string | null;
  requiereComprobante: boolean;
  detalles: {
    nombre: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
    imagenUrl?: string | null;
  }[];
}

interface ClienteJoin {
  nombre?: string | null;
  apellido?: string | null;
  dni?: string | null;
}

interface UsuarioJoin {
  usuario?: string | null;
}

interface ProductoJoin {
  nombre?: string | null;
  imagen_url?: string | null;
}

interface DetalleVentaJoin {
  cantidad?: number | null;
  precio_unitario?: number | null;
  subtotal?: number | null;
  productos?: ProductoJoin | ProductoJoin[] | null;
}

interface VentaTiendaRow {
  id_venta: number;
  fecha?: string | null;
  created_at?: string | null;
  total?: number | null;
  id_cliente?: number | null;
  id_usuario?: number | null;
  metodo_pago?: string | null;
  comprobante_url?: string | null;
  clientes?: ClienteJoin | ClienteJoin[] | null;
  usuarios_sistema?: UsuarioJoin | UsuarioJoin[] | null;
  detalle_ventas_productos?: DetalleVentaJoin[] | null;
}

interface TipoMembresiaJoin {
  nombre?: string | null;
}

interface MembresiaClienteJoin {
  precio_pagado?: number | null;
  fecha_inicio?: string | null;
  clientes?: ClienteJoin | ClienteJoin[] | null;
  tipos_membresia?: TipoMembresiaJoin | TipoMembresiaJoin[] | null;
}

interface MetodoPagoJoin {
  nombre?: string | null;
}

interface PagoRow {
  id_pago: number;
  monto?: number | null;
  concepto?: string | null;
  numero_operacion?: string | null;
  fecha?: string | null;
  created_at?: string | null;
  fecha_creacion?: string | null;
  metodo?: string | null;
  comprobante_url?: string | null;
  metodos_pago?: MetodoPagoJoin | MetodoPagoJoin[] | null;
  usuarios_sistema?: UsuarioJoin | UsuarioJoin[] | null;
  membresias_cliente?: MembresiaClienteJoin | MembresiaClienteJoin[] | null;
}

/**
 * Obtiene el listado de todas las ventas agrupadas y filtradas por fecha (Día seleccionado)
 */
export async function obtenerVentasReportePorDia(fechaSeleccionada?: string): Promise<ReporteVentaItem[]> {
  try {
    const supabase = await createClient();
    
    // Obtener la fecha local seleccionada (por defecto hoy en la zona horaria del cliente)
    const fechaFiltro = fechaSeleccionada || new Date().toISOString().split('T')[0];

    // Calcular el rango UTC exacto que corresponde al día local completo (00:00:00 a 23:59:59 en hora local)
    // Para cubrir diferencias de husos horarios (-12h a +14h), abrimos una ventana que cubra el día local
    const dStart = new Date(`${fechaFiltro}T00:00:00`);
    const dEnd = new Date(`${fechaFiltro}T23:59:59.999`);
    
    // Si la fecha parseada es válida usamos su ISO string, con un margen de seguridad amplio
    const fechaInicioIso = !isNaN(dStart.getTime()) 
      ? dStart.toISOString() 
      : `${fechaFiltro}T00:00:00.000Z`;
    const fechaFinIso = !isNaN(dEnd.getTime()) 
      ? dEnd.toISOString() 
      : `${fechaFiltro}T23:59:59.999Z`;

    // También creamos un margen amplio de 24 horas antes y después para filtrar en memoria por fecha local exacta
    const margenInicio = new Date(dStart.getTime() - 24 * 3600 * 1000).toISOString();
    const margenFin = new Date(dEnd.getTime() + 24 * 3600 * 1000).toISOString();

    const resultados: ReporteVentaItem[] = [];

    // Helper para verificar si un timestamp UTC cae en el día local 'YYYY-MM-DD'
    const esMismoDiaLocal = (isoString: string, targetYmd: string) => {
      try {
        const d = new Date(isoString);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const localYmd = `${y}-${m}-${day}`;
        return localYmd === targetYmd;
      } catch {
        return isoString.startsWith(targetYmd);
      }
    };

    // 1. Obtener ventas de productos (Tienda)
    // Intentamos seleccionar campos base sin forzar comprobante_url si aún no existe la columna en Supabase
    let ventasTienda: VentaTiendaRow[] = [];
    
    // Intento 1: Selección completa con joins
    const { data: vtData1, error: errTienda1 } = await supabase
      .from('ventas_productos')
      .select(`
        id_venta,
        fecha,
        total,
        id_cliente,
        id_usuario,
        clientes(nombre, apellido, dni),
        usuarios_sistema(usuario),
        detalle_ventas_productos(
          cantidad,
          precio_unitario,
          subtotal,
          productos(nombre, imagen_url)
        )
      `)
      .order('fecha', { ascending: false });

    if (errTienda1) {
      // Intento 2 (Fallback): Selección simple
      const { data: vtData2 } = await supabase
        .from('ventas_productos')
        .select('*');
      ventasTienda = (vtData2 as unknown as VentaTiendaRow[]) || [];
    } else {
      ventasTienda = (vtData1 as unknown as VentaTiendaRow[]) || [];
    }

    if (ventasTienda) {
      for (const vt of ventasTienda) {
        const fechaRegistro = vt.fecha || vt.created_at || new Date().toISOString();
        // Filtrar para que pertenezca al día local seleccionado
        if (!esMismoDiaLocal(fechaRegistro, fechaFiltro)) {
          continue;
        }

        const cli = Array.isArray(vt.clientes) ? vt.clientes[0] : vt.clientes;
        const usr = Array.isArray(vt.usuarios_sistema) ? vt.usuarios_sistema[0] : vt.usuarios_sistema;
        const rawDetalles = vt.detalle_ventas_productos || [];
        
        const detalles = rawDetalles.map((d) => {
          const pObj = Array.isArray(d.productos) ? d.productos[0] : d.productos;
          return {
            nombre: pObj?.nombre || 'Producto de Tienda',
            cantidad: d.cantidad || 1,
            precioUnitario: Number(d.precio_unitario || 0),
            subtotal: Number(d.subtotal || 0),
            imagenUrl: pObj?.imagen_url || null
          };
        });

        if (detalles.length === 0) {
          detalles.push({
            nombre: 'Venta de Productos (Tienda)',
            cantidad: 1,
            precioUnitario: Number(vt.total || 0),
            subtotal: Number(vt.total || 0),
            imagenUrl: null
          });
        }

        const metodo = vt.metodo_pago || 'Efectivo';
        const requiereComprobante = ['yape', 'plin'].includes(metodo.toLowerCase());

        resultados.push({
          id: vt.id_venta,
          tipoVenta: 'TIENDA',
          fecha: fechaRegistro,
          total: Number(vt.total || 0),
          metodoPago: metodo,
          clienteNombre: cli?.nombre ? `${cli.nombre} ${cli.apellido || ''}`.trim() : 'Cliente Mostrador (Anónimo)',
          clienteDni: cli?.dni || null,
          usuarioNombre: usr?.usuario || 'Cajero / Sistema',
          comprobanteUrl: vt.comprobante_url || null,
          requiereComprobante,
          detalles
        });
      }
    }

    // 2. Obtener cobros de membresías (Pagos)
    // Usamos columnas existentes (monto, concepto, numero_operacion, etc.) sin forzar fecha que puede no existir
    let pagosMemb: PagoRow[] = [];

    const { data: pData1, error: errPagos1 } = await supabase
      .from('pagos')
      .select(`
        id_pago,
        monto,
        concepto,
        numero_operacion,
        metodos_pago(nombre),
        usuarios_sistema(usuario),
        membresias_cliente(
          precio_pagado,
          fecha_inicio,
          clientes(nombre, apellido, dni),
          tipos_membresia(nombre)
        )
      `);

    if (errPagos1) {
      // Fallback simple a pagos
      const { data: pData2 } = await supabase
        .from('pagos')
        .select('*');
      pagosMemb = (pData2 as unknown as PagoRow[]) || [];
    } else {
      pagosMemb = (pData1 as unknown as PagoRow[]) || [];
    }

    if (pagosMemb) {
      for (const p of pagosMemb) {
        const mc = Array.isArray(p.membresias_cliente) ? p.membresias_cliente[0] : p.membresias_cliente;
        const fechaPago = p.fecha || p.created_at || mc?.fecha_inicio || p.fecha_creacion || new Date().toISOString();

        if (!esMismoDiaLocal(fechaPago, fechaFiltro)) {
          continue;
        }

        const cli = mc ? (Array.isArray(mc.clientes) ? mc.clientes[0] : mc.clientes) : null;
        const plan = mc ? (Array.isArray(mc.tipos_membresia) ? mc.tipos_membresia[0] : mc.tipos_membresia) : null;
        const mp = Array.isArray(p.metodos_pago) ? p.metodos_pago[0] : p.metodos_pago;
        const usr = Array.isArray(p.usuarios_sistema) ? p.usuarios_sistema[0] : p.usuarios_sistema;

        const metodo = mp?.nombre || p.metodo || 'Efectivo';
        const requiereComprobante = ['yape', 'plin'].includes(metodo.toLowerCase());

        resultados.push({
          id: p.id_pago,
          tipoVenta: 'MEMBRESIA',
          fecha: fechaPago,
          total: Number(p.monto || 0),
          metodoPago: metodo,
          clienteNombre: cli?.nombre ? `${cli.nombre} ${cli.apellido || ''}`.trim() : 'Cliente sin nombre',
          clienteDni: cli?.dni || null,
          usuarioNombre: usr?.usuario || 'Sistema',
          numeroOperacion: p.numero_operacion || null,
          comprobanteUrl: p.comprobante_url || null,
          requiereComprobante,
          detalles: [
            {
              nombre: plan?.nombre ? `Membresía: ${plan.nombre}` : p.concepto || 'Membresía Gimnasio',
              cantidad: 1,
              precioUnitario: Number(p.monto || 0),
              subtotal: Number(p.monto || 0)
            }
          ]
        });
      }
    }

    // Ordenar por fecha descendente
    resultados.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    return resultados;
  } catch (error) {
    console.error('Error al obtener ventas del día:', error);
    return [];
  }
}

/**
 * Permite subir o actualizar la foto del voucher para una venta (Yape / Plin)
 */
export async function subirComprobanteVenta(
  id: number,
  tipoVenta: 'TIENDA' | 'MEMBRESIA',
  comprobanteBase64: string
) {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) {
    return { error: 'No autorizado.' };
  }

  const supabase = await createClient();

  if (tipoVenta === 'TIENDA') {
    const { error } = await supabase
      .from('ventas_productos')
      .update({ comprobante_url: comprobanteBase64 })
      .eq('id_venta', id);

    if (error) {
      console.error('Error al actualizar comprobante de tienda:', error);
      return { error: error.message };
    }
  } else {
    const { error } = await supabase
      .from('pagos')
      .update({ comprobante_url: comprobanteBase64 })
      .eq('id_pago', id);

    if (error) {
      console.error('Error al actualizar comprobante de membresía:', error);
      return { error: error.message };
    }
  }

  revalidatePath('/admin/ventas');
  return { success: true };
}

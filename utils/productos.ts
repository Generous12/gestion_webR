import { Producto } from '@/app/actions/productos';

/**
 * Función auxiliar para procesar descuentos y normalizar datos de productos
 */
export function procesarProductoConDescuento(raw: Record<string, unknown>): Producto {
  let descPorcentaje = typeof raw.descuento_porcentaje === 'number' ? raw.descuento_porcentaje : 0;
  let cleanDesc = (raw.descripcion as string) || '';

  // Fallback: si no hay columna en BD, buscar tag [DESC:X] en descripción
  if (!descPorcentaje && cleanDesc) {
    const match = cleanDesc.match(/\[DESC:(\d+)\]/);
    if (match && match[1]) {
      descPorcentaje = parseInt(match[1], 10);
      cleanDesc = cleanDesc.replace(/\[DESC:\d+\]\s*/, '');
    }
  }

  const precioVenta = Number(raw.precio_venta || 0);
  const precioFinal = descPorcentaje > 0
    ? Math.round(precioVenta * (1 - descPorcentaje / 100) * 100) / 100
    : precioVenta;

  return {
    id_producto: Number(raw.id_producto),
    nombre: String(raw.nombre),
    descripcion: cleanDesc || null,
    precio_compra: raw.precio_compra !== null ? Number(raw.precio_compra) : null,
    precio_venta: precioVenta,
    descuento_porcentaje: descPorcentaje > 0 ? descPorcentaje : null,
    precio_final: precioFinal,
    stock: Number(raw.stock || 0),
    imagen_url: (raw.imagen_url as string) || null,
    codigo_barras: (raw.codigo_barras as string) || null,
    estado: (raw.estado as 'ACTIVO' | 'INACTIVO') || 'ACTIVO',
    fecha_creacion: (raw.fecha_creacion as string) || undefined
  };
}

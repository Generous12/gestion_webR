'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { getSesionActual } from '@/app/actions/auth';

export interface Producto {
  id_producto: number;
  nombre: string;
  descripcion: string | null;
  precio_compra: number | null;
  precio_venta: number;
  descuento_porcentaje?: number | null;
  precio_final?: number;
  stock: number;
  imagen_url: string | null;
  codigo_barras: string | null;
  estado: 'ACTIVO' | 'INACTIVO';
  fecha_creacion?: string;
}

export interface MovimientoInventario {
  id_mov_inventario: number;
  id_producto: number;
  id_usuario: number;
  tipo: 'INGRESO' | 'EGRESO' | 'VENTA' | 'AJUSTE';
  cantidad: number;
  concepto: string;
  fecha: string;
  usuarios_sistema?: {
    usuario: string;
  };
}

import { procesarProductoConDescuento } from '@/utils/productos';

// Obtener catálogo de productos
export async function obtenerProductos() {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .order('nombre', { ascending: true });

  if (error) {
    console.error('Error al obtener productos:', error);
    return [];
  }

  return (data || []).map(p => procesarProductoConDescuento(p));
}

// Guardar o Editar Producto
export async function guardarProducto(formData: FormData) {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) {
    return { error: 'No autorizado. Por favor inicie sesión.' };
  }

  const supabase = await createClient();

  const idProductoStr = formData.get('id_producto') as string;
  const nombre = formData.get('nombre') as string;
  const descripcion = formData.get('descripcion') as string || '';
  const precioCompraStr = formData.get('precio_compra') as string;
  const precioVentaStr = formData.get('precio_venta') as string;
  const descuentoStr = formData.get('descuento_porcentaje') as string;
  const stockStr = formData.get('stock') as string;
  const codigoBarras = formData.get('codigo_barras') as string;
  const estado = formData.get('estado') as 'ACTIVO' | 'INACTIVO';
  const imagenFile = formData.get('imagen_file') as File | null;

  if (!nombre || !precioVentaStr) {
    return { error: 'El nombre y el precio de venta son obligatorios.' };
  }

  const precioVenta = parseFloat(precioVentaStr);
  const precioCompra = precioCompraStr ? parseFloat(precioCompraStr) : null;
  const descuentoPorcentaje = descuentoStr ? Math.min(99, Math.max(0, parseInt(descuentoStr, 10))) : 0;
  const stock = stockStr ? parseInt(stockStr) : 0;

  if (precioVenta < 0 || (precioCompra !== null && precioCompra < 0)) {
    return { error: 'Los precios no pueden ser negativos.' };
  }

  // Manejar carga de imagen
  let imagenUrl: string | null = (formData.get('imagen_url') as string) || null;

  if (imagenFile && imagenFile.size > 0) {
    try {
      const fileExt = imagenFile.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('productos')
        .upload(fileName, imagenFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (!uploadError && uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from('productos')
          .getPublicUrl(fileName);
        imagenUrl = publicUrlData.publicUrl;
      } else {
        // Si no hay bucket o tiene política RLS estricta, almacenar Base64 ligero
        const buffer = await imagenFile.arrayBuffer();
        const base64String = Buffer.from(buffer).toString('base64');
        imagenUrl = `data:${imagenFile.type || 'image/jpeg'};base64,${base64String}`;
      }
    } catch {
      // Fallback a Base64
      try {
        const buffer = await imagenFile.arrayBuffer();
        const base64String = Buffer.from(buffer).toString('base64');
        imagenUrl = `data:${imagenFile.type || 'image/jpeg'};base64,${base64String}`;
      } catch (err) {
        console.error('Error al codificar imagen:', err);
      }
    }
  }

  // Formatear tag de descuento en descripción si aplica
  let finalDescripcion = descripcion ? descripcion.replace(/\[DESC:\d+\]\s*/, '').trim() : '';
  if (descuentoPorcentaje > 0) {
    finalDescripcion = `[DESC:${descuentoPorcentaje}] ${finalDescripcion}`.trim();
  }

  const isEdit = !!idProductoStr;
  const idProducto = isEdit ? parseInt(idProductoStr) : null;

  // Validar código de barras duplicado
  if (codigoBarras) {
    const query = supabase
      .from('productos')
      .select('id_producto')
      .eq('codigo_barras', codigoBarras);
    
    if (isEdit && idProducto) {
      query.neq('id_producto', idProducto);
    }
    
    const { data: existingBarcode } = await query.maybeSingle();
    if (existingBarcode) {
      return { error: 'Ya existe otro producto registrado con este código de barras.' };
    }
  }

  if (isEdit && idProducto) {
    // Modo Edición: intentamos actualizar con descuento_porcentaje y si no existe la columna, actualizamos estándar
    const payload: Record<string, unknown> = {
      nombre,
      descripcion: finalDescripcion || null,
      precio_compra: precioCompra,
      precio_venta: precioVenta,
      stock,
      imagen_url: imagenUrl,
      codigo_barras: codigoBarras || null,
      estado
    };

    let { error: updateError } = await supabase
      .from('productos')
      .update({ ...payload, descuento_porcentaje: descuentoPorcentaje })
      .eq('id_producto', idProducto);

    if (updateError && updateError.code === 'PGRST204') {
      // Columna no existe en esquema de BD, actualizamos con descripción formateada
      const resFallback = await supabase
        .from('productos')
        .update(payload)
        .eq('id_producto', idProducto);
      updateError = resFallback.error;
    }

    if (updateError) {
      console.error('Error al editar producto:', updateError);
      return { error: `No se pudo actualizar el producto: ${updateError.message}` };
    }

    // Registrar log
    await supabase.from('logs_seguridad').insert({
      id_usuario: loggedInUser.id_usuario,
      accion: 'EDICION_PRODUCTO',
      detalle: `Producto editado. ID: ${idProducto}, Nombre: ${nombre}, Descuento: ${descuentoPorcentaje}%`
    });

  } else {
    // Modo Creación
    const payload: Record<string, unknown> = {
      nombre,
      descripcion: finalDescripcion || null,
      precio_compra: precioCompra,
      precio_venta: precioVenta,
      stock,
      imagen_url: imagenUrl,
      codigo_barras: codigoBarras || null,
      estado: 'ACTIVO'
    };

    let { data: newProd, error: insertError } = await supabase
      .from('productos')
      .insert({ ...payload, descuento_porcentaje: descuentoPorcentaje })
      .select()
      .single();

    if (insertError && insertError.code === 'PGRST204') {
      const resFallback = await supabase
        .from('productos')
        .insert(payload)
        .select()
        .single();
      newProd = resFallback.data;
      insertError = resFallback.error;
    }

    if (insertError || !newProd) {
      console.error('Error al insertar producto:', insertError);
      return { error: `No se pudo registrar el producto: ${insertError?.message}` };
    }

    // Registrar movimiento inicial en el inventario si stock > 0
    if (stock > 0) {
      await supabase
        .from('movimientos_inventario')
        .insert({
          id_producto: newProd.id_producto,
          id_usuario: loggedInUser.id_usuario,
          tipo: 'INGRESO',
          cantidad: stock,
          concepto: 'Inventario inicial registrado'
        });
    }

    // Registrar log
    await supabase.from('logs_seguridad').insert({
      id_usuario: loggedInUser.id_usuario,
      accion: 'CREACION_PRODUCTO',
      detalle: `Nuevo producto creado. ID: ${newProd.id_producto}, Nombre: ${nombre}, Stock: ${stock}, Descuento: ${descuentoPorcentaje}%`
    });
  }

  try {
    revalidatePath('/admin/inventario');
    revalidatePath('/admin/ventas');
    revalidatePath('/tienda');
  } catch {
    // Ignorado si se ejecuta fuera de request scope
  }

  return { success: true };
}

// Registrar Ajuste de Stock Manual
export async function registrarAjusteStock(idProducto: number, cantidad: number, concepto: string) {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) {
    return { error: 'No autorizado. Por favor inicie sesión.' };
  }

  if (cantidad === 0) {
    return { error: 'La cantidad del ajuste no puede ser cero.' };
  }

  if (!concepto || concepto.trim() === '') {
    return { error: 'Debes ingresar un motivo o concepto para el ajuste de stock.' };
  }

  const supabase = await createClient();

  // 1. Obtener stock actual
  const { data: prod, error: errProd } = await supabase
    .from('productos')
    .select('stock, nombre')
    .eq('id_producto', idProducto)
    .single();

  if (errProd || !prod) {
    return { error: 'El producto seleccionado no existe.' };
  }

  const nuevoStock = prod.stock + cantidad;
  if (nuevoStock < 0) {
    return { error: `El ajuste daría como resultado un stock negativo (${nuevoStock}). El stock actual es ${prod.stock}.` };
  }

  // 2. Actualizar stock
  const { error: errUpdate } = await supabase
    .from('productos')
    .update({ stock: nuevoStock })
    .eq('id_producto', idProducto);

  if (errUpdate) {
    console.error('Error al ajustar stock:', errUpdate);
    return { error: `No se pudo actualizar el stock: ${errUpdate.message}` };
  }

  // 3. Registrar movimiento de inventario
  const tipo = cantidad > 0 ? 'INGRESO' : 'EGRESO';
  const { error: errMov } = await supabase
    .from('movimientos_inventario')
    .insert({
      id_producto: idProducto,
      id_usuario: loggedInUser.id_usuario,
      tipo: tipo === 'INGRESO' ? 'INGRESO' : 'EGRESO',
      cantidad: cantidad,
      concepto: concepto.trim()
    });

  if (errMov) {
    console.error('Error al registrar movimiento inventario:', errMov);
  }

  // 4. Log
  await supabase.from('logs_seguridad').insert({
    id_usuario: loggedInUser.id_usuario,
    accion: 'AJUSTE_INVENTARIO',
    detalle: `Ajuste de stock para "${prod.nombre}". Cantidad: ${cantidad > 0 ? '+' : ''}${cantidad}, Stock resultante: ${nuevoStock}`
  });

  try {
    revalidatePath('/admin/inventario');
    revalidatePath('/admin/ventas');
  } catch {}

  return { success: true };
}

// Obtener historial de movimientos de inventario de un producto
export async function obtenerMovimientosInventario(idProducto: number): Promise<MovimientoInventario[]> {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('movimientos_inventario')
    .select('*, usuarios_sistema(usuario)')
    .eq('id_producto', idProducto)
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error al obtener movimientos de inventario:', error);
    return [];
  }

  return (data || []) as unknown as MovimientoInventario[];
}

// Cambiar estado Activo / Inactivo de un producto
export async function cambiarEstadoProducto(idProducto: number, nuevoEstado: 'ACTIVO' | 'INACTIVO') {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) {
    return { error: 'No autorizado. Por favor inicie sesión.' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('productos')
    .update({ estado: nuevoEstado })
    .eq('id_producto', idProducto);

  if (error) {
    console.error('Error al cambiar estado producto:', error);
    return { error: `No se pudo cambiar el estado: ${error.message}` };
  }

  await supabase.from('logs_seguridad').insert({
    id_usuario: loggedInUser.id_usuario,
    accion: 'CAMBIO_ESTADO_PRODUCTO',
    detalle: `Producto ID ${idProducto} cambiado a estado ${nuevoEstado}`
  });

  try {
    revalidatePath('/admin/inventario');
    revalidatePath('/admin/ventas');
    revalidatePath('/tienda');
  } catch {}

  return { success: true };
}

// Eliminar producto de forma segura (Soft-delete vs Hard-delete)
export async function eliminarProducto(idProducto: number): Promise<{ success?: boolean; error?: string; softDeleted?: boolean; message?: string }> {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) {
    return { error: 'No autorizado. Por favor inicie sesión.' };
  }

  const esAdmin = loggedInUser.usuario === 'admin' || loggedInUser.roles?.includes('Super Admin') || loggedInUser.roles?.includes('Administrador');
  if (!esAdmin) {
    return { error: 'Solo los administradores tienen permisos para eliminar productos.' };
  }

  const supabase = await createClient();

  // 1. Obtener datos del producto
  const { data: prod, error: errProd } = await supabase
    .from('productos')
    .select('nombre')
    .eq('id_producto', idProducto)
    .single();

  if (errProd || !prod) {
    return { error: 'El producto no existe o ya fue eliminado.' };
  }

  // 2. Intentar eliminación física
  const { error: errDelete } = await supabase
    .from('productos')
    .delete()
    .eq('id_producto', idProducto);

  if (!errDelete) {
    await supabase.from('logs_seguridad').insert({
      id_usuario: loggedInUser.id_usuario,
      accion: 'ELIMINACION_FISICA_PRODUCTO',
      detalle: `Producto "${prod.nombre}" (ID: ${idProducto}) eliminado físicamente del catálogo.`
    });

    try {
      revalidatePath('/admin/inventario');
      revalidatePath('/admin/ventas');
      revalidatePath('/tienda');
    } catch {}

    return { success: true, softDeleted: false, message: `El producto "${prod.nombre}" ha sido eliminado del catálogo.` };
  }

  // 3. Si falla por claves foráneas (código 23503), aplicar Soft-Delete
  if (errDelete.code === '23503') {
    const { error: errSoft } = await supabase
      .from('productos')
      .update({ estado: 'INACTIVO' })
      .eq('id_producto', idProducto);

    if (errSoft) {
      return { error: `No se pudo archivar el producto: ${errSoft.message}` };
    }

    await supabase.from('logs_seguridad').insert({
      id_usuario: loggedInUser.id_usuario,
      accion: 'DESACTIVACION_PRODUCTO_FK',
      detalle: `Producto "${prod.nombre}" (ID: ${idProducto}) archivado como INACTIVO debido a que tiene ventas o movimientos históricos.`
    });

    try {
      revalidatePath('/admin/inventario');
      revalidatePath('/admin/ventas');
      revalidatePath('/tienda');
    } catch {}

    return {
      success: true,
      softDeleted: true,
      message: `El producto "${prod.nombre}" no se puede borrar permanentemente porque tiene ventas registradas en el historial. Ha sido archivado como INACTIVO.`
    };
  }

  return { error: `Error al eliminar producto: ${errDelete.message}` };
}

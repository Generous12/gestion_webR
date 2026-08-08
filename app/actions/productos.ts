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

  return data as Producto[];
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
  const descripcion = formData.get('descripcion') as string;
  const precioCompraStr = formData.get('precio_compra') as string;
  const precioVentaStr = formData.get('precio_venta') as string;
  const stockStr = formData.get('stock') as string;
  const codigoBarras = formData.get('codigo_barras') as string;
  const estado = formData.get('estado') as 'ACTIVO' | 'INACTIVO';
  const imagenFile = formData.get('imagen_file') as File | null;

  if (!nombre || !precioVentaStr) {
    return { error: 'El nombre y el precio de venta son obligatorios.' };
  }

  const precioVenta = parseFloat(precioVentaStr);
  const precioCompra = precioCompraStr ? parseFloat(precioCompraStr) : null;
  const stock = stockStr ? parseInt(stockStr) : 0;

  if (precioVenta < 0 || (precioCompra !== null && precioCompra < 0)) {
    return { error: 'Los precios no pueden ser negativos.' };
  }

  // Manejar carga de imagen
  let imagenUrl: string | null = formData.get('imagen_url') as string || null;

  if (imagenFile && imagenFile.size > 0) {
    try {
      // 1. Intentar subir a Supabase Storage
      const fileExt = imagenFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('productos')
        .upload(fileName, imagenFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (!uploadError && uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from('productos')
          .getPublicUrl(fileName);
        imagenUrl = publicUrlData.publicUrl;
      } else {
        // 2. Si falla Supabase Storage (por ejemplo si el bucket no existe), convertir a Base64
        console.warn('Fallo al subir a Storage, convirtiendo a Base64:', uploadError?.message);
        const buffer = await imagenFile.arrayBuffer();
        const base64String = Buffer.from(buffer).toString('base64');
        imagenUrl = `data:${imagenFile.type};base64,${base64String}`;
      }
    } catch (e) {
      console.error('Error procesando imagen:', e);
      return { error: `Error al procesar la imagen: ${e instanceof Error ? e.message : 'Error desconocido'}` };
    }
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
    // Modo Edición
    const { error: updateError } = await supabase
      .from('productos')
      .update({
        nombre,
        descripcion: descripcion || null,
        precio_compra: precioCompra,
        precio_venta: precioVenta,
        stock, // Nota: el ajuste de stock fino se debería hacer por movimientos, pero permitimos edición directa
        imagen_url: imagenUrl,
        codigo_barras: codigoBarras || null,
        estado
      })
      .eq('id_producto', idProducto);

    if (updateError) {
      console.error('Error al editar producto:', updateError);
      return { error: `No se pudo actualizar el producto: ${updateError.message}` };
    }

    // Registrar log
    await supabase.from('logs_seguridad').insert({
      id_usuario: loggedInUser.id_usuario,
      accion: 'EDICION_PRODUCTO',
      detalle: `Producto editado. ID: ${idProducto}, Nombre: ${nombre}`
    });

  } else {
    // Modo Creación
    const { data: newProd, error: insertError } = await supabase
      .from('productos')
      .insert({
        nombre,
        descripcion: descripcion || null,
        precio_compra: precioCompra,
        precio_venta: precioVenta,
        stock,
        imagen_url: imagenUrl,
        codigo_barras: codigoBarras || null,
        estado: 'ACTIVO'
      })
      .select()
      .single();

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
      detalle: `Nuevo producto creado. ID: ${newProd.id_producto}, Nombre: ${nombre}, Stock: ${stock}`
    });
  }

  revalidatePath('/admin/inventario');
  revalidatePath('/admin/ventas');
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

  revalidatePath('/admin/inventario');
  revalidatePath('/admin/ventas');
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

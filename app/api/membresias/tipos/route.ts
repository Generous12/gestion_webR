import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getSesionActual } from '@/app/actions/auth';
import { revalidatePath } from 'next/cache';

// GET /api/membresias/tipos
// Retorna las membresías activas para el selector
export async function GET() {
  try {
    const user = await getSesionActual();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const supabase = await createClient();
    const { data: planes, error } = await supabase
      .from('tipos_membresia')
      .select('*')
      .eq('estado', 'ACTIVA')
      .order('precio', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(planes);
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 });
  }
}

// POST /api/membresias/tipos
// Crea una nueva membresía/plan
export async function POST(req: NextRequest) {
  try {
    const user = await getSesionActual();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo admin o usuarios con permiso Finanzas o Planes pueden crear planes
    const tieneAcceso = user.usuario === 'admin' || user.modulos?.includes('Finanzas') || user.modulos?.includes('Planes');
    if (!tieneAcceso) {
      return NextResponse.json({ error: 'No tienes permisos para realizar esta acción' }, { status: 403 });
    }

    const body = await req.json();
    const { nombre, precio, duracion_dias, descripcion } = body;

    if (!nombre || !precio || !duracion_dias) {
      return NextResponse.json({ error: 'Nombre, Precio y Duración son obligatorios' }, { status: 400 });
    }

    const precioNum = parseFloat(precio);
    const duracionNum = parseInt(duracion_dias);

    if (isNaN(precioNum) || precioNum <= 0) {
      return NextResponse.json({ error: 'El precio debe ser un número mayor a 0' }, { status: 400 });
    }

    if (isNaN(duracionNum) || duracionNum <= 0) {
      return NextResponse.json({ error: 'La duración en días debe ser mayor a 0' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: newPlan, error } = await supabase
      .from('tipos_membresia')
      .insert({
        nombre,
        precio: precioNum,
        duracion_dias: duracionNum,
        descripcion: descripcion || null,
        estado: 'ACTIVA'
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath('/admin/planes');
    revalidatePath('/admin/ventas');
    return NextResponse.json({ success: true, plan: newPlan });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 });
  }
}

// PUT /api/membresias/tipos
// Edita un plan de membresía existente
export async function PUT(req: NextRequest) {
  try {
    const user = await getSesionActual();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const tieneAcceso = user.usuario === 'admin' || user.modulos?.includes('Finanzas') || user.modulos?.includes('Planes');
    if (!tieneAcceso) {
      return NextResponse.json({ error: 'No tienes permisos para realizar esta acción' }, { status: 403 });
    }

    const body = await req.json();
    const { id_tipo, nombre, precio, duracion_dias, descripcion, estado } = body;

    if (!id_tipo || !nombre || !precio || !duracion_dias || !estado) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const precioNum = parseFloat(precio);
    const duracionNum = parseInt(duracion_dias);

    if (isNaN(precioNum) || precioNum <= 0) {
      return NextResponse.json({ error: 'El precio debe ser un número mayor a 0' }, { status: 400 });
    }

    if (isNaN(duracionNum) || duracionNum <= 0) {
      return NextResponse.json({ error: 'La duración en días debe ser mayor a 0' }, { status: 400 });
    }

    if (estado !== 'ACTIVA' && estado !== 'INACTIVA') {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
    }

    const supabase = await createClient();

    // Validar nombre duplicado (excluyendo este plan)
    const { data: ext } = await supabase
      .from('tipos_membresia')
      .select('id_tipo')
      .eq('nombre', nombre)
      .neq('id_tipo', id_tipo)
      .maybeSingle();

    if (ext) {
      return NextResponse.json({ error: 'Ya existe otro plan registrado con este nombre' }, { status: 400 });
    }

    const { data: updatedPlan, error } = await supabase
      .from('tipos_membresia')
      .update({
        nombre,
        precio: precioNum,
        duracion_dias: duracionNum,
        descripcion: descripcion || null,
        estado,
        fecha_actualizacion: new Date().toISOString()
      })
      .eq('id_tipo', id_tipo)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath('/admin/planes');
    revalidatePath('/admin/ventas');
    return NextResponse.json({ success: true, plan: updatedPlan });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE /api/membresias/tipos
// Elimina o desactiva (si está referenciado) un plan
export async function DELETE(req: NextRequest) {
  try {
    const user = await getSesionActual();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const tieneAcceso = user.usuario === 'admin' || user.modulos?.includes('Finanzas') || user.modulos?.includes('Planes');
    if (!tieneAcceso) {
      return NextResponse.json({ error: 'No tienes permisos para realizar esta acción' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de plan obligatorio' }, { status: 400 });
    }

    const idTipo = parseInt(id);
    if (isNaN(idTipo)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const supabase = await createClient();

    // Intentar eliminar físicamente
    const { error: deleteError } = await supabase
      .from('tipos_membresia')
      .delete()
      .eq('id_tipo', idTipo);

    if (deleteError) {
      // Si el error es de restricción de clave foránea (código 23503 en Postgres)
      // Cambiamos el estado a 'INACTIVA' automáticamente
      if (deleteError.code === '23503') {
        const { error: updateError } = await supabase
          .from('tipos_membresia')
          .update({ estado: 'INACTIVA', fecha_actualizacion: new Date().toISOString() })
          .eq('id_tipo', idTipo);

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        revalidatePath('/admin/planes');
        revalidatePath('/admin/ventas');
        return NextResponse.json({
          success: true,
          softDeleted: true,
          message: 'El plan no se puede eliminar físicamente porque tiene ventas registradas en el historial. Se ha cambiado su estado a INACTIVA automáticamente.'
        });
      }

      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    revalidatePath('/admin/planes');
    revalidatePath('/admin/ventas');
    return NextResponse.json({ success: true, message: 'Plan de membresía eliminado con éxito de la base de datos.' });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 });
  }
}

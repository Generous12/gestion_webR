import { NextRequest, NextResponse } from 'next/server';
import { getSesionActual } from '@/app/actions/auth';
import { venderMembresia } from '@/app/actions/membresias';

// POST /api/ventas/membresia
// Registra la venta de una membresía para un cliente
export async function POST(req: NextRequest) {
  try {
    const user = await getSesionActual();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const tieneAcceso = user.usuario === 'admin' || user.modulos?.includes('Ventas');
    if (!tieneAcceso) {
      return NextResponse.json({ error: 'No tienes permisos para realizar ventas' }, { status: 403 });
    }

    const body = await req.json();
    const { id_cliente, id_tipo, precio_pagado, fecha_inicio, pagos } = body;

    if (!id_cliente || !id_tipo || !precio_pagado || !fecha_inicio || !pagos || !Array.isArray(pagos)) {
      return NextResponse.json({ error: 'Faltan campos obligatorios para registrar la venta' }, { status: 400 });
    }

    // Llamar al Server Action que encapsula la lógica comercial
    const result = await venderMembresia(
      parseInt(id_cliente),
      parseInt(id_tipo),
      parseFloat(precio_pagado),
      fecha_inicio,
      pagos
    );

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, id_membresia: result.id_membresia });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 });
  }
}

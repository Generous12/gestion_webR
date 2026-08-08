import { NextRequest, NextResponse } from 'next/server';
import { crearPaymentIntent } from '@/app/actions/stripe';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const monto = parseFloat(body.monto);

    if (isNaN(monto) || monto <= 0) {
      return NextResponse.json({ error: 'Monto inválido.' }, { status: 400 });
    }

    const res = await crearPaymentIntent(monto);
    
    if (res.error) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }
    
    return NextResponse.json(res);
  } catch (e) {
    console.error('Stripe route error:', e);
    return NextResponse.json({ error: 'Error interno de Stripe.' }, { status: 500 });
  }
}

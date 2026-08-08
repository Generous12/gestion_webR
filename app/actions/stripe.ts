'use server';

import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
let stripe: Stripe | null = null;

if (stripeSecretKey) {
  stripe = new Stripe(stripeSecretKey);
}

export async function crearPaymentIntent(monto: number) {
  if (monto <= 0) {
    return { error: 'El monto debe ser mayor a cero.' };
  }

  // Si no hay Stripe configurado, devolvemos un client secret de simulación
  if (!stripe) {
    console.warn("STRIPE_SECRET_KEY no configurado en .env.local. Operando en MODO SIMULADO (Sandbox).");
    return {
      success: true,
      clientSecret: 'simulado_secret_' + Math.random().toString(36).substring(2, 15),
      simulado: true
    };
  }

  try {
    // Stripe requiere montos en centavos (ej: S/ 10.00 -> 1000 centavos)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(monto * 100),
      currency: 'pen', // Soles Peruanos
      metadata: { integration_check: 'gym_checkout' }
    });

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      simulado: false
    };
  } catch (e) {
    console.error('Error al crear PaymentIntent de Stripe:', e);
    return { error: `Error al crear cobro en pasarela: ${e instanceof Error ? e.message : 'Error desconocido'}` };
  }
}

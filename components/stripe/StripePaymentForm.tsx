'use client';

import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { ShieldCheck, Lock, CreditCard, ArrowRight } from 'lucide-react';

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

interface StripePaymentFormProps {
  clientSecret: string;
  monto: number;
  simulado?: boolean;
  onSuccess: (paymentIntentId: string) => void;
  onError: (errorMsg: string) => void;
  loading?: boolean;
  setLoading?: (l: boolean) => void;
}

/**
 * Formulario para cobros reales con Stripe Elements (debe estar dentro de <Elements>)
 */
function RealStripeCardCheckoutForm({
  clientSecret,
  monto,
  onSuccess,
  onError,
  loading: externalLoading,
  setLoading: externalSetLoading
}: Omit<StripePaymentFormProps, 'simulado'>) {
  const stripe = useStripe();
  const elements = useElements();
  const [internalLoading, setInternalLoading] = useState(false);
  const [cardholderName, setCardholderName] = useState('');

  const isActuallyLoading = externalLoading !== undefined ? externalLoading : internalLoading;
  const setActualLoading = (val: boolean) => {
    if (externalSetLoading) externalSetLoading(val);
    setInternalLoading(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cardholderName.trim()) {
      onError('Por favor ingresa el nombre del titular de la tarjeta.');
      return;
    }

    if (!stripe || !elements) {
      onError('La pasarela de pagos aún se está cargando. Intenta en unos segundos.');
      return;
    }

    setActualLoading(true);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        onError('No se encontró el elemento de tarjeta.');
        setActualLoading(false);
        return;
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: cardholderName
          }
        }
      });

      if (error) {
        onError(error.message || 'El pago fue rechazado por la entidad bancaria.');
        setActualLoading(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess(paymentIntent.id);
      } else {
        onError('El estado de la transacción no fue confirmado.');
        setActualLoading(false);
      }
    } catch (err) {
      console.error('Error al confirmar pago con Stripe:', err);
      onError(err instanceof Error ? err.message : 'Error inesperado durante la transacción.');
      setActualLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Titular de la Tarjeta */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
          Nombre del Titular *
        </label>
        <input
          type="text"
          required
          placeholder="EJ. JUAN PÉREZ LÓPEZ"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none transition-all font-mono"
        />
      </div>

      {/* Campo de Tarjeta Real Stripe */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
          Datos de la Tarjeta (Crédito o Débito) *
        </label>
        <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus-within:border-blue-500 dark:focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20 rounded-xl transition-all">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '13px',
                  color: '#18181b',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  '::placeholder': {
                    color: '#a1a1aa'
                  },
                  iconColor: '#2563eb'
                },
                invalid: {
                  color: '#e11d48',
                  iconColor: '#e11d48'
                }
              },
              hidePostalCode: true
            }}
          />
        </div>
      </div>

      {/* Sellos de Seguridad */}
      <div className="pt-2 flex items-center justify-between text-[11px] text-zinc-500 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Cifrado SSL 256-bit</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Stripe Certified</span>
          <span>•</span>
          <span>PCI-DSS Nivel 1</span>
        </div>
      </div>

      {/* Botón de Pago Azul Admin */}
      <button
        type="submit"
        disabled={isActuallyLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2"
      >
        {isActuallyLoading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            <span>Procesando pago seguro...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <span>Pagar S/ {monto.toFixed(2)} Seguro</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        )}
      </button>
    </form>
  );
}

/**
 * Formulario para simulación / sandbox (no llama useStripe() ni requiere Elements context)
 */
function SimulatedCardCheckoutForm({
  monto,
  onSuccess,
  onError,
  loading: externalLoading,
  setLoading: externalSetLoading
}: StripePaymentFormProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const [cardholderName, setCardholderName] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);

  const isActuallyLoading = externalLoading !== undefined ? externalLoading : internalLoading;
  const setActualLoading = (val: boolean) => {
    if (externalSetLoading) externalSetLoading(val);
    setInternalLoading(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cardholderName.trim()) {
      onError('Por favor ingresa el nombre del titular de la tarjeta.');
      return;
    }

    setActualLoading(true);
    setIsSimulating(true);

    setTimeout(() => {
      setIsSimulating(false);
      setActualLoading(false);
      const simId = 'pi_sim_' + Math.random().toString(36).substring(2, 12).toUpperCase();
      onSuccess(simId);
    }, 1200);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Indicador de Modo Simulado / Sandbox */}
      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 rounded-xl flex items-center justify-between gap-2 text-xs text-blue-700 dark:text-blue-300">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
          <span>Pasarela Segura <strong>(Modo Demostración / Sandbox)</strong></span>
        </div>
        <span className="text-[10px] font-mono bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded text-blue-800 dark:text-blue-200 font-bold">
          SANDBOX
        </span>
      </div>

      {/* Titular de la Tarjeta */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
          Nombre del Titular *
        </label>
        <input
          type="text"
          required
          placeholder="EJ. JUAN PÉREZ LÓPEZ"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none transition-all font-mono"
        />
      </div>

      {/* Campo de Tarjeta Simulado */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
          Datos de la Tarjeta (Crédito o Débito) *
        </label>
        
        <div className="space-y-1.5">
          <div className="relative">
            <input
              type="text"
              readOnly
              value="•••• •••• •••• 4242  |  12/28  |  CVC 123"
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-700 dark:text-zinc-300 font-mono tracking-wider focus:outline-none cursor-default"
            />
            <span className="absolute right-3 top-2.5 text-[10px] text-blue-700 dark:text-blue-300 font-semibold bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded">
              Test Visa
            </span>
          </div>
          <p className="text-[11px] text-zinc-500">
            En modo demostración no se debitará dinero de tu tarjeta bancaria.
          </p>
        </div>
      </div>

      {/* Sellos de Seguridad */}
      <div className="pt-2 flex items-center justify-between text-[11px] text-zinc-500 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Cifrado SSL 256-bit</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Stripe Certified</span>
          <span>•</span>
          <span>PCI-DSS Nivel 1</span>
        </div>
      </div>

      {/* Botón de Pago Azul Admin */}
      <button
        type="submit"
        disabled={isActuallyLoading || isSimulating}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2"
      >
        {isActuallyLoading || isSimulating ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            <span>Procesando pago seguro...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <span>Pagar S/ {monto.toFixed(2)} Seguro</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        )}
      </button>
    </form>
  );
}

export default function StripePaymentForm(props: StripePaymentFormProps) {
  // Si existe Stripe publishable key y no estamos forzando modo simulado, usamos Elements
  if (stripePromise && !props.simulado) {
    return (
      <Elements stripe={stripePromise}>
        <RealStripeCardCheckoutForm {...props} />
      </Elements>
    );
  }

  // Modo sandbox / simulado (sin requerir Elements provider)
  return <SimulatedCardCheckoutForm {...props} simulado={true} />;
}

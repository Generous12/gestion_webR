'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { TipoMembresia } from '@/types/gym.types';
import { crearPaymentIntent, comprarMembresiaOnline, ResultadoCompraOnline } from '@/app/actions/stripe';
import StripePaymentForm from '@/components/stripe/StripePaymentForm';
import ThemeToggle from '@/components/theme/ThemeToggle';
import {
  Dumbbell,
  CreditCard,
  User,
  Check,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Lock
} from 'lucide-react';

interface CheckoutClientProps {
  planes?: TipoMembresia[];
  initialSelectedPlanId?: number;
}

const DEFAULT_PLANES: TipoMembresia[] = [
  {
    id_tipo: 1,
    nombre: 'Plan Mensual Estándar',
    descripcion: 'Acceso total a sala de musculación, cardio y vestidores durante 30 días.',
    precio: 120.0,
    duracion_dias: 30,
    estado: 'ACTIVA',
    fecha_creacion: '',
    fecha_actualizacion: ''
  },
  {
    id_tipo: 2,
    nombre: 'Plan Trimestral Pro',
    descripcion: 'Entrenamiento continuo por 90 días con evaluación antropométrica inicial incluida.',
    precio: 320.0,
    duracion_dias: 90,
    estado: 'ACTIVA',
    fecha_creacion: '',
    fecha_actualizacion: ''
  },
  {
    id_tipo: 3,
    nombre: 'Membresía Anual VIP',
    descripcion: 'Acceso 365 días + casillero preferencial + pase libre para 1 invitado al mes.',
    precio: 999.0,
    duracion_dias: 365,
    estado: 'ACTIVA',
    fecha_creacion: '',
    fecha_actualizacion: ''
  }
];

export default function CheckoutClient({ planes = [], initialSelectedPlanId }: CheckoutClientProps) {
  const availablePlanes = planes && planes.length > 0 ? planes : DEFAULT_PLANES;

  const validInitialPlan = initialSelectedPlanId
    ? availablePlanes.find(p => p.id_tipo === initialSelectedPlanId)
    : undefined;

  // Plan seleccionado
  const [selectedPlanId, setSelectedPlanId] = useState<number>(
    validInitialPlan ? validInitialPlan.id_tipo : availablePlanes[0].id_tipo
  );

  // Paso actual (1: Plan, 2: Datos, 3: Pago, 4: Confirmación)
  const [currentStep, setCurrentStep] = useState<number>(validInitialPlan ? 2 : 1);

  // Datos del socio
  const [dni, setDni] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);

  // Estados de Stripe y Pago
  const [clientSecret, setClientSecret] = useState<string>('');
  const [simulado, setSimulado] = useState<boolean>(false);
  const [loadingPaymentIntent, setLoadingPaymentIntent] = useState<boolean>(false);
  const [processingOrder, setProcessingOrder] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Resultado de compra confirmada
  const [compraExitosa, setCompraExitosa] = useState<ResultadoCompraOnline | null>(null);

  const selectedPlan = availablePlanes.find(p => p.id_tipo === selectedPlanId) || availablePlanes[0];

  // Avanzar a Paso 3 (Preparar Stripe Payment Intent)
  const handleContinuarAPago = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedPlan) {
      setFormError('Por favor selecciona un plan de membresía.');
      return;
    }

    if (!dni.trim() || !nombre.trim() || !email.trim() || !telefono.trim()) {
      setFormError('Todos los campos marcados con (*) son obligatorios.');
      return;
    }

    if (dni.trim().length < 8 || dni.trim().length > 12) {
      setFormError('El DNI / documento de identidad debe tener entre 8 y 12 caracteres.');
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      setFormError('Por favor ingresa un correo electrónico válido (ej: nombre@correo.com).');
      return;
    }

    if (telefono.trim().length !== 9 || !/^\d{9}$/.test(telefono.trim())) {
      setFormError('El número de teléfono debe constar exactamente de 9 dígitos numéricos.');
      return;
    }

    setLoadingPaymentIntent(true);
    try {
      const res = await crearPaymentIntent({
        monto: selectedPlan.precio,
        nombrePlan: selectedPlan.nombre,
        clienteDni: dni.trim(),
        clienteEmail: email.trim()
      });

      if (res.error) {
        setFormError(res.error);
      } else if (res.clientSecret) {
        setClientSecret(res.clientSecret);
        setSimulado(!!res.simulado);
        setCurrentStep(3);
      }
    } catch (err) {
      console.error(err);
      setFormError('Error al conectar con la pasarela de pagos.');
    } finally {
      setLoadingPaymentIntent(false);
    }
  };

  // Callback de Stripe al procesar el pago con éxito
  const handleStripeSuccess = async (paymentIntentId: string) => {
    setProcessingOrder(true);
    setFormError(null);

    try {
      const res = await comprarMembresiaOnline({
        id_tipo: selectedPlan.id_tipo,
        dni: dni.trim(),
        nombre: nombre.trim(),
        apellido: apellido.trim() || undefined,
        email: email.trim(),
        telefono: telefono.trim(),
        fechaInicioStr: fechaInicio,
        stripePaymentIntentId: paymentIntentId
      });

      if (res.error) {
        setFormError(res.error);
        setProcessingOrder(false);
      } else {
        setCompraExitosa(res);
        setCurrentStep(4);
        setProcessingOrder(false);
      }
    } catch (err) {
      console.error('Error al registrar membresía post-pago:', err);
      setFormError('Tu pago fue procesado pero ocurrió un error al emitir tu membresía. Por favor contáctanos con tu DNI.');
      setProcessingOrder(false);
    }
  };

  return (
    <div suppressHydrationWarning className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-blue-600 selection:text-white pb-20 transition-colors duration-200">
      
      {/* Header Sticky */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800/80 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 block leading-tight">GestionWeb</span>
              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 block uppercase tracking-wider">Inscripción Online</span>
            </div>
          </Link>

          <div className="flex items-center gap-3 text-xs font-medium">
            <Link href="/portal" className="text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors hidden sm:inline">
              Consultar Mi Plan
            </Link>
            <ThemeToggle />
            <Link
              href="/"
              className="text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors hidden sm:inline"
            >
              Volver al Inicio
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        {/* Step Indicator Bar */}
        {currentStep < 4 && (
          <div className="mb-10 max-w-lg mx-auto">
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-zinc-200 dark:bg-zinc-800 -z-10" />
              
              <button
                onClick={() => setCurrentStep(1)}
                className={`flex flex-col items-center gap-1.5 cursor-pointer ${currentStep >= 1 ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-zinc-400'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === 1
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-4 ring-blue-500/20'
                    : currentStep > 1
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                }`}>
                  {currentStep > 1 ? <Check className="w-4 h-4" /> : '1'}
                </div>
                <span className="text-[11px]">1. Plan</span>
              </button>

              <button
                onClick={() => { if (selectedPlan) setCurrentStep(2); }}
                className={`flex flex-col items-center gap-1.5 cursor-pointer ${currentStep >= 2 ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-zinc-400'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === 2
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-4 ring-blue-500/20'
                    : currentStep > 2
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                }`}>
                  {currentStep > 2 ? <Check className="w-4 h-4" /> : '2'}
                </div>
                <span className="text-[11px]">2. Tus Datos</span>
              </button>

              <div className={`flex flex-col items-center gap-1.5 ${currentStep >= 3 ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-zinc-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === 3
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-4 ring-blue-500/20'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                }`}>
                  3
                </div>
                <span className="text-[11px]">3. Pago Seguro</span>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* PASO 1: SELECCIÓN DE PLAN */}
        {/* ------------------------------------------------------------- */}
        {currentStep === 1 && (
          <div className="space-y-8 animate-fadeIn">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                Selecciona tu plan de membresía
              </h1>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                Acceso total a sala de máquinas, cardio y vestidores. Sin costos ocultos.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {availablePlanes.map((plan, idx) => {
                const isSelected = plan.id_tipo === selectedPlanId;
                const isPopular = idx === 1 || plan.duracion_dias >= 90;
                const precioMensualizado = Math.round((plan.precio / (plan.duracion_dias / 30)) * 10) / 10;

                return (
                  <div
                    key={plan.id_tipo}
                    onClick={() => setSelectedPlanId(plan.id_tipo)}
                    className={`relative rounded-3xl p-6 flex flex-col justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-white dark:bg-zinc-900 border-2 border-blue-600 dark:border-blue-500 shadow-md shadow-blue-500/10 ring-2 ring-blue-500/20'
                        : 'bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    {isPopular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-md shadow-blue-500/20">
                        Recomendado
                      </span>
                    )}

                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{plan.nombre}</h3>
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">{plan.duracion_dias} días de acceso</span>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-zinc-300 dark:border-zinc-700'
                        }`}>
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </div>

                      <div className="pt-1">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100 font-mono">S/ {plan.precio.toFixed(2)}</span>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">/ total</span>
                        </div>
                        {plan.duracion_dias > 30 && (
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                            Equivale a S/ {precioMensualizado.toFixed(2)} / mes
                          </p>
                        )}
                      </div>

                      <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-zinc-100 dark:border-zinc-800 pt-3">
                        {plan.descripcion || 'Acceso completo a todas las instalaciones en horarios libres.'}
                      </p>

                      <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400 pt-1">
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Acceso digital con DNI</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Zona de pesas y cardio</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Casilleros y vestuarios</span>
                        </li>
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPlanId(plan.id_tipo);
                        setCurrentStep(2);
                      }}
                      className={`mt-6 w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20'
                          : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700'
                      }`}
                    >
                      {isSelected ? 'Continuar con este plan' : 'Seleccionar Plan'}
                    </button>
                  </div>
                );
              })}
            </div>

            {selectedPlan && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>Continuar a Tus Datos</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* PASO 2: DATOS DEL SOCIO */}
        {/* ------------------------------------------------------------- */}
        {currentStep === 2 && selectedPlan && (
          <div className="max-w-lg mx-auto space-y-5 animate-fadeIn">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                Información del Titular
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Tu membresía quedará asociada a este DNI para ingresar en el counter.
              </p>
            </div>

            {/* Resumen de Plan Seleccionado */}
            <div className="p-4 bg-white dark:bg-zinc-900/80 border border-blue-200 dark:border-blue-900/40 rounded-2xl flex items-center justify-between gap-4 shadow-xs">
              <div>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">Plan Elegido</span>
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{selectedPlan.nombre}</h4>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{selectedPlan.duracion_dias} días de membresía</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono">S/ {selectedPlan.precio.toFixed(2)}</span>
                <button
                  onClick={() => setCurrentStep(1)}
                  className="block text-[11px] text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 underline mt-0.5 cursor-pointer"
                >
                  Cambiar
                </button>
              </div>
            </div>

            <form onSubmit={handleContinuarAPago} className="bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-4 shadow-xs">
              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400">
                  {formError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  DNI / Documento de Identidad *
                </label>
                <div className="relative flex items-center">
                  <FileText className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    maxLength={12}
                    placeholder="Ej. 74829103"
                    value={dni}
                    onChange={(e) => setDni(e.target.value.replace(/\s+/g, ''))}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none transition-all font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                    Nombres *
                  </label>
                  <div className="relative flex items-center">
                    <User className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      required
                      placeholder="Ej. Carlos"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                    Apellidos
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Mendoza Ramos"
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                    Correo Electrónico *
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
                    <input
                      type="email"
                      required
                      placeholder="carlos@correo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                    Teléfono Celular *
                  </label>
                  <div className="relative flex items-center">
                    <Phone className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
                    <input
                      type="tel"
                      required
                      maxLength={9}
                      placeholder="987654321"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  Fecha de Inicio de Membresía
                </label>
                <div className="relative flex items-center">
                  <Calendar className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
                  <input
                    type="date"
                    value={fechaInicio}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none transition-all font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Planes</span>
                </button>

                <button
                  type="submit"
                  disabled={loadingPaymentIntent}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {loadingPaymentIntent ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      <span>Conectando...</span>
                    </>
                  ) : (
                    <>
                      <span>Ir al Pago Seguro</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* PASO 3: PAGO SEGURO CON STRIPE */}
        {/* ------------------------------------------------------------- */}
        {currentStep === 3 && selectedPlan && clientSecret && (
          <div className="max-w-lg mx-auto space-y-5 animate-fadeIn">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                Pago Seguro con Stripe
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Tarjetas de débito y crédito Visa, Mastercard, Diners y Amex.
              </p>
            </div>

            {/* Resumen de Orden */}
            <div className="bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 space-y-2.5 shadow-xs">
              <div className="flex justify-between items-center text-xs pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-500 dark:text-zinc-400">Socio Titular:</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{nombre} {apellido} (DNI: {dni})</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-500 dark:text-zinc-400">Plan Seleccionado:</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">{selectedPlan.nombre}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Total a Pagar:</span>
                <span className="text-xl font-black text-blue-600 dark:text-blue-400 font-mono">S/ {selectedPlan.precio.toFixed(2)}</span>
              </div>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400">
                {formError}
              </div>
            )}

            {/* Formulario Stripe */}
            <div className="bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs">
              <StripePaymentForm
                clientSecret={clientSecret}
                monto={selectedPlan.precio}
                simulado={simulado}
                onSuccess={handleStripeSuccess}
                onError={(err) => setFormError(err)}
                loading={processingOrder}
                setLoading={setProcessingOrder}
              />
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Modificar mis datos o fecha</span>
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* PASO 4: CONFIRMACIÓN EXITOSA */}
        {/* ------------------------------------------------------------- */}
        {currentStep === 4 && compraExitosa && (
          <div className="max-w-lg mx-auto space-y-6 animate-fadeIn text-center">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                ¡Membresía Activada con Éxito!
              </h1>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Hemos enviado el comprobante a <strong>{email}</strong>.
              </p>
            </div>

            {/* Tarjeta Digital de Socio */}
            <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-900/40 p-6 sm:p-7 shadow-md text-left space-y-5">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-blue-500/20">
                    <Dumbbell className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">PASE DIGITAL DE ACCESO</span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase block">Socio Activo</span>
                  </div>
                </div>
                <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full">
                  ACTIVO
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3.5 text-xs">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Titular</span>
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">{compraExitosa.cliente?.nombre} {compraExitosa.cliente?.apellido}</p>
                  <p className="text-zinc-500 font-mono text-[11px]">DNI: {dni}</p>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Plan</span>
                  <p className="font-bold text-blue-600 dark:text-blue-400">{compraExitosa.plan?.nombre}</p>
                  <p className="text-zinc-500 text-[11px]">{compraExitosa.plan?.duracion_dias} días de vigencia</p>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Fecha Inicio</span>
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono">{compraExitosa.fecha_inicio}</p>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Fecha Vencimiento</span>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{compraExitosa.fecha_fin}</p>
                </div>
              </div>

              {/* Check-in info */}
              <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">
                    Check-in en Recepción:
                  </span>
                  <p className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400 tracking-wider">
                    DNI: {dni}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Solo indica tu DNI en el counter para ingresar.</p>
                </div>

                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/portal"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md shadow-blue-500/20 transition-all"
              >
                <span>Acceder a Mi Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 font-semibold text-xs px-6 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 transition-colors"
              >
                Volver al Inicio
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

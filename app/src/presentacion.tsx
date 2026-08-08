'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function Presentacion() {
  const [activeTab, setActiveTab] = useState<'recepcion' | 'pos' | 'caja' | 'finanzas'>('recepcion');

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* Background Decorative Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-blue-100/70 via-blue-50/40 to-transparent blur-3xl rounded-full" />
        <div className="absolute top-[800px] -left-40 w-96 h-96 bg-blue-100/50 blur-3xl rounded-full" />
        <div className="absolute top-[1400px] -right-40 w-96 h-96 bg-indigo-100/40 blur-3xl rounded-full" />
      </div>

      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/85 border-b border-slate-200/70 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
              G
            </div>
            <div>
              <span className="text-base font-black tracking-tight text-slate-900 block leading-tight">GestionWeb</span>
              <span className="text-[10px] font-semibold text-blue-600 block uppercase tracking-wider">Gym Operating System</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#soluciones" className="hover:text-blue-600 transition-colors">Soluciones</a>
            <a href="#modulos" className="hover:text-blue-600 transition-colors">Módulos</a>
            <a href="#flujo" className="hover:text-blue-600 transition-colors">Flujo Operativo</a>
            <a href="#faq" className="hover:text-blue-600 transition-colors">Preguntas Frecuentes</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/30 hover:shadow-md hover:shadow-blue-600/40 transition-all transform hover:-translate-y-0.5"
            >
              <span>Acceder al Sistema</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 md:pt-28 md:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/70 text-blue-700 text-xs font-semibold tracking-wide mb-8 shadow-2xs animate-fade-in">
          <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
          Software Todo-en-Uno para Gimnasios & Centros Fitness
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight max-w-5xl mx-auto leading-[1.1] mb-6">
          Gestión inteligente, control de accesos y{' '}
          <span className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 bg-clip-text text-transparent">
            cero descuadres en caja
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          Centraliza membresías, check-in por DNI en menos de 2 segundos, ventas de cafetería con descuento de stock automático y arqueos de caja en tiempo real.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto mb-16">
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 transition-all transform hover:-translate-y-0.5"
          >
            <span>Iniciar Sesión en el Panel</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
          <a
            href="#modulos"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm border border-slate-200/80 shadow-2xs transition-all"
          >
            Ver Módulos Operativos
          </a>
        </div>

        {/* Live UI Mockup Preview */}
        <div className="relative max-w-5xl mx-auto rounded-2xl border border-slate-200/90 bg-white p-2.5 shadow-2xl shadow-blue-900/10">
          <div className="rounded-xl overflow-hidden border border-slate-100 bg-slate-900 text-left text-white">
            {/* Top Mockup Bar */}
            <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-[11px] text-slate-400 font-mono ml-2">gestionweb.app/admin</span>
              </div>
              <span className="text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-md font-mono">
                ● Turno de Caja Abierto
              </span>
            </div>

            {/* Mockup Dashboard Content */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900 text-slate-100">
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ingresos del Día</span>
                <p className="text-2xl font-black text-emerald-400 mt-1">S/ 2,450.00</p>
                <p className="text-[11px] text-slate-400 mt-0.5">18 membresías + 12 ventas</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Gastos Registrados</span>
                <p className="text-2xl font-black text-rose-400 mt-1">S/ 380.00</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Servicios y mantenimiento</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Balance Operativo</span>
                <p className="text-2xl font-black text-blue-400 mt-1">S/ 2,070.00</p>
                <p className="text-[11px] text-slate-400 mt-0.5">+84.5% margen neto</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Check-in Hoy</span>
                <p className="text-2xl font-black text-white mt-1">142 Socios</p>
                <p className="text-[11px] text-emerald-400 mt-0.5">98.5% membresías activas</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Counter Bar */}
      <section className="border-y border-slate-200/80 bg-white py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <p className="text-3xl sm:text-4xl font-black text-blue-600">&lt; 2 seg</p>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">Validación de acceso por DNI</p>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-black text-blue-600">100%</p>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">Exactitud en arqueos de caja</p>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-black text-blue-600">4 Métodos</p>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">Efectivo, Yape, Plin y Stripe</p>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-black text-blue-600">24/7</p>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">Control en la nube con Supabase</p>
          </div>
        </div>
      </section>

      {/* Core Solutions by Role */}
      <section id="soluciones" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            Diseñado para la Operación Real
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-3">
            Cada rol tiene su herramienta especializada
          </h2>
          <p className="text-slate-600 text-sm sm:text-base mt-3">
            Evita confusiones y fugas de dinero asignando vistas limpias y permisos exactos para tu equipo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Dueño */}
          <div className="bg-white p-7 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 hover:shadow-lg transition-all duration-300">
            <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
              </svg>
            </div>
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Para el Administrador / Dueño</span>
            <h3 className="text-xl font-bold text-slate-900 mt-1 mb-2">Control Financiero & Balance</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Visualiza tus ganancias reales, programa pagos fijos de alquiler y servicios, y audita los movimientos de cada turno con un solo clic.
            </p>
            <ul className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-4">
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Margen neto y rentabilidad mensual
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Alertas de membresías por vencer a 7 días
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Valorización total de stock en almacén
              </li>
            </ul>
          </div>

          {/* Card 2: Recepción */}
          <div className="bg-white p-7 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 hover:shadow-lg transition-all duration-300">
            <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Para Recepción & Front Desk</span>
            <h3 className="text-xl font-bold text-slate-900 mt-1 mb-2">Check-in Rápido & CRM</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Atiende a tus alumnos sin colas en el counter. Búsqueda instantánea con DNI y aviso visual de luz verde o luz roja.
            </p>
            <ul className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-4">
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Registro de asistencia en un clic
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Cobro y renovación automática de planes
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Contactos de emergencia y ficha de salud
              </li>
            </ul>
          </div>

          {/* Card 3: Cajero */}
          <div className="bg-white p-7 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 hover:shadow-lg transition-all duration-300">
            <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Para Caja & Punto de Venta</span>
            <h3 className="text-xl font-bold text-slate-900 mt-1 mb-2">Punto de Venta POS & Arqueo</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Vende bebidas, proteínas y suplementos con carrito dinámico. Cierra tu turno con cuadre ciego y subida de vouchers.
            </p>
            <ul className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-4">
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Descuento automático de stock de tienda
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Vouchers digitales para pagos Yape / Plin
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Detección de sobrantes y faltantes al cerrar
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Interactive Tabs of the 12 Modules */}
      <section id="modulos" className="py-20 bg-slate-100/70 border-y border-slate-200/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              Arquitectura Modular
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-3">
              12 Módulos diseñados para la gestión perfecta
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-2">
              Explora las capacidades integradas que incluye tu sistema web.
            </p>
          </div>

          {/* Module Tabs */}
          <div className="flex justify-center gap-2 mb-8 flex-wrap">
            <button
              onClick={() => setActiveTab('recepcion')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'recepcion'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
            >
              Recepción & CRM
            </button>
            <button
              onClick={() => setActiveTab('pos')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'pos'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
            >
              Ventas POS & Stock
            </button>
            <button
              onClick={() => setActiveTab('caja')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'caja'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
            >
              Arqueo de Caja & Vouchers
            </button>
            <button
              onClick={() => setActiveTab('finanzas')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'finanzas'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
            >
              Gastos & Roles RBAC
            </button>
          </div>

          {/* Tab Content Panels */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-sm max-w-4xl mx-auto">
            {activeTab === 'recepcion' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                    Módulos: /recepcion y /crm
                  </span>
                  <h4 className="text-lg font-bold text-slate-900">Control de Acceso Inmediato</h4>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Permite al recepcionista o entrenador digitar el DNI del socio y obtener un estado inmediato con alerta visual de color. Registra asistencias, fecha de inicio y vencimiento de planes, y teléfono de emergencia.
                </p>
              </div>
            )}

            {activeTab === 'pos' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                    Módulos: /ventas e /inventario
                  </span>
                  <h4 className="text-lg font-bold text-slate-900">Punto de Venta de Tienda y Suplementos</h4>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Catálogo visual con control de stock en tiempo real. Al realizar una venta, se crea el ticket, se descuentan las existencias en inventario y se inyecta el ingreso directamente a la caja abierta.
                </p>
              </div>
            )}

            {activeTab === 'caja' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
                    Módulos: /caja e /historial-ventas
                  </span>
                  <h4 className="text-lg font-bold text-slate-900">Arqueo Diario y Auditoría de Vouchers</h4>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Garantiza el cuadre exacto de la gaveta física con el registro contable. Permite registrar entradas o salidas manuales imprevistas y adjuntar la captura del comprobante bancario para pagos Yape/Plin.
                </p>
              </div>
            )}

            {activeTab === 'finanzas' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
                    Módulos: /finanzas, /equipo, /roles y /logs
                  </span>
                  <h4 className="text-lg font-bold text-slate-900">Egresos Programados y Seguridad del Personal</h4>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Planifica pagos de servicios y sueldos. Controla el acceso a cada pantalla mediante RBAC restringido por usuario y mantén un registro de auditoría de seguridad para cada evento en el sistema.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Preguntas Frecuentes</h2>
          <p className="text-slate-600 text-sm mt-2">Todo lo que necesitas saber sobre la operativa de GestionWeb.</p>
        </div>

        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900">¿Qué sucede si un cajero intenta vender sin haber abierto la caja?</h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              El sistema bloquea la venta automáticamente y solicita abrir la caja con el monto inicial en efectivo para asegurar que ningún centavo quede sin registrar.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900">¿Cómo se gestionan los pagos con billeteras digitales (Yape / Plin)?</h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              El recepcionista registra el número de operación y puede subir la foto del voucher digital para que el administrador pueda auditarlo en el historial de ventas.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900">¿Puedo limitar los accesos de mis entrenadores o recepcionistas?</h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Sí. A través del módulo de Roles y Permisos (RBAC), puedes otorgarles únicamente acceso a Recepción y CRM, ocultando Finanzas, Arqueos de Caja y Configuración de Planes.
            </p>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 py-16 px-4 sm:px-6 lg:px-8 text-center text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="relative max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
            Comienza a operar tu gimnasio al máximo nivel
          </h2>
          <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
            Ingresa con tus credenciales de administrador y toma el control total de tus socios, ventas y finanzas.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-blue-700 font-bold text-sm hover:bg-blue-50 shadow-xl transition-all transform hover:-translate-y-0.5"
            >
              <span>Acceder al Panel de Control</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Minimalist Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-[10px]">
              G
            </div>
            <span className="font-bold text-slate-800">GestionWeb OS</span>
            <span>— Plataforma de Gestión Integral para Gimnasios</span>
          </div>

          <p>© {new Date().getFullYear()} GestionWeb. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

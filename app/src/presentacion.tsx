'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TipoMembresia } from '@/types/gym.types';
import ThemeToggle from '@/components/theme/ThemeToggle';
import ProductoDetalleModal from '@/components/tienda/ProductoDetalleModal';
import { Producto } from '@/app/actions/productos';
import { registrarContactoWeb } from '@/app/actions/crm';
import {
  Dumbbell,
  ShieldCheck,
  Zap,
  Users,
  Clock,
  Check,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  Package,
  Calendar,
  CreditCard,
  Menu,
  X,
  Mail,
  Phone,
  MapPin,
  Send,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Activity,
  Award,
  ChevronRight,
  Flame,
  CheckCircle,
  Star
} from 'lucide-react';

interface PresentacionProps {
  planes?: TipoMembresia[];
  initialPlanes?: TipoMembresia[];
  productosDestacados?: Producto[];
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

const DEFAULT_PRODUCTOS: Producto[] = [
  { id_producto: 1, nombre: 'Proteína Whey Isolate 2kg', precio_venta: 189.0, precio_final: 189.0, descuento_porcentaje: null, stock: 10, descripcion: 'Aislado de suero premium con 27g de proteína pura por porción, bajo en carbohidratos y de absorción ultra rápida para recuperación muscular óptima.', imagen_url: null, precio_compra: 100, codigo_barras: null, estado: 'ACTIVO' },
  { id_producto: 2, nombre: 'Creatina Monohidratada 300g', precio_venta: 85.0, precio_final: 85.0, descuento_porcentaje: null, stock: 15, descripcion: 'Creatina 100% pura micronizada Creapure® para incremento de fuerza explosiva, potencia y volumen celular muscular.', imagen_url: null, precio_compra: 50, codigo_barras: null, estado: 'ACTIVO' },
  { id_producto: 3, nombre: 'Pre-Workout Energy Boost', precio_venta: 110.0, precio_final: 99.0, descuento_porcentaje: 10, stock: 8, descripcion: 'Complejo pre-entreno con beta-alanina, cafeína anhidra y citrulina malato para energía sostenida, bombeo y enfoque extremo.', imagen_url: null, precio_compra: 60, codigo_barras: null, estado: 'ACTIVO' },
  { id_producto: 4, nombre: 'Bebida Isotónica Hidratante', precio_venta: 6.5, precio_final: 6.5, descuento_porcentaje: null, stock: 30, descripcion: 'Fórmula balanceada de electrolitos, sodio, potasio y magnesio para rehidratación inmediata durante el entrenamiento intenso.', imagen_url: null, precio_compra: 3, codigo_barras: null, estado: 'ACTIVO' }
];

export default function Presentacion({ planes = [], initialPlanes, productosDestacados = [] }: PresentacionProps) {
  const router = useRouter();
  const planList = initialPlanes && initialPlanes.length > 0 ? initialPlanes : planes;
  const availablePlanes = planList && planList.length > 0 ? planList : DEFAULT_PLANES;
  const [selectedPlanId, setSelectedPlanId] = useState<number>(availablePlanes[1]?.id_tipo || availablePlanes[0].id_tipo);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const productosList = productosDestacados && productosDestacados.length > 0 
    ? productosDestacados.slice(0, 4) 
    : DEFAULT_PRODUCTOS;

  // Estado Modal de Producto & Zoom Interactivo
  const [selectedProductForModal, setSelectedProductForModal] = useState<Producto | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Helper para Estado de Stock sin números
  const getStockStatus = (stock: number) => {
    if (!stock || stock <= 0) {
      return {
        label: 'Sin stock',
        badgeClass: 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60',
        dotClass: 'bg-zinc-400'
      };
    }
    if (stock <= 5) {
      return {
        label: 'Pocas unidades',
        badgeClass: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20',
        dotClass: 'bg-amber-500'
      };
    }
    return {
      label: 'Disponible',
      badgeClass: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20',
      dotClass: 'bg-emerald-500'
    };
  };

  const handleOpenDetailModal = (producto: Producto) => {
    setSelectedProductForModal(producto);
    setIsDetailModalOpen(true);
  };

  const handleBuyNowFromModal = (producto: Producto) => {
    setIsDetailModalOpen(false);
    router.push('/tienda');
  };

  // -------------------------------------------------------------
  // ESTADO Y VALIDACIONES DEL FORMULARIO DE CONTACTO
  // NOTA: Se mantiene manual sin autocompletado de RENIEC según solicitud
  // -------------------------------------------------------------
  const [contactData, setContactData] = useState({
    nombre: '',
    dni: '',
    celular: '',
    email: '',
    motivo: 'Información sobre Membresías y Tarifas',
    mensaje: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);

  const handleDniInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 8);
    setContactData(prev => ({ ...prev, dni: val }));
    if (formErrors.dni && val.length === 8) {
      setFormErrors(prev => {
        const next = { ...prev };
        delete next.dni;
        return next;
      });
    }
  };

  const handleCelularInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 9);
    setContactData(prev => ({ ...prev, celular: val }));
    if (formErrors.celular && val.length === 9) {
      setFormErrors(prev => {
        const next = { ...prev };
        delete next.celular;
        return next;
      });
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!contactData.nombre.trim() || contactData.nombre.trim().length < 3) {
      errors.nombre = 'Ingresa tu nombre completo (mínimo 3 caracteres).';
    }

    if (!/^\d{8}$/.test(contactData.dni.trim())) {
      errors.dni = 'El DNI debe contener exactamente 8 dígitos numéricos.';
    }

    if (!/^\d{9}$/.test(contactData.celular.trim())) {
      errors.celular = 'Ingresa un número de celular válido de 9 dígitos.';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactData.email.trim())) {
      errors.email = 'Ingresa un correo electrónico válido (ej. usuario@correo.com).';
    }

    if (!contactData.mensaje.trim() || contactData.mensaje.trim().length < 10) {
      errors.mensaje = 'Por favor describe tu mensaje o consulta (mínimo 10 caracteres).';
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmittingContact(true);
    try {
      const res = await registrarContactoWeb(contactData);
      if (res?.error) {
        setFormErrors({ submit: res.error });
      } else {
        setContactSuccess(true);
        setContactData({
          nombre: '',
          dni: '',
          celular: '',
          email: '',
          motivo: 'Información sobre Membresías y Tarifas',
          mensaje: ''
        });
      }
    } catch {
      setFormErrors({ submit: 'Error de conexión. Por favor inténtalo de nuevo.' });
    } finally {
      setIsSubmittingContact(false);
    }
  };

  return (
    <div suppressHydrationWarning className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-blue-600 selection:text-white transition-colors duration-300">
      
      {/* ------------------------------------------------------------- */}
      {/* NAVBAR STICKY RESPONSIVE ULTRA-MODERNO (LIGHT + DARK) */}
      {/* ------------------------------------------------------------- */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-zinc-950/80 border-b border-zinc-200/80 dark:border-zinc-800/60 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-all">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-extrabold tracking-tight text-zinc-900 dark:text-white block leading-tight">GestionWeb</span>
              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 block uppercase tracking-widest">Fitness Club</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            <a href="#experiencia" className="hover:text-blue-600 dark:hover:text-white transition-colors">Experiencia</a>
            <a href="#planes" className="hover:text-blue-600 dark:hover:text-white transition-colors">Membresías</a>
            <a href="#tienda" className="hover:text-blue-600 dark:hover:text-white transition-colors">Nutrición</a>
            <a href="#contacto" className="hover:text-blue-600 dark:hover:text-white transition-colors">Contacto</a>
            <Link 
              href="/portal" 
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-zinc-900 border border-blue-200/80 dark:border-zinc-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-zinc-800 transition-all font-bold"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-500 animate-pulse" />
              <span>Portal de Socios</span>
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            <Link
              href="/unete"
              className="bg-blue-600 hover:bg-blue-700 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-950 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md shadow-blue-600/20 dark:shadow-white/10 inline-flex items-center gap-1.5 hover:scale-102 active:scale-98"
            >
              <span>Inscribirme</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
              aria-label="Abrir menú"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white/95 dark:bg-zinc-950/95 border-b border-zinc-200 dark:border-zinc-800 px-4 py-5 space-y-3 backdrop-blur-2xl animate-fadeIn">
            <nav className="flex flex-col space-y-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              <a
                href="#experiencia"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                Instalaciones & Experiencia
              </a>
              <a
                href="#planes"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                Planes y Membresías
              </a>
              <a
                href="#tienda"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                Suplementos & Tienda
              </a>
              <a
                href="#contacto"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                Contacto & Sede
              </a>
              <Link
                href="/portal"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg bg-blue-50 dark:bg-zinc-900 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-between"
              >
                <span>Portal de Socios (Mi DNI)</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* ------------------------------------------------------------- */}
      {/* HERO SECTION DE ALTO IMPACTO (LIGHT & DARK ADAPTATIVO) */}
      {/* ------------------------------------------------------------- */}
      <section className="relative min-h-[88vh] flex items-center justify-center overflow-hidden border-b border-zinc-200 dark:border-zinc-800/60 bg-zinc-900">
        {/* Background Gym Photography */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1600&auto=format&fit=crop"
            alt="Gym Atmosphere"
            className="w-full h-full object-cover object-center brightness-35 dark:brightness-30 scale-105 transform animate-pulse duration-10000"
          />
          {/* Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-zinc-950/30" />
          <div className="absolute inset-0 bg-radial from-transparent via-zinc-950/50 to-zinc-950" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-8">
          
          {/* Glowing Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 dark:bg-zinc-900/80 border border-white/20 dark:border-zinc-700/60 backdrop-blur-md text-white text-xs font-semibold shadow-xl">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
            <span>Club de Alto Rendimiento & Fitness</span>
            <span className="text-zinc-400">•</span>
            <span className="text-blue-400 font-bold">Pase Inmediato con DNI</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-[1.05] max-w-4xl mx-auto">
            Supera tus límites. <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-200 to-white bg-clip-text text-transparent">
              Entrena al nivel profesional.
            </span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-zinc-300 max-w-2xl mx-auto leading-relaxed font-medium">
            Maquinaria biomecánica de alta gama, asesoría técnica especializada y registro digital inmediato sin contratos forzosos.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/unete"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm px-8 py-3.5 rounded-2xl shadow-xl shadow-blue-600/30 transition-all hover:scale-102 active:scale-98 cursor-pointer"
            >
              <Flame className="w-4 h-4 text-amber-300" />
              <span>Ver Planes & Comenzar</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
            <a
              href="#tienda"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm px-7 py-3.5 rounded-2xl border border-white/20 backdrop-blur-md transition-all"
            >
              <ShoppingBag className="w-4 h-4 text-blue-400" />
              <span>Suplementos Deportivos</span>
            </a>
          </div>

          {/* Floating Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-8 max-w-3xl mx-auto text-left">
            <div className="p-3.5 rounded-2xl bg-white/10 dark:bg-zinc-900/60 border border-white/15 dark:border-zinc-800/80 backdrop-blur-md">
              <span className="text-xl font-black text-white font-mono block">+1,200</span>
              <span className="text-[11px] text-zinc-300 dark:text-zinc-400 font-medium">Socios activos</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/10 dark:bg-zinc-900/60 border border-white/15 dark:border-zinc-800/80 backdrop-blur-md">
              <span className="text-xl font-black text-blue-400 font-mono block">100%</span>
              <span className="text-[11px] text-zinc-300 dark:text-zinc-400 font-medium">Equipamiento Pro</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/10 dark:bg-zinc-900/60 border border-white/15 dark:border-zinc-800/80 backdrop-blur-md">
              <span className="text-xl font-black text-white font-mono block">6:00 AM</span>
              <span className="text-[11px] text-zinc-300 dark:text-zinc-400 font-medium">Apertura diaria</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/10 dark:bg-zinc-900/60 border border-white/15 dark:border-zinc-800/80 backdrop-blur-md">
              <span className="text-xl font-black text-emerald-400 font-mono block">4.9 ★</span>
              <span className="text-[11px] text-zinc-300 dark:text-zinc-400 font-medium">Satisfacción total</span>
            </div>
          </div>

        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* BENTO GRID DE INSTALACIONES Y EXPERIENCIA */}
      {/* ------------------------------------------------------------- */}
      <section id="experiencia" className="py-20 bg-zinc-50 dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest block">Espacios de Élite</span>
            <h2 className="text-3xl sm:text-4xl font-black text-zinc-900 dark:text-white tracking-tight">
              Diseñado para resultados reales
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Zonas acondicionadas con iluminación focal, ventilación constante y distribución óptima para tu entrenamiento.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1: Zona de Fuerza */}
            <div className="group relative rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800/80 bg-zinc-900 flex flex-col justify-end p-6 min-h-[340px] shadow-sm hover:shadow-xl transition-all">
              <img
                src="https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=800&auto=format&fit=crop"
                alt="Zona Musculación"
                className="absolute inset-0 w-full h-full object-cover object-center brightness-45 group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
              
              <div className="relative z-10 space-y-2">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg">
                  <Dumbbell className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-white">Musculación & Peso Libre</h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Racks olímpicos, mancuernas hasta 50kg, barras calibradas y máquinas para estímulo muscular focalizado.
                </p>
              </div>
            </div>

            {/* Card 2: Zona de Cardio */}
            <div className="group relative rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800/80 bg-zinc-900 flex flex-col justify-end p-6 min-h-[340px] shadow-sm hover:shadow-xl transition-all">
              <img
                src="https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=800&auto=format&fit=crop"
                alt="Zona Cardio"
                className="absolute inset-0 w-full h-full object-cover object-center brightness-45 group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
              
              <div className="relative z-10 space-y-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg">
                  <Activity className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-white">Cardio Hi-Tech & Resistencia</h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Cintas con absorción de impacto, elípticas interactivas, escaladoras y zona de acondicionamiento metabólico.
                </p>
              </div>
            </div>

            {/* Card 3: Asesoría & Staff */}
            <div className="group relative rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800/80 bg-zinc-900 flex flex-col justify-end p-6 min-h-[340px] shadow-sm hover:shadow-xl transition-all">
              <img
                src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=800&auto=format&fit=crop"
                alt="Coaches Certificados"
                className="absolute inset-0 w-full h-full object-cover object-center brightness-45 group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
              
              <div className="relative z-10 space-y-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-white">Entrenadores & Evaluación</h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Entrenadores en piso en todos los horarios para orientar tu técnica, postura y planificar tus metas.
                </p>
              </div>
            </div>

          </div>

          {/* Quick Features Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/60 shadow-xs flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-white block">Pago Online Seguro</span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Pasarela cifrada Stripe</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/60 shadow-xs flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-white block">Check-in por DNI</span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Acceso rápido en counter</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/60 shadow-xs flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-white block">Vestidores & Lockers</span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Duchas con agua caliente</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/60 shadow-xs flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-zinc-800 text-purple-600 dark:text-purple-400 shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-white block">Nutrición & Suplementos</span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Retiro directo en sede</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECCIÓN PLANES DE MEMBRESÍA (LIGHT & DARK ADAPTATIVO) */}
      {/* ------------------------------------------------------------- */}
      <section id="planes" className="py-20 border-t border-zinc-200 dark:border-zinc-800/60 bg-zinc-100/60 dark:bg-zinc-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-xl mx-auto space-y-3">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest block">Tarifas Transparentes</span>
            <h2 className="text-3xl sm:text-4xl font-black text-zinc-900 dark:text-white tracking-tight">
              Elige tu membresía ideal
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
              Sin cláusulas ocultas ni permanencia obligatoria. Activa tu pase con tarjeta hoy mismo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {availablePlanes.map((plan, idx) => {
              const isSelected = plan.id_tipo === selectedPlanId;
              const isPopular = idx === 1 || plan.duracion_dias >= 90;
              const precioMensualizado = Math.round((plan.precio / (plan.duracion_dias / 30)) * 10) / 10;

              return (
                <div
                  key={plan.id_tipo}
                  onClick={() => setSelectedPlanId(plan.id_tipo)}
                  className={`relative rounded-3xl p-8 flex flex-col justify-between cursor-pointer transition-all duration-300 ${
                    isSelected
                      ? 'bg-white dark:bg-zinc-900 border-2 border-blue-600 dark:border-blue-500 shadow-xl shadow-blue-500/10 ring-2 ring-blue-500/20'
                      : 'bg-white/80 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-xs'
                  }`}
                >
                  {isPopular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-wider px-4 py-1 rounded-full shadow-lg shadow-blue-600/30">
                      Más Popular
                    </span>
                  )}

                  <div className="space-y-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{plan.nombre}</h3>
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">{plan.duracion_dias} Días de Acceso Total</span>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                        isSelected ? 'border-blue-600 bg-blue-600 dark:border-blue-500 dark:bg-blue-500 text-white' : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-4xl font-black text-zinc-900 dark:text-white font-mono">S/ {plan.precio.toFixed(2)}</span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">/ pase</span>
                      </div>
                      {plan.duracion_dias > 30 && (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                          Equivale a S/ {precioMensualizado.toFixed(2)} al mes
                        </p>
                      )}
                    </div>

                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-zinc-100 dark:border-zinc-800/80 pt-4">
                      {plan.descripcion || 'Acceso ilimitado a sala de musculación, pesas y vestidores.'}
                    </p>

                    <ul className="space-y-3 text-xs text-zinc-700 dark:text-zinc-300 pt-1">
                      <li className="flex items-center gap-2.5">
                        <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>Acceso biométrico / DNI sin tarjetas físicas</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>Zona completa de pesas, máquinas y cardio</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>Casilleros individuales y duchas premium</span>
                      </li>
                      {plan.duracion_dias >= 90 && (
                        <li className="flex items-center gap-2.5 text-indigo-600 dark:text-indigo-300 font-medium">
                          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <span>Evaluación corporal con entrenador incluida</span>
                        </li>
                      )}
                    </ul>
                  </div>

                  <Link
                    href={`/unete?plan=${plan.id_tipo}`}
                    className={`mt-8 w-full py-3.5 rounded-2xl text-xs font-bold text-center transition-all inline-flex items-center justify-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25'
                        : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    <span>Inscribirme con este plan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECCIÓN TIENDA DESTACADA & SUPLEMENTOS */}
      {/* ------------------------------------------------------------- */}
      <section id="tienda" className="py-20 border-t border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest block">Nutrición Deportiva</span>
              <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                Suplementos & Accesorios
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                Garantía oficial. Realiza tu compra en línea y retira tu pedido en el counter.
              </p>
            </div>

            <Link
              href="/tienda"
              className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              <span>Ver catálogo completo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {productosList.map(prod => {
              const hasDiscount = !!(prod.descuento_porcentaje && prod.descuento_porcentaje > 0);
              const precioDisplay = prod.precio_final || prod.precio_venta;
              const stockInfo = getStockStatus(prod.stock || 0);

              return (
                <div
                  key={prod.id_producto}
                  className="bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800/80 rounded-3xl p-5 flex flex-col justify-between space-y-4 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-xs hover:shadow-md transition-all group"
                >
                  {/* Thumbnail con Overlay Zoom */}
                  <div
                    onClick={() => handleOpenDetailModal(prod)}
                    className="h-44 w-full rounded-2xl bg-white dark:bg-zinc-950 overflow-hidden flex items-center justify-center relative border border-zinc-200 dark:border-zinc-800/60 cursor-pointer select-none"
                  >
                    {prod.imagen_url ? (
                      <img
                        src={prod.imagen_url}
                        alt={prod.nombre}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 gap-1.5">
                        <Package className="w-9 h-9 text-blue-600/60 dark:text-blue-400/60" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Suplemento</span>
                      </div>
                    )}

                    {hasDiscount && (
                      <span className="absolute top-2.5 left-2.5 bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-md z-10">
                        -{prod.descuento_porcentaje}%
                      </span>
                    )}

                    <span className={`absolute top-2.5 right-2.5 text-[10px] font-bold px-2 py-0.5 rounded-lg z-10 flex items-center gap-1.5 backdrop-blur-md ${stockInfo.badgeClass}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${stockInfo.dotClass}`} />
                      <span>{stockInfo.label}</span>
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4
                      onClick={() => handleOpenDetailModal(prod)}
                      className="font-bold text-xs text-zinc-900 dark:text-white line-clamp-1 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
                    >
                      {prod.nombre}
                    </h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2">{prod.descripcion || 'Disponible para entrega inmediata en counter.'}</p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800/80">
                    <div>
                      {hasDiscount ? (
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-sm font-black text-rose-600 dark:text-rose-400 font-mono">S/ {precioDisplay.toFixed(2)}</span>
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 line-through font-mono">S/ {prod.precio_venta.toFixed(2)}</span>
                        </div>
                      ) : (
                        <span className="text-sm font-black text-zinc-900 dark:text-white font-mono">S/ {precioDisplay.toFixed(2)}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push('/tienda')}
                      className="bg-blue-600 hover:bg-blue-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Comprar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECCIÓN DE CONTACTO & ATENCIÓN (MANUAL DNI) */}
      {/* ------------------------------------------------------------- */}
      <section id="contacto" className="py-20 border-t border-zinc-200 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="max-w-2xl space-y-2">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest block">
              Atención Personalizada
            </span>
            <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
              ¿Listo para comenzar o tienes consultas?
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Escríbenos para agendar un recorrido guiado, resolver dudas sobre planes corporativos o conocer el stock de suplementos.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Tarjetas de Información de Contacto */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-7 bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm space-y-6">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Canales de Contacto Directo</span>
                </h3>

                <div className="space-y-4 text-xs">
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-zinc-900 dark:text-white block">WhatsApp & Central</span>
                      <p className="text-zinc-600 dark:text-zinc-400 mt-0.5">+51 987 654 321 / +51 (01) 456-7890</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-zinc-900 dark:text-white block">Correo Electrónico</span>
                      <p className="text-zinc-600 dark:text-zinc-400 mt-0.5">contacto@gestionwebfitness.pe</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-zinc-900 dark:text-white block">Sede Central</span>
                      <p className="text-zinc-600 dark:text-zinc-400 mt-0.5">Av. Principal 1234, Lima, Perú</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-zinc-900 dark:text-white block">Horario de Entrenamiento</span>
                      <p className="text-zinc-600 dark:text-zinc-400 mt-0.5">Lunes a Sábado: 6:00 AM – 10:00 PM</p>
                      <p className="text-zinc-600 dark:text-zinc-400">Domingos y Feriados: 8:00 AM – 2:00 PM</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse shrink-0" />
                  <span>Recepción y counter de atención presencial disponibles hoy.</span>
                </div>
              </div>
            </div>

            {/* Formulario de Contacto */}
            <div className="lg:col-span-7">
              <div className="p-7 sm:p-8 bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm">
                {contactSuccess ? (
                  <div className="py-10 text-center space-y-4 animate-fadeIn">
                    <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                        ¡Mensaje Enviado con Éxito!
                      </h3>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                        Hemos recibido tu solicitud. Nuestro equipo de recepción se pondrá en contacto contigo a la brevedad.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setContactSuccess(false)}
                      className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      Enviar otra consulta
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Campo Nombre */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                          Nombres y Apellidos <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={contactData.nombre}
                          onChange={(e) => {
                            setContactData(prev => ({ ...prev, nombre: e.target.value }));
                            if (formErrors.nombre) setFormErrors(prev => ({ ...prev, nombre: '' }));
                          }}
                          placeholder="Ej. Carlos Mendoza"
                          className={`w-full px-4 py-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-950 border ${
                            formErrors.nombre ? 'border-rose-500 ring-1 ring-rose-500' : 'border-zinc-200 dark:border-zinc-800 focus:border-blue-500'
                          } text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none`}
                        />
                        {formErrors.nombre && (
                          <p className="text-[10px] font-semibold text-rose-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span>{formErrors.nombre}</span>
                          </p>
                        )}
                      </div>

                      {/* Campo DNI (8 dígitos exactos - Entrada manual) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                            DNI (Identificación) <span className="text-rose-500">*</span>
                          </label>
                          <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 font-bold">
                            {contactData.dni.length}/8 dígitos
                          </span>
                        </div>
                        <input
                          type="text"
                          maxLength={8}
                          inputMode="numeric"
                          value={contactData.dni}
                          onChange={handleDniInput}
                          placeholder="8 dígitos (ej. 72345678)"
                          className={`w-full px-4 py-2.5 rounded-xl text-xs font-mono bg-zinc-50 dark:bg-zinc-950 border ${
                            formErrors.dni ? 'border-rose-500 ring-1 ring-rose-500' : 'border-zinc-200 dark:border-zinc-800 focus:border-blue-500'
                          } text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none`}
                        />
                        {formErrors.dni && (
                          <p className="text-[10px] font-semibold text-rose-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span>{formErrors.dni}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Campo Celular */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                            Celular <span className="text-rose-500">*</span>
                          </label>
                          <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 font-bold">
                            {contactData.celular.length}/9 dígitos
                          </span>
                        </div>
                        <input
                          type="tel"
                          maxLength={9}
                          inputMode="numeric"
                          value={contactData.celular}
                          onChange={handleCelularInput}
                          placeholder="Ej. 987654321"
                          className={`w-full px-4 py-2.5 rounded-xl text-xs font-mono bg-zinc-50 dark:bg-zinc-950 border ${
                            formErrors.celular ? 'border-rose-500 ring-1 ring-rose-500' : 'border-zinc-200 dark:border-zinc-800 focus:border-blue-500'
                          } text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none`}
                        />
                        {formErrors.celular && (
                          <p className="text-[10px] font-semibold text-rose-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span>{formErrors.celular}</span>
                          </p>
                        )}
                      </div>

                      {/* Campo Email */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                          Correo Electrónico <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={contactData.email}
                          onChange={(e) => {
                            setContactData(prev => ({ ...prev, email: e.target.value }));
                            if (formErrors.email) setFormErrors(prev => ({ ...prev, email: '' }));
                          }}
                          placeholder="usuario@correo.com"
                          className={`w-full px-4 py-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-950 border ${
                            formErrors.email ? 'border-rose-500 ring-1 ring-rose-500' : 'border-zinc-200 dark:border-zinc-800 focus:border-blue-500'
                          } text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none`}
                        />
                        {formErrors.email && (
                          <p className="text-[10px] font-semibold text-rose-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span>{formErrors.email}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Motivo de Consulta */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        Motivo de Consulta
                      </label>
                      <select
                        value={contactData.motivo}
                        onChange={(e) => setContactData(prev => ({ ...prev, motivo: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="Información sobre Membresías y Tarifas">Información sobre Membresías y Tarifas</option>
                        <option value="Consulta sobre Suplementos y Stock de Tienda">Consulta sobre Suplementos y Stock de Tienda</option>
                        <option value="Horarios de Entrenamiento y Clases">Horarios de Entrenamiento y Clases</option>
                        <option value="Convenios Corporativos y Grupos">Convenios Corporativos y Grupos</option>
                        <option value="Sugerencias o Reclamos">Sugerencias o Reclamos</option>
                      </select>
                    </div>

                    {/* Mensaje */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        Detalle del Mensaje <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={3}
                        value={contactData.mensaje}
                        onChange={(e) => {
                          setContactData(prev => ({ ...prev, mensaje: e.target.value }));
                          if (formErrors.mensaje) setFormErrors(prev => ({ ...prev, mensaje: '' }));
                        }}
                        placeholder="Escribe aquí tu consulta o requerimiento específico..."
                        className={`w-full px-4 py-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-950 border ${
                          formErrors.mensaje ? 'border-rose-500 ring-1 ring-rose-500' : 'border-zinc-200 dark:border-zinc-800 focus:border-blue-500'
                        } text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none resize-none`}
                      />
                      {formErrors.mensaje && (
                        <p className="text-[10px] font-semibold text-rose-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{formErrors.mensaje}</span>
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingContact}
                      className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isSubmittingContact ? (
                        <span>Enviando mensaje...</span>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Enviar Mensaje al Equipo</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* FOOTER MINIMALISTA (LIGHT & DARK) */}
      {/* ------------------------------------------------------------- */}
      <footer className="pt-14 pb-8 border-t border-zinc-200 dark:border-zinc-800/80 text-xs text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
              <Dumbbell className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-zinc-900 dark:text-white">GestionWeb Fitness OS</span>
            <span className="text-zinc-400 dark:text-zinc-600">•</span>
            <span>Todos los derechos reservados.</span>
          </div>

          <div className="flex items-center gap-5 text-zinc-500 dark:text-zinc-400 text-[11px]">
            <Link href="/portal" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Portal de Socios</Link>
            <Link href="/login" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Consola Administrativa</Link>
          </div>
        </div>
      </footer>

      {/* Modal de Detalle y Zoom de Producto */}
      <ProductoDetalleModal
        producto={selectedProductForModal}
        productosList={productosList}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onAddToCart={() => {
          setIsDetailModalOpen(false);
          router.push('/tienda');
        }}
        onBuyNow={() => handleBuyNowFromModal(selectedProductForModal!)}
        onSelectProducto={(prod) => setSelectedProductForModal(prod)}
      />
    </div>
  );
}

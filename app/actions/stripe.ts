'use server';

import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { TipoMembresia, Cliente } from '@/types/gym.types';
import { Producto } from '@/app/actions/productos';
import { procesarProductoConDescuento } from '@/utils/productos';
import {
  checkRateLimit,
  getClientIp,
  validateDni,
  validateEmail,
  validatePhone,
  validateName,
  validateAmount,
  sanitizeText,
  sanitizePostgrestParam
} from '@/utils/security';

// ============================================================================
// CONFIGURACIÓN DE STRIPE
// ============================================================================

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
let stripe: Stripe | null = null;

if (stripeSecretKey) {
  stripe = new Stripe(stripeSecretKey);
}

export interface CrearPaymentIntentParams {
  monto: number;
  nombrePlan?: string;
  clienteEmail?: string;
  clienteDni?: string;
}

/**
 * Crea un PaymentIntent en Stripe o genera un identificador simulado seguro si no hay claves en .env
 */
export async function crearPaymentIntent(params: CrearPaymentIntentParams | number) {
  const ip = await getClientIp();

  // 1. Rate Limiting: Máximo 12 intentos de pago por minuto por IP
  const rateLimit = checkRateLimit(`stripe_intent_${ip}`, 12, 60);
  if (!rateLimit.success) {
    return { error: rateLimit.error };
  }

  const rawMonto = typeof params === 'number' ? params : params.monto;
  const rawNombrePlan = typeof params === 'object' ? params.nombrePlan : 'Membresía Gimnasio';
  const rawEmail = typeof params === 'object' ? params.clienteEmail : undefined;
  const rawDni = typeof params === 'object' ? params.clienteDni : undefined;

  // 2. Validación de Monto
  const valMonto = validateAmount(rawMonto, 1.0, 50000.0);
  if (!valMonto.isValid) {
    return { error: valMonto.error };
  }

  const nombrePlan = sanitizeText(rawNombrePlan, 100);
  const clienteEmail = rawEmail ? sanitizeText(rawEmail, 100) : 'cliente@gym.com';
  const clienteDni = rawDni ? sanitizeText(rawDni, 20) : 'N/A';

  // Si no hay Stripe configurado en variables de entorno, operamos en modo simulado para desarrollo
  if (!stripe) {
    console.info("STRIPE_SECRET_KEY no configurado en .env.local. Operando en MODO SIMULADO (Sandbox).");
    return {
      success: true,
      clientSecret: 'simulado_secret_' + Math.random().toString(36).substring(2, 15),
      paymentIntentId: 'pi_sim_' + Math.random().toString(36).substring(2, 15),
      simulado: true
    };
  }

  try {
    // Stripe requiere montos en centavos (ej: S/ 10.00 -> 1000 centavos)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(valMonto.sanitized * 100),
      currency: 'pen', // Soles Peruanos
      description: `Inscripción Online: ${nombrePlan}`,
      metadata: {
        integration: 'gym_online_checkout',
        plan: nombrePlan,
        clienteDni: clienteDni,
        clienteEmail: clienteEmail,
        clientIp: ip
      }
    });

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      simulado: false
    };
  } catch (e) {
    console.error('Error al crear PaymentIntent de Stripe:', e);
    return { error: `Error al conectar con Stripe: ${e instanceof Error ? e.message : 'Error desconocido'}` };
  }
}

export interface DatosCompraOnline {
  id_tipo: number;
  dni: string;
  nombre: string;
  apellido?: string;
  email: string;
  telefono: string;
  fechaInicioStr?: string;
  stripePaymentIntentId?: string;
}

export interface ResultadoCompraOnline {
  success?: boolean;
  error?: string;
  id_membresia?: number;
  id_cliente?: number;
  cliente?: Cliente;
  plan?: TipoMembresia;
  fecha_inicio?: string;
  fecha_fin?: string;
  monto_pagado?: number;
  qr_codigo?: string;
}

/**
 * Procesa la inscripción / renovación de membresía online del cliente con Stripe
 */
export async function comprarMembresiaOnline(datos: DatosCompraOnline): Promise<ResultadoCompraOnline> {
  const ip = await getClientIp();

  // 1. Rate Limiting: Máximo 5 compras por minuto por IP
  const rateLimit = checkRateLimit(`compra_memb_${ip}`, 5, 60);
  if (!rateLimit.success) {
    return { error: rateLimit.error };
  }

  const { id_tipo, dni, nombre, apellido, email, telefono, fechaInicioStr, stripePaymentIntentId } = datos;

  if (!id_tipo) {
    return { error: 'Debes seleccionar un plan de membresía válido.' };
  }

  // 2. Sanitización y Validación Rigurosa de Entradas
  const valDni = validateDni(dni);
  if (!valDni.isValid) return { error: valDni.error };

  const valNombre = validateName(nombre, 'Nombre');
  if (!valNombre.isValid) return { error: valNombre.error };

  let cleanApellido = '';
  if (apellido && apellido.trim()) {
    const valApellido = validateName(apellido, 'Apellido');
    if (!valApellido.isValid) return { error: valApellido.error };
    cleanApellido = valApellido.sanitized;
  }

  const valEmail = validateEmail(email);
  if (!valEmail.isValid) return { error: valEmail.error };

  const valTelefono = validatePhone(telefono);
  if (!valTelefono.isValid) return { error: valTelefono.error };

  const cleanDni = valDni.sanitized;
  const cleanNombre = valNombre.sanitized;
  const cleanEmail = valEmail.sanitized;
  const cleanTelefono = valTelefono.sanitized;

  const supabase = await createClient();

  // 3. Obtener y validar el plan de membresía seleccionado
  const { data: plan, error: errPlan } = await supabase
    .from('tipos_membresia')
    .select('*')
    .eq('id_tipo', id_tipo)
    .single();

  if (errPlan || !plan || plan.estado !== 'ACTIVA') {
    return { error: 'El plan de membresía seleccionado no está disponible o no existe.' };
  }

  // 4. Verificación de Seguridad en Servidor: Si Stripe está configurado en producción,
  // verificamos directamente con la API de Stripe que el pago haya sido completado y coincida el monto
  if (stripe && stripePaymentIntentId && !stripePaymentIntentId.startsWith('pi_sim_')) {
    try {
      const pi = await stripe.paymentIntents.retrieve(stripePaymentIntentId);
      if (pi.status !== 'succeeded') {
        return { error: 'El pago no ha sido confirmado por la entidad bancaria en Stripe.' };
      }
      const montoEsperadoCentavos = Math.round(plan.precio * 100);
      if (pi.amount !== montoEsperadoCentavos) {
        return { error: 'El monto pagado no coincide con el precio oficial del plan.' };
      }
    } catch (err) {
      console.error('Error al verificar PaymentIntent con Stripe:', err);
      return { error: 'No se pudo verificar la autenticidad del pago con Stripe.' };
    }
  }

  // 5. Buscar o Registrar al Cliente
  let idCliente: number;
  let clienteFinal: Cliente;

  const { data: clienteExistente } = await supabase
    .from('clientes')
    .select('*')
    .eq('dni', cleanDni)
    .maybeSingle();

  if (clienteExistente) {
    idCliente = clienteExistente.id_cliente;
    const { data: clienteActualizado } = await supabase
      .from('clientes')
      .update({
        nombre: cleanNombre,
        apellido: cleanApellido || clienteExistente.apellido,
        email: cleanEmail,
        telefono: cleanTelefono,
        estado: 'ACTIVO'
      })
      .eq('id_cliente', idCliente)
      .select()
      .single();

    clienteFinal = (clienteActualizado || clienteExistente) as Cliente;
  } else {
    const { data: nuevoCliente, error: errNuevoCli } = await supabase
      .from('clientes')
      .insert({
        dni: cleanDni,
        nombre: cleanNombre,
        apellido: cleanApellido || null,
        email: cleanEmail,
        telefono: cleanTelefono,
        estado: 'ACTIVO'
      })
      .select()
      .single();

    if (errNuevoCli || !nuevoCliente) {
      console.error('Error al registrar nuevo cliente online:', errNuevoCli);
      return { error: `No se pudo registrar tus datos de cliente: ${errNuevoCli?.message}` };
    }

    idCliente = nuevoCliente.id_cliente;
    clienteFinal = nuevoCliente as Cliente;
  }

  // 6. Calcular Fechas de Membresía
  const fechaHoy = new Date().toISOString().split('T')[0];
  const inicioFechaBase = fechaInicioStr && /^\d{4}-\d{2}-\d{2}$/.test(fechaInicioStr) ? fechaInicioStr : fechaHoy;
  
  const { data: membresiaPrevia } = await supabase
    .from('membresias_cliente')
    .select('*')
    .eq('id_cliente', idCliente)
    .eq('estado', 'ACTIVA')
    .order('fecha_fin', { ascending: false })
    .limit(1)
    .maybeSingle();

  let finalFechaInicio = inicioFechaBase;
  if (membresiaPrevia && new Date(membresiaPrevia.fecha_fin) >= new Date(inicioFechaBase)) {
    const finPrevia = new Date(membresiaPrevia.fecha_fin + 'T00:00:00');
    finPrevia.setDate(finPrevia.getDate() + 1);
    finalFechaInicio = finPrevia.toISOString().split('T')[0];
  }

  const fechaFinObj = new Date(finalFechaInicio + 'T00:00:00');
  fechaFinObj.setDate(fechaFinObj.getDate() + plan.duracion_dias);
  const finalFechaFin = fechaFinObj.toISOString().split('T')[0];

  // 7. Registrar o Renovar la Membresía del Cliente en Supabase
  let idMembresiaFinal: number;
  let finalFechaInicioResult = finalFechaInicio;
  let finalFechaFinResult = finalFechaFin;

  if (membresiaPrevia) {
    const baseFinDate = new Date(membresiaPrevia.fecha_fin + 'T00:00:00');
    const hoyDate = new Date(fechaHoy + 'T00:00:00');

    let nuevaFinObj: Date;
    if (baseFinDate >= hoyDate) {
      nuevaFinObj = new Date(baseFinDate);
      nuevaFinObj.setDate(nuevaFinObj.getDate() + plan.duracion_dias);
      finalFechaInicioResult = membresiaPrevia.fecha_inicio;
    } else {
      nuevaFinObj = new Date(hoyDate);
      nuevaFinObj.setDate(nuevaFinObj.getDate() + plan.duracion_dias);
      finalFechaInicioResult = fechaHoy;
    }

    finalFechaFinResult = nuevaFinObj.toISOString().split('T')[0];

    const { data: membRenovada, error: errRenov } = await supabase
      .from('membresias_cliente')
      .update({
        id_tipo: id_tipo,
        precio_pagado: Number(membresiaPrevia.precio_pagado || 0) + Number(plan.precio),
        fecha_fin: finalFechaFinResult,
        estado: 'ACTIVA'
      })
      .eq('id_membresia', membresiaPrevia.id_membresia)
      .select()
      .single();

    if (errRenov || !membRenovada) {
      console.error('Error al renovar membresía activa:', errRenov);
      return { error: `Error al renovar membresía: ${errRenov?.message}` };
    }

    idMembresiaFinal = membRenovada.id_membresia;
  } else {
    const { data: nuevaMembresia, error: errMemb } = await supabase
      .from('membresias_cliente')
      .insert({
        id_cliente: idCliente,
        id_tipo: id_tipo,
        id_usuario: null,
        precio_pagado: plan.precio,
        fecha_inicio: finalFechaInicio,
        fecha_fin: finalFechaFin,
        estado: 'ACTIVA'
      })
      .select()
      .single();

    if (errMemb || !nuevaMembresia) {
      console.error('Error al registrar membresía cliente:', errMemb);
      return { error: `Error al activar la membresía: ${errMemb?.message}` };
    }

    idMembresiaFinal = nuevaMembresia.id_membresia;
  }

  // 8. Registrar el Pago en 'pagos'
  const operacionRef = stripePaymentIntentId ? sanitizeText(stripePaymentIntentId, 64) : `STRP-${Date.now().toString(36).toUpperCase()}`;
  const { error: errPago } = await supabase
    .from('pagos')
    .insert({
      id_membresia: idMembresiaFinal,
      id_metodo: 4, // Tarjeta / Pasarela Online
      id_usuario: null,
      concepto: `Inscripción Online Stripe: ${plan.nombre}`,
      monto: plan.precio,
      numero_operacion: operacionRef,
      estado: 'CONFIRMADO',
      fecha_pago: new Date().toISOString()
    });

  if (errPago) {
    console.warn('Advertencia al registrar pago online:', errPago.message);
  }

  // 9. Log de Auditoría
  await supabase.from('logs_seguridad').insert({
    id_usuario: null,
    accion: 'COMPRA_ONLINE_STRIPE',
    detalle: `Inscripción online. Socio: ${clienteFinal.nombre} ${clienteFinal.apellido || ''} (DNI: ${cleanDni}), Plan: ${plan.nombre}, Monto: S/ ${plan.precio}, Ref: ${operacionRef}, IP: ${ip}`
  });

  try {
    revalidatePath('/admin/recepcion');
    revalidatePath('/admin/ventas');
    revalidatePath('/admin/historial-ventas');
    revalidatePath('/portal');
  } catch {
    // Ignorado en contextos estáticos
  }

  return {
    success: true,
    id_membresia: idMembresiaFinal,
    id_cliente: idCliente,
    cliente: clienteFinal,
    plan: plan as TipoMembresia,
    fecha_inicio: finalFechaInicioResult,
    fecha_fin: finalFechaFinResult,
    monto_pagado: plan.precio
  };
}

export interface SocioPortalData {
  cliente: Cliente;
  membresiaActiva: {
    id_membresia: number;
    planNombre: string;
    descripcion: string | null;
    fecha_inicio: string;
    fecha_fin: string;
    diasRestantes: number;
    diasTotales: number;
    porcentajeTranscurrido: number;
    estado: 'ACTIVA' | 'VENCIDA' | 'POR_VENCER';
  } | null;
  historialMembresias: {
    id_membresia: number;
    planNombre: string;
    fecha_inicio: string;
    fecha_fin: string;
    precio_pagado: number;
    estado: string;
  }[];
  pagos: {
    id_pago: number;
    concepto: string;
    monto: number;
    metodo: string;
    fecha: string;
    numero_operacion: string | null;
  }[];
}

/**
 * Consulta la ficha del socio mediante DNI o Email para el portal de autoservicio
 */
export async function consultarSocioPortal(identificador: string): Promise<{ data?: SocioPortalData; error?: string }> {
  const ip = await getClientIp();

  // Rate Limiting: Máximo 15 consultas por minuto por IP para evitar ataques de enumeración
  const rateLimit = checkRateLimit(`portal_lookup_${ip}`, 15, 60);
  if (!rateLimit.success) {
    return { error: rateLimit.error };
  }

  if (!identificador || typeof identificador !== 'string' || identificador.trim() === '') {
    return { error: 'Debes ingresar tu DNI o Correo Electrónico.' };
  }

  // Sanitización de parámetro de búsqueda contra inyección PostgREST
  const clean = sanitizePostgrestParam(identificador);
  if (clean.length < 4 || clean.length > 80) {
    return { error: 'El DNI o correo ingresado no es válido.' };
  }

  const supabase = await createClient();

  // Buscar cliente por DNI exacto o Email
  const { data: cliente, error: errCli } = await supabase
    .from('clientes')
    .select('*')
    .or(`dni.eq.${clean},email.ilike.${clean}`)
    .maybeSingle();

  if (errCli || !cliente) {
    return { error: 'No encontramos ningún socio registrado con este DNI o correo. ¡Inscríbete ahora para comenzar!' };
  }

  // Buscar membresías del cliente
  const { data: membresias } = await supabase
    .from('membresias_cliente')
    .select('*, tipos_membresia(*)')
    .eq('id_cliente', cliente.id_cliente)
    .order('fecha_fin', { ascending: false });

  // Buscar pagos asociados a estas membresías
  const membIds = (membresias || []).map(m => m.id_membresia);
  let pagosList: Array<{
    id_pago: number;
    concepto: string;
    monto: number;
    fecha_pago: string;
    numero_operacion: string | null;
    metodos_pago?: { nombre: string } | null;
  }> = [];

  if (membIds.length > 0) {
    const { data: pData } = await supabase
      .from('pagos')
      .select('id_pago, concepto, monto, fecha_pago, numero_operacion, metodos_pago(nombre)')
      .in('id_membresia', membIds)
      .order('fecha_pago', { ascending: false });

    pagosList = (pData || []) as unknown as typeof pagosList;
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  let membresiaActivaObj: SocioPortalData['membresiaActiva'] = null;

  if (membresias && membresias.length > 0) {
    const mTop = membresias[0];
    const finDate = new Date(mTop.fecha_fin + 'T23:59:59');
    const inicioDate = new Date(mTop.fecha_inicio + 'T00:00:00');
    
    const diffTime = finDate.getTime() - hoy.getTime();
    const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const totalTime = finDate.getTime() - inicioDate.getTime();
    const diasTotales = Math.max(1, Math.ceil(totalTime / (1000 * 60 * 60 * 24)));
    
    const transcurridoTime = hoy.getTime() - inicioDate.getTime();
    const porcentaje = Math.min(100, Math.max(0, Math.round((transcurridoTime / totalTime) * 100)));

    let estadoCalculado: 'ACTIVA' | 'VENCIDA' | 'POR_VENCER' = 'ACTIVA';
    if (diasRestantes <= 0) {
      estadoCalculado = 'VENCIDA';
    } else if (diasRestantes <= 7) {
      estadoCalculado = 'POR_VENCER';
    }

    const tObj = Array.isArray(mTop.tipos_membresia) ? mTop.tipos_membresia[0] : mTop.tipos_membresia;

    membresiaActivaObj = {
      id_membresia: mTop.id_membresia,
      planNombre: tObj?.nombre || 'Membresía Gimnasio',
      descripcion: tObj?.descripcion || null,
      fecha_inicio: mTop.fecha_inicio,
      fecha_fin: mTop.fecha_fin,
      diasRestantes: Math.max(0, diasRestantes),
      diasTotales,
      porcentajeTranscurrido: porcentaje,
      estado: estadoCalculado
    };
  }

  const historialMembresias = (membresias || []).map(m => {
    const tObj = Array.isArray(m.tipos_membresia) ? m.tipos_membresia[0] : m.tipos_membresia;
    return {
      id_membresia: m.id_membresia,
      planNombre: tObj?.nombre || 'Plan Deportivo',
      fecha_inicio: m.fecha_inicio,
      fecha_fin: m.fecha_fin,
      precio_pagado: Number(m.precio_pagado || 0),
      estado: m.estado
    };
  });

  const pagosFormat = pagosList.map(p => {
    const mp = Array.isArray(p.metodos_pago) ? p.metodos_pago[0] : p.metodos_pago;
    return {
      id_pago: p.id_pago,
      concepto: p.concepto,
      monto: Number(p.monto || 0),
      metodo: mp?.nombre || 'Tarjeta / Stripe',
      fecha: p.fecha_pago || new Date().toISOString(),
      numero_operacion: p.numero_operacion
    };
  });

  return {
    data: {
      cliente: cliente as Cliente,
      membresiaActiva: membresiaActivaObj,
      historialMembresias,
      pagos: pagosFormat
    }
  };
}

export interface ItemCarritoCompra {
  id_producto: number;
  nombre: string;
  precio_unitario: number;
  cantidad: number;
  imagen_url?: string | null;
}

export interface DatosCompraProductosOnline {
  dni: string;
  nombre: string;
  apellido?: string;
  email: string;
  telefono: string;
  items: ItemCarritoCompra[];
  stripePaymentIntentId?: string;
}

export interface ResultadoCompraProductosOnline {
  success?: boolean;
  error?: string;
  id_venta?: number;
  total?: number;
  ticket_codigo?: string;
  cliente?: Cliente;
  items?: ItemCarritoCompra[];
  fecha?: string;
}

const DEFAULT_PRODUCTOS_DEMO: Producto[] = [
  {
    id_producto: 1,
    nombre: 'Proteína Whey Isolate 2 lbs',
    descripcion: 'Proteína aislada de suero de alta pureza con 27g de proteína por scoop y rápida absorción.',
    precio_compra: 90.0,
    precio_venta: 140.0,
    descuento_porcentaje: 10,
    precio_final: 126.0,
    stock: 15,
    imagen_url: null,
    codigo_barras: '775123456001',
    estado: 'ACTIVO'
  },
  {
    id_producto: 2,
    nombre: 'Creatina Monohidratada Creapure 300g',
    descripcion: 'Creatina 100% micronizada de máxima pureza para fuerza, resistencia y recuperación muscular.',
    precio_compra: 60.0,
    precio_venta: 95.0,
    descuento_porcentaje: null,
    precio_final: 95.0,
    stock: 20,
    imagen_url: null,
    codigo_barras: '775123456002',
    estado: 'ACTIVO'
  },
  {
    id_producto: 3,
    nombre: 'Pre-Entreno Nitro Explosive 30 servicios',
    descripcion: 'Fórmula ultra concentrada con cafeína anhidra, beta-alanina y citrulina malato para bombeo extremo.',
    precio_compra: 75.0,
    precio_venta: 115.0,
    descuento_porcentaje: 15,
    precio_final: 97.75,
    stock: 12,
    imagen_url: null,
    codigo_barras: '775123456003',
    estado: 'ACTIVO'
  },
  {
    id_producto: 4,
    nombre: 'Bebida Energética / Isotónica 500ml',
    descripcion: 'Rehidratante con electrolitos esenciales para consumo durante el entrenamiento.',
    precio_compra: 3.5,
    precio_venta: 6.0,
    descuento_porcentaje: null,
    precio_final: 6.0,
    stock: 50,
    imagen_url: null,
    codigo_barras: '775123456004',
    estado: 'ACTIVO'
  },
  {
    id_producto: 5,
    nombre: 'Shaker Mezclador Pro 700ml',
    descripcion: 'Vaso mezclador con rejilla antigrumos, libre de BPA y cierre hermético antifugas.',
    precio_compra: 15.0,
    precio_venta: 25.0,
    descuento_porcentaje: null,
    precio_final: 25.0,
    stock: 25,
    imagen_url: null,
    codigo_barras: '775123456005',
    estado: 'ACTIVO'
  },
  {
    id_producto: 6,
    nombre: 'Straps / Correas de Levantamiento Heavy Duty',
    descripcion: 'Agarres acolchados de algodón reforzado con soporte de muñeca para levantamiento pesado.',
    precio_compra: 18.0,
    precio_venta: 35.0,
    descuento_porcentaje: null,
    precio_final: 35.0,
    stock: 18,
    imagen_url: null,
    codigo_barras: '775123456006',
    estado: 'ACTIVO'
  }
];

/**
 * Obtiene todos los productos disponibles para la tienda online pública
 */
export async function obtenerProductosTienda(): Promise<Producto[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .order('nombre', { ascending: true });

  if (error) {
    console.error('Error al obtener productos de tienda:', error);
    return DEFAULT_PRODUCTOS_DEMO;
  }

  const rawList = data || [];
  const activeProducts = rawList.filter(
    p => String(p.estado || '').toUpperCase() !== 'INACTIVO'
  );

  if (activeProducts.length === 0) {
    return DEFAULT_PRODUCTOS_DEMO;
  }

  return activeProducts.map(p => procesarProductoConDescuento(p));
}

/**
 * Procesa la compra de productos y suplementos en la tienda online con Stripe
 */
export async function comprarProductosOnline(datos: DatosCompraProductosOnline): Promise<ResultadoCompraProductosOnline> {
  const ip = await getClientIp();

  // Rate Limiting: Máximo 5 compras de productos por minuto por IP
  const rateLimit = checkRateLimit(`compra_prod_${ip}`, 5, 60);
  if (!rateLimit.success) {
    return { error: rateLimit.error };
  }

  const { dni, nombre, apellido, email, telefono, items, stripePaymentIntentId } = datos;

  if (!items || items.length === 0) {
    return { error: 'El carrito de compras está vacío.' };
  }

  // Sanitización y Validación de Entradas
  const valDni = validateDni(dni);
  if (!valDni.isValid) return { error: valDni.error };

  const valNombre = validateName(nombre, 'Nombre');
  if (!valNombre.isValid) return { error: valNombre.error };

  let cleanApellido = '';
  if (apellido && apellido.trim()) {
    const valApellido = validateName(apellido, 'Apellido');
    if (!valApellido.isValid) return { error: valApellido.error };
    cleanApellido = valApellido.sanitized;
  }

  const valEmail = validateEmail(email);
  if (!valEmail.isValid) return { error: valEmail.error };

  const valTelefono = validatePhone(telefono);
  if (!valTelefono.isValid) return { error: valTelefono.error };

  const cleanDni = valDni.sanitized;
  const cleanNombre = valNombre.sanitized;
  const cleanEmail = valEmail.sanitized;
  const cleanTelefono = valTelefono.sanitized;

  const supabase = await createClient();

  // 1. Validar existencias de stock y precio real con descuento en tiempo real
  let totalCalculado = 0;
  for (const item of items) {
    if (!item.id_producto || item.cantidad <= 0 || item.cantidad > 50) {
      return { error: 'Cantidad de producto inválida.' };
    }

    const { data: rawProd, error: errProd } = await supabase
      .from('productos')
      .select('*')
      .eq('id_producto', item.id_producto)
      .single();

    if (errProd || !rawProd || rawProd.estado !== 'ACTIVO') {
      return { error: `El producto seleccionado ya no está disponible.` };
    }

    if (rawProd.stock < item.cantidad) {
      return { error: `Stock insuficiente para "${rawProd.nombre}". Solo quedan ${rawProd.stock} unidades.` };
    }

    const prod = procesarProductoConDescuento(rawProd);
    const precioAplicado = prod.precio_final || prod.precio_venta;
    totalCalculado += precioAplicado * item.cantidad;
  }

  const valTotal = validateAmount(totalCalculado, 0.5, 50000.0);
  if (!valTotal.isValid) {
    return { error: valTotal.error };
  }

  // 2. Verificación de Seguridad en Servidor con Stripe
  if (stripe && stripePaymentIntentId && !stripePaymentIntentId.startsWith('pi_sim_')) {
    try {
      const pi = await stripe.paymentIntents.retrieve(stripePaymentIntentId);
      if (pi.status !== 'succeeded') {
        return { error: 'El pago no ha sido confirmado por Stripe.' };
      }
      const montoEsperadoCentavos = Math.round(valTotal.sanitized * 100);
      if (pi.amount !== montoEsperadoCentavos) {
        return { error: 'El monto pagado no coincide con el total de los productos.' };
      }
    } catch (err) {
      console.error('Error al verificar PaymentIntent con Stripe:', err);
      return { error: 'No se pudo verificar la autenticidad del pago con Stripe.' };
    }
  }

  // 3. Buscar o Registrar Cliente
  let idCliente: number;
  let clienteFinal: Cliente;

  const { data: clienteExistente } = await supabase
    .from('clientes')
    .select('*')
    .eq('dni', cleanDni)
    .maybeSingle();

  if (clienteExistente) {
    idCliente = clienteExistente.id_cliente;
    clienteFinal = clienteExistente as Cliente;
  } else {
    const { data: nuevoCli, error: errCli } = await supabase
      .from('clientes')
      .insert({
        dni: cleanDni,
        nombre: cleanNombre,
        apellido: cleanApellido || null,
        email: cleanEmail,
        telefono: cleanTelefono,
        estado: 'ACTIVO'
      })
      .select()
      .single();

    if (errCli || !nuevoCli) {
      console.error('Error al registrar cliente para tienda:', errCli);
      return { error: `Error al registrar datos del cliente: ${errCli?.message}` };
    }
    idCliente = nuevoCli.id_cliente;
    clienteFinal = nuevoCli as Cliente;
  }

  // 4. Registrar Venta en 'ventas_productos'
  const operacionRef = stripePaymentIntentId ? sanitizeText(stripePaymentIntentId, 64) : `STRPT-${Date.now().toString(36).toUpperCase()}`;

  const { data: venta, error: errVenta } = await supabase
    .from('ventas_productos')
    .insert({
      id_cliente: idCliente,
      id_usuario: null, // Venta online self-service
      total: valTotal.sanitized,
      estado: 'COMPLETADA',
      id_caja: null,
      metodo_pago: 'Tarjeta / Stripe Online',
      id_stripe_intent: operacionRef
    })
    .select()
    .single();

  if (errVenta || !venta) {
    console.error('Error al crear venta de productos online:', errVenta);
    return { error: `Error al generar la orden de compra: ${errVenta?.message}` };
  }

  // 5. Registrar detalles y descontar stock
  for (const item of items) {
    const subtotal = item.precio_unitario * item.cantidad;

    await supabase.from('detalle_ventas_productos').insert({
      id_venta: venta.id_venta,
      id_producto: item.id_producto,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      subtotal: subtotal
    });

    // Descontar existencias
    const { data: prodData } = await supabase
      .from('productos')
      .select('stock, nombre')
      .eq('id_producto', item.id_producto)
      .single();

    if (prodData) {
      const nuevoStock = Math.max(0, prodData.stock - item.cantidad);
      await supabase
        .from('productos')
        .update({ stock: nuevoStock })
        .eq('id_producto', item.id_producto);

      // Movimiento de Kardex
      await supabase.from('movimientos_inventario').insert({
        id_producto: item.id_producto,
        id_usuario: null,
        tipo: 'VENTA',
        cantidad: -item.cantidad,
        concepto: `Venta Online Stripe - Ticket #${venta.id_venta} (${cleanNombre})`
      });
    }
  }

  // 6. Registrar el Cobro en 'pagos'
  await supabase.from('pagos').insert({
    id_membresia: null,
    id_metodo: 4, // Tarjeta / Stripe
    id_usuario: null,
    concepto: `Venta Online Tienda Tkt #${venta.id_venta}`,
    monto: valTotal.sanitized,
    numero_operacion: operacionRef,
    estado: 'CONFIRMADO',
    fecha_pago: new Date().toISOString()
  });

  // 7. Log de Auditoría
  await supabase.from('logs_seguridad').insert({
    id_usuario: null,
    accion: 'VENTA_ONLINE_TIENDA_STRIPE',
    detalle: `Pedido tienda online completado. Tkt #${venta.id_venta}. Cliente: ${cleanNombre} (DNI: ${cleanDni}), Total: S/ ${valTotal.sanitized.toFixed(2)}, Items: ${items.length}, Ref: ${operacionRef}, IP: ${ip}`
  });

  try {
    revalidatePath('/admin/inventario');
    revalidatePath('/admin/ventas');
    revalidatePath('/admin/historial-ventas');
    revalidatePath('/admin/finanzas');
    revalidatePath('/tienda');
  } catch {
    // Ignorado fuera de request scope
  }

  const ticketCodigo = `TKT-STORE-${venta.id_venta}-${cleanDni}`;

  return {
    success: true,
    id_venta: venta.id_venta,
    total: valTotal.sanitized,
    ticket_codigo: ticketCodigo,
    cliente: clienteFinal,
    items: items,
    fecha: new Date().toISOString()
  };
}

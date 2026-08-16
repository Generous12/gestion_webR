import { headers } from 'next/headers';

// ============================================================================
// 1. RATE LIMITER EN MEMORIA CON SLIDING WINDOW & LIMPIEZA AUTOMÁTICA
// ============================================================================

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Limpieza periódica cada 10 minutos para evitar fugas de memoria
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      const validTimestamps = record.timestamps.filter(ts => now - ts < 600000);
      if (validTimestamps.length === 0) {
        rateLimitStore.delete(key);
      } else {
        rateLimitStore.set(key, { timestamps: validTimestamps });
      }
    }
  }, 600000);
}

/**
 * Valida si una acción o IP ha excedido el límite de peticiones en una ventana de tiempo.
 * @param key Identificador único (ej: "payment_ip_192.168.1.1" o "login_user_admin")
 * @param maxRequests Máximo de peticiones permitidas en la ventana
 * @param windowSeconds Duración de la ventana en segundos
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): { success: boolean; error?: string; remaining: number } {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  
  const record = rateLimitStore.get(key) || { timestamps: [] };
  // Filtrar solo timestamps dentro de la ventana activa
  const activeTimestamps = record.timestamps.filter(ts => now - ts < windowMs);

  if (activeTimestamps.length >= maxRequests) {
    const oldestTimestamp = activeTimestamps[0];
    const retryAfterSec = Math.ceil((oldestTimestamp + windowMs - now) / 1000);
    return {
      success: false,
      error: `Has realizado demasiadas solicitudes. Por favor espera ${retryAfterSec} segundos antes de intentar nuevamente.`,
      remaining: 0
    };
  }

  // Registrar timestamp actual
  activeTimestamps.push(now);
  rateLimitStore.set(key, { timestamps: activeTimestamps });

  return {
    success: true,
    remaining: maxRequests - activeTimestamps.length
  };
}

/**
 * Obtiene la dirección IP del cliente de forma segura desde los encabezados de Next.js
 */
export async function getClientIp(): Promise<string> {
  try {
    const headersList = await headers();
    const forwarded = headersList.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return headersList.get('x-real-ip') || '127.0.0.1';
  } catch {
    return '127.0.0.1';
  }
}

// ============================================================================
// 2. SANITIZACIÓN Y VALIDACIÓN CONTRA INYECCIONES Y XSS
// ============================================================================

/**
 * Limpia cualquier texto eliminando etiquetas HTML, scripts, caracteres de control nulos
 */
export function sanitizeText(input: unknown, maxLen = 255): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>?/gm, '') // Elimina HTML/scripts
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Elimina caracteres de control
    .trim()
    .slice(0, maxLen);
}

/**
 * Sanitiza valores para filtros PostgREST / Supabase (evita inyección de operadores como eq, or, ilike)
 */
export function sanitizePostgrestParam(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[(),;'"\\]/g, '') // Elimina comas, paréntesis y comillas que alteran la sintaxis de filtros
    .trim();
}

/**
 * Valida un DNI o Documento de Identidad (solo números/letras de 8 a 12 caracteres)
 */
export function validateDni(dni: unknown): { isValid: boolean; sanitized: string; error?: string } {
  if (typeof dni !== 'string') {
    return { isValid: false, sanitized: '', error: 'El DNI debe ser un texto válido.' };
  }

  const sanitized = dni.replace(/[^a-zA-Z0-9]/g, '').trim();

  if (sanitized.length < 8 || sanitized.length > 12) {
    return { isValid: false, sanitized, error: 'El documento de identidad debe tener entre 8 y 12 caracteres.' };
  }

  return { isValid: true, sanitized };
}

/**
 * Valida y normaliza un correo electrónico
 */
export function validateEmail(email: unknown): { isValid: boolean; sanitized: string; error?: string } {
  if (typeof email !== 'string') {
    return { isValid: false, sanitized: '', error: 'El correo electrónico es requerido.' };
  }

  const sanitized = email.trim().toLowerCase().slice(0, 100);
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(sanitized)) {
    return { isValid: false, sanitized, error: 'El formato del correo electrónico es inválido.' };
  }

  return { isValid: true, sanitized };
}

/**
 * Valida un número telefónico (9 dígitos para Perú o 8-15 dígitos numéricos)
 */
export function validatePhone(phone: unknown): { isValid: boolean; sanitized: string; error?: string } {
  if (typeof phone !== 'string') {
    return { isValid: false, sanitized: '', error: 'El teléfono es requerido.' };
  }

  const sanitized = phone.replace(/\D/g, '').trim();

  if (sanitized.length !== 9) {
    return { isValid: false, sanitized, error: 'El número de teléfono debe constar exactamente de 9 dígitos.' };
  }

  return { isValid: true, sanitized };
}

/**
 * Valida nombres y apellidos (solo letras, espacios y tildes, entre 2 y 80 caracteres)
 */
export function validateName(name: unknown, fieldName = 'Nombre'): { isValid: boolean; sanitized: string; error?: string } {
  if (typeof name !== 'string') {
    return { isValid: false, sanitized: '', error: `${fieldName} es requerido.` };
  }

  const sanitized = sanitizeText(name, 80);
  const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]{2,80}$/;

  if (!nameRegex.test(sanitized)) {
    return { isValid: false, sanitized, error: `${fieldName} contiene caracteres inválidos o es demasiado corto.` };
  }

  return { isValid: true, sanitized };
}

/**
 * Valida un monto numérico positivo y razonable para cobros
 */
export function validateAmount(amount: unknown, min = 1.0, max = 50000.0): { isValid: boolean; sanitized: number; error?: string } {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount));

  if (isNaN(num) || !isFinite(num) || num < min || num > max) {
    return { isValid: false, sanitized: 0, error: `El monto debe estar entre S/ ${min.toFixed(2)} y S/ ${max.toFixed(2)}.` };
  }

  const rounded = Math.round(num * 100) / 100;
  return { isValid: true, sanitized: rounded };
}

// ============================================================================
// 3. HASH Y VERIFICACIÓN SEGURA DE CONTRASEÑAS (BCRYPT + RETROCOMPATIBILIDAD)
// ============================================================================

import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/**
 * Hashea una contraseña usando bcrypt (10 rondas de salt).
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verifica una contraseña contra su hash almacenado.
 * Soporta de manera transparente hashes modernos Bcrypt y legados SHA-256 (con auto-migración).
 */
export async function verifyPassword(passwordInput: string, storedHash: string): Promise<{ isValid: boolean; needsRehash: boolean }> {
  if (!storedHash || !passwordInput) {
    return { isValid: false, needsRehash: false };
  }

  // 1. Si el hash comienza con $2a$, $2b$ o $2y$, es Bcrypt
  if (storedHash.startsWith('$2')) {
    const isValid = await bcrypt.compare(passwordInput, storedHash);
    return { isValid, needsRehash: false };
  }

  // 2. Retrocompatibilidad: Si tiene longitud 64, es SHA-256 legado
  const sha256Input = crypto.createHash('sha256').update(passwordInput).digest('hex');
  if (storedHash === sha256Input) {
    return { isValid: true, needsRehash: true };
  }

  return { isValid: false, needsRehash: false };
}

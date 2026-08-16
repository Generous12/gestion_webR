'use server';

import { validateDni } from '@/utils/security';

export interface ReniecDniResult {
  success: boolean;
  dni?: string;
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  nombreCompleto?: string;
  error?: string;
}

/**
 * Consulta los datos de una persona natural en RENIEC a través de su DNI de 8 dígitos.
 * Soporta proveedores peruanos estándar (APIsPeru, Decolecta, Migo o endpoint configurable).
 * 
 * NOTA: Por política de privacidad y requerimiento del sistema, NO se aplica al formulario
 * de contacto web público de la empresa.
 */
export async function consultarDniReniec(dniInput: string): Promise<ReniecDniResult> {
  const val = validateDni(dniInput);
  if (!val.isValid || val.sanitized.length !== 8) {
    return {
      success: false,
      error: 'El DNI debe tener exactamente 8 dígitos numéricos.'
    };
  }

  const dni = val.sanitized;
  const token = process.env.RENIEC_API_TOKEN || process.env.APISPERU_TOKEN || process.env.NEXT_PUBLIC_RENIEC_TOKEN;

  // 1. Si no hay token configurado en .env.local, devolvemos instrucción amigable
  if (!token) {
    return {
      success: false,
      error: 'Servicio de consulta RENIEC no configurado. Agrega RENIEC_API_TOKEN en tu archivo .env.local.'
    };
  }

  try {
    // Intentar consulta mediante endpoint estándar (ej. apis.net.pe v2 o apisperu)
    const apiUrl = process.env.RENIEC_API_URL || `https://api.apis.net.pe/v2/reniec/dni?numero=${dni}`;

    const res = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      next: { revalidate: 86400 } // Cache por 24 horas para ahorrar peticiones a la API
    });

    if (!res.ok) {
      if (res.status === 404) {
        return { success: false, error: 'DNI no encontrado en el padrón de RENIEC.' };
      }
      if (res.status === 401 || res.status === 403) {
        return { success: false, error: 'Token de consulta RENIEC inválido o agotado.' };
      }
      return { success: false, error: `Error al consultar RENIEC (Código: ${res.status}).` };
    }

    const data = await res.json();

    // Normalizar formatos de distintos proveedores de API DNI
    const nombres = data.nombres || data.nombre || '';
    const apellidoPaterno = data.apellidoPaterno || data.apellido_paterno || data.paterno || '';
    const apellidoMaterno = data.apellidoMaterno || data.apellido_materno || data.materno || '';
    const nombreCompleto = data.nombreCompleto || data.nombre_completo || `${nombres} ${apellidoPaterno} ${apellidoMaterno}`.trim();

    if (!nombres && !apellidoPaterno) {
      return {
        success: false,
        error: 'No se encontraron datos para el DNI ingresado.'
      };
    }

    return {
      success: true,
      dni,
      nombres,
      apellidoPaterno,
      apellidoMaterno,
      nombreCompleto
    };
  } catch (err) {
    console.error('Error al conectar con API RENIEC/DNI:', err);
    return {
      success: false,
      error: 'Error de conexión con el servicio de consulta de identidad.'
    };
  }
}

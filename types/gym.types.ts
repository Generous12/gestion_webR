import { UsuarioSistema, EquipoMiembro } from './database.types';

export interface Cliente {
  id_cliente: number;
  dni: string;
  nombre: string;
  apellido: string | null;
  telefono: string | null;
  email: string | null;
  fecha_nacimiento: string | null;
  direccion: string | null;
  foto_url: string | null;
  contacto_emergencia: string | null;
  telefono_emergencia: string | null;
  observaciones: string | null;
  estado: 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO';
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface TipoMembresia {
  id_tipo: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  duracion_dias: number;
  estado: 'ACTIVA' | 'INACTIVA';
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface MembresiaCliente {
  id_membresia: number;
  id_cliente: number;
  id_tipo: number;
  id_usuario: number | null;
  precio_pagado: number;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'ACTIVA' | 'VENCIDA' | 'CANCELADA';
  fecha_creacion: string;
  fecha_actualizacion: string;
  // Join fields
  clientes?: Cliente;
  tipos_membresia?: TipoMembresia;
}

export interface MetodoPago {
  id_metodo: number;
  nombre: string;
  estado: 'ACTIVO' | 'INACTIVO';
  fecha_creacion: string;
}

export interface Pago {
  id_pago: number;
  id_membresia: number | null;
  id_metodo: number | null;
  id_usuario: number | null;
  concepto: string;
  monto: number;
  numero_operacion: string | null;
  url_comprobante: string | null;
  estado: 'PENDIENTE' | 'CONFIRMADO' | 'ANULADO';
  fecha_pago: string;
  fecha_actualizacion: string;
  // Join fields
  metodos_pago?: MetodoPago;
}

export interface Caja {
  id_caja: number;
  id_usuario: number | null;
  fecha: string;
  monto_inicial: number;
  monto_final: number | null;
  estado: 'ABIERTA' | 'CERRADA';
  fecha_apertura: string;
  fecha_cierre: string | null;
  usuarios_sistema?: {
    id_usuario?: number;
    usuario?: string;
    equipo?: {
      id_miembro?: number;
      nombre?: string;
      apellido?: string | null;
      dni?: string | null;
      email?: string | null;
    } | null;
  } | null;
}

export interface CategoriaGasto {
  id_categoria: number;
  nombre: string;
  descripcion: string | null;
  estado: 'ACTIVA' | 'INACTIVA';
  fecha_creacion: string;
}

export interface Gasto {
  id_gasto: number;
  id_categoria: number | null;
  id_usuario: number | null;
  concepto: string;
  descripcion: string | null;
  monto_estimado: number;
  monto_final: number | null;
  fecha_registro: string;
  fecha_programada: string;
  fecha_pago: string | null;
  estado: 'PENDIENTE' | 'PAGADO' | 'VENCIDO' | 'OMITIDO';
  fecha_creacion: string;
  fecha_actualizacion: string;
  // Join fields
  categorias_gasto?: CategoriaGasto;
}

export interface MovimientoCaja {
  id_movimiento: number;
  id_caja: number | null;
  id_usuario: number | null;
  id_pago: number | null;
  id_gasto: number | null;
  tipo: 'INGRESO' | 'EGRESO';
  concepto: string;
  monto: number;
  fecha: string;
  usuarios_sistema?: {
    id_usuario?: number;
    usuario?: string;
    equipo?: {
      id_miembro?: number;
      nombre?: string;
      apellido?: string | null;
      dni?: string | null;
    } | null;
  } | null;
}

export interface SesionUsuarioActual extends Omit<UsuarioSistema, 'password_hash'> {
  permisos: string[];
  modulos: string[];
  roles: string[];
  equipo: EquipoMiembro | null;
}

export interface MovimientoInventario {
  id_mov_inventario: number;
  id_producto: number;
  id_usuario: number | null;
  tipo: 'INGRESO' | 'EGRESO' | 'VENTA';
  cantidad: number;
  concepto: string | null;
  fecha: string;
  usuarios_sistema?: {
    usuario: string;
  } | null;
}

export interface ContactoWeb {
  id_contacto: number;
  nombre: string;
  dni: string;
  celular: string;
  email: string;
  motivo: string;
  mensaje: string;
  estado: 'NUEVO' | 'CONTACTADO' | 'CONVERTIDO' | 'DESCARTADO';
  notas_admin: string | null;
  fecha_registro: string;
  es_socio?: boolean;
  tiene_membresia_activa?: boolean;
  estado_socio?: 'CON_MEMBRESIA_ACTIVA' | 'REGISTRADO_SIN_MEMBRESIA' | 'NO_REGISTRADO';
  plan_actual?: string | null;
}


export interface Rol {
  id_rol: number;
  nombre: string;
  descripcion: string | null;
  es_sistema: boolean;
  estado: 'ACTIVO' | 'INACTIVO';
  fecha_creacion: string;
}

export interface Permiso {
  id_permiso: number;
  codigo: string;
  descripcion: string | null;
  modulo: string | null;
  fecha_creacion: string;
}

export interface RolPermiso {
  id: number;
  id_rol: number;
  id_permiso: number;
}

export interface EquipoMiembro {
  id_miembro: number;
  nombre: string;
  apellido: string | null;
  dni: string | null;
  telefono: string | null;
  email: string | null;
  estado: 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO';
  fecha_creacion: string;
}

export interface EquipoRol {
  id: number;
  id_miembro: number;
  id_rol: number;
  fecha_asignacion: string;
}

export interface UsuarioSistema {
  id_usuario: number;
  id_miembro: number | null;
  usuario: string;
  password_hash: string;
  ultimo_acceso: string | null;
  estado: 'ACTIVO' | 'BLOQUEADO' | 'INACTIVO';
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface SesionUsuario {
  id_sesion: number;
  id_usuario: number | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  ip: string | null;
  dispositivo: string | null;
  id_dispositivo: string | null;
  token_sesion: string | null;
  ultimo_ping: string;
  sistema_operativo: string | null;
  navegador: string | null;
  estado_sesion: 'ACTIVA' | 'CERRADA' | 'EXPIRADA';
}

export interface RecuperacionPassword {
  id_recuperacion: number;
  id_usuario: number;
  token: string;
  estado: 'PENDIENTE' | 'USADO' | 'EXPIRADO';
  fecha_expiracion: string;
  fecha_creacion: string;
}

export interface LogSeguridad {
  id_log: number;
  id_usuario: number | null;
  accion: string | null;
  detalle: string | null;
  fecha: string;
}

export interface LogSeguridadConUsuario extends LogSeguridad {
  usuarios_sistema: { usuario: string } | null;
}

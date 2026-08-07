'use client';

import React, { useState, useRef, useEffect } from 'react';
import { crearMiembro, editarMiembro } from '@/app/actions/equipo';
import { Rol, EquipoMiembro } from '@/types/database.types';

interface MemberToEdit extends EquipoMiembro {
  equipo_roles?: { id_rol: number }[];
  usuarios_sistema?: {
    id_usuario: number;
    usuario: string;
    estado: 'ACTIVO' | 'BLOQUEADO' | 'INACTIVO';
    password_hash?: string | null;
  } | null;
}

interface FormularioEquipoProps {
  isOpen: boolean;
  onClose: () => void;
  roles: Rol[];
  memberToEdit?: MemberToEdit | null; // Objeto de miembro para editar, null si es creación
}

export default function FormularioEquipo({ isOpen, onClose, roles, memberToEdit }: FormularioEquipoProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Estados para los campos
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [dni, setDni] = useState('');
  const [dniError, setDniError] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [rolId, setRolId] = useState('');
  const [estado, setEstado] = useState<'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO'>('ACTIVO');
  
  // Estados para el usuario de sistema
  const [crearUsuario, setCrearUsuario] = useState(true);
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [usuarioEstado, setUsuarioEstado] = useState<'ACTIVO' | 'BLOQUEADO' | 'INACTIVO'>('ACTIVO');
  
  const formRef = useRef<HTMLFormElement>(null);
  const [submitted, setSubmitted] = useState(false);

  const hasSystemAccount = !!memberToEdit?.usuarios_sistema;

  const isNombreInvalid = !nombre.trim();
  const isEmailInvalid = !email.trim();
  const isRolInvalid = !rolId;
  const isUsuarioInvalid = crearUsuario && !usuario.trim();
  const isPasswordInvalid = crearUsuario && !hasSystemAccount && !password;
  const isConfirmPasswordInvalid = crearUsuario && !hasSystemAccount && !confirmPassword;


  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (memberToEdit) {
      setNombre(memberToEdit.nombre || '');
      setApellido(memberToEdit.apellido || '');
      setDni(memberToEdit.dni || '');
      setDniError('');
      setTelefono(memberToEdit.telefono || '');
      setEmail(memberToEdit.email || '');
      setEstado(memberToEdit.estado || 'ACTIVO');
      
      const activeRolId = memberToEdit.equipo_roles?.[0]?.id_rol;
      setRolId(activeRolId ? String(activeRolId) : (roles[0]?.id_rol ? String(roles[0].id_rol) : ''));

      const sysUser = memberToEdit.usuarios_sistema;
      if (sysUser) {
        setUsuario(sysUser.usuario || '');
        setUsuarioEstado(sysUser.estado || 'ACTIVO');
        setCrearUsuario(true);
        setPassword('••••••••');
        setConfirmPassword('••••••••');
      } else {
        setUsuario('');
        setUsuarioEstado('ACTIVO');
        setCrearUsuario(false);
        setPassword('');
        setConfirmPassword('');
      }
    } else {
      // Modo creación
      setNombre('');
      setApellido('');
      setDni('');
      setDniError('');
      setTelefono('');
      setEmail('');
      setEstado('ACTIVO');
      setRolId(roles[0]?.id_rol ? String(roles[0].id_rol) : '');
      setCrearUsuario(true);
      setUsuario('');
      setPassword('');
      setConfirmPassword('');
      setUsuarioEstado('ACTIVO');
    }
    setSubmitted(false);
  }, [memberToEdit, isOpen, roles]);
  /* eslint-enable react-hooks/set-state-in-effect */


  if (!isOpen) return null;

  const handleDniChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/[^0-9]/.test(val)) {
      setDniError('El DNI debe contener solo números.');
    } else {
      setDniError('');
    }
    const cleanVal = val.replace(/[^0-9]/g, '').slice(0, 8);
    setDni(cleanVal);
  };

  const handleClose = () => {
    setNombre('');
    setApellido('');
    setDni('');
    setDniError('');
    setTelefono('');
    setEmail('');
    setEstado('ACTIVO');
    setRolId(roles[0]?.id_rol ? String(roles[0].id_rol) : '');
    setCrearUsuario(true);
    setUsuario('');
    setPassword('');
    setConfirmPassword('');
    setUsuarioEstado('ACTIVO');
    setError(null);
    setSubmitted(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    formRef.current?.reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitted(true);

    // Validar campos obligatorios vacíos
    if (
      isNombreInvalid ||
      isEmailInvalid ||
      isRolInvalid ||
      (crearUsuario && (isUsuarioInvalid || isPasswordInvalid || isConfirmPasswordInvalid))
    ) {
      setError('Por favor, complete todos los campos obligatorios marcados con (*).');
      return;
    }

    // Validador de contraseñas iguales
    if (crearUsuario && password && password !== confirmPassword) {
      setError('Las contraseñas no coinciden. Por favor, verifícalas.');
      return;
    }

    // Validación de DNI
    if (dni && dni.length !== 8) {
      setError('El DNI debe tener exactamente 8 dígitos.');
      return;
    }

    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set('dni', dni);
    if (crearUsuario) {
      formData.set('crear_usuario', 'on');
    } else {
      formData.delete('crear_usuario');
    }

    if (hasSystemAccount) {
      formData.delete('password');
      formData.delete('confirmPassword');
    }

    try {
      let response;
      if (memberToEdit) {
        response = await editarMiembro(memberToEdit.id_miembro, formData);
      } else {
        response = await crearMiembro(formData);
      }

      if (response.error) {
        setError(response.error);
      } else {
        handleClose();
      }
    } catch (err) {
      console.error(err);
      setError('Error inesperado al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const isEditMode = !!memberToEdit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
      {/* Fondo oscuro transparente */}
      <div 
        className="fixed inset-0 bg-slate-900/40 dark:bg-zinc-950/60 backdrop-blur-xs transition-opacity"
        onClick={handleClose}
      ></div>

      {/* Ventana Flotante Centrada */}
      <form 
        ref={formRef}
        onSubmit={handleSubmit}
        className="relative w-full max-w-xl transform overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl transition-all border border-slate-100 dark:border-zinc-800/80 flex flex-col max-h-[85vh] sm:max-h-[90vh] divide-y divide-slate-100 dark:divide-zinc-800/80"
      >
        
        {/* Header del modal */}
        <div className="px-6 py-5 sm:px-8 flex flex-shrink-0 items-center justify-between bg-white dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-850">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white tracking-tight">
              {isEditMode ? 'Editar Miembro' : 'Agregar Nuevo Miembro'}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
              {isEditMode 
                ? 'Actualice los datos personales y credenciales de acceso.' 
                : 'Registre un nuevo miembro y configure su cuenta de acceso.'}
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-350 p-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800/60 focus:outline-none transition-colors cursor-pointer"
            onClick={handleClose}
          >
            <span className="sr-only">Cerrar</span>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Contenido del formulario (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 space-y-6">
          
          {error && (
            <div className="p-3.5 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 leading-relaxed">
              {error}
            </div>
          )}

          {/* Sección 1: Datos Personales */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Datos Personales</h3>
            <div className="grid gap-5 md:grid-cols-2">
              
              {/* Nombre */}
              <div>
                <label htmlFor="nombre" className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">Nombre *</label>
                <input 
                  type="text" 
                  name="nombre" 
                  id="nombre" 
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className={`w-full bg-white dark:bg-zinc-950 border text-slate-800 dark:text-zinc-100 text-xs rounded-xl px-3.5 py-2.5 shadow-2xs focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-600 ${
                    submitted && isNombreInvalid
                      ? 'border-red-500/50 dark:border-red-500/50 focus:border-red-500 bg-red-50/10 dark:bg-red-500/5'
                      : 'border-slate-200 dark:border-zinc-800 focus:border-slate-900 dark:focus:border-white focus:ring-0'
                  }`}
                  placeholder="Ej. Juan" 
                />
              </div>

              {/* Apellido */}
              <div>
                <label htmlFor="apellido" className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">Apellido</label>
                <input 
                  type="text" 
                  name="apellido" 
                  id="apellido" 
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-100 text-xs rounded-xl px-3.5 py-2.5 shadow-2xs focus:outline-none transition-all focus:border-slate-900 dark:focus:border-white focus:ring-0 placeholder:text-slate-400 dark:placeholder:text-zinc-600" 
                  placeholder="Ej. Pérez" 
                />
              </div>

              {/* DNI */}
              <div>
                <label htmlFor="dni" className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">DNI</label>
                <input 
                  type="text" 
                  name="dni" 
                  id="dni" 
                  value={dni}
                  onChange={handleDniChange}
                  maxLength={8}
                  className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-100 text-xs rounded-xl px-3.5 py-2.5 shadow-2xs focus:outline-none transition-all focus:border-slate-900 dark:focus:border-white focus:ring-0 placeholder:text-slate-400 dark:placeholder:text-zinc-600" 
                  placeholder="Ej. 12345678" 
                />
                {dniError && (
                  <p className="mt-1.5 text-xs text-red-500 dark:text-red-400 font-semibold">{dniError}</p>
                )}
              </div>

              {/* Teléfono */}
              <div>
                <label htmlFor="telefono" className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">Teléfono</label>
                <input 
                  type="text" 
                  name="telefono" 
                  id="telefono" 
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-100 text-xs rounded-xl px-3.5 py-2.5 shadow-2xs focus:outline-none transition-all focus:border-slate-900 dark:focus:border-white focus:ring-0 placeholder:text-slate-400 dark:placeholder:text-zinc-600" 
                  placeholder="Ej. 999888777" 
                />
              </div>

              {/* Correo Electrónico */}
              <div>
                <label htmlFor="email" className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">Correo Electrónico *</label>
                <input 
                  type="email" 
                  name="email" 
                  id="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full bg-white dark:bg-zinc-950 border text-slate-800 dark:text-zinc-100 text-xs rounded-xl px-3.5 py-2.5 shadow-2xs focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-600 ${
                    submitted && isEmailInvalid
                      ? 'border-red-500/50 dark:border-red-500/50 focus:border-red-500 bg-red-50/10 dark:bg-red-500/5'
                      : 'border-slate-200 dark:border-zinc-800 focus:border-slate-900 dark:focus:border-white focus:ring-0'
                  }`}
                  placeholder="ejemplo@empresa.com" 
                />
              </div>

              {/* Estado del miembro (Solo en Edición) */}
              <div>
                <label htmlFor="estado" className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">Estado Miembro *</label>
                <select 
                  id="estado" 
                  name="estado" 
                  value={estado}
                  onChange={(e) => setEstado(e.target.value as 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO')}
                  className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-100 text-xs rounded-xl px-3.5 py-2.5 shadow-2xs focus:outline-none transition-all focus:border-slate-900 dark:focus:border-white focus:ring-0 h-[40px]"
                >
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="INACTIVO">INACTIVO</option>
                  <option value="SUSPENDIDO">SUSPENDIDO</option>
                </select>
              </div>

              {/* Rol Asignado */}
              <div className="md:col-span-2">
                <label htmlFor="rol" className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">Rol Asignado *</label>
                <select 
                  id="rol" 
                  name="rol" 
                  value={rolId}
                  onChange={(e) => setRolId(e.target.value)}
                  className={`w-full bg-white dark:bg-zinc-950 border text-slate-800 dark:text-zinc-100 text-xs rounded-xl px-3.5 py-2.5 shadow-2xs focus:outline-none transition-all h-[40px] ${
                    submitted && isRolInvalid
                      ? 'border-red-500/50 dark:border-red-500/50 focus:border-red-500 bg-red-50/10 dark:bg-red-500/5'
                      : 'border-slate-200 dark:border-zinc-800 focus:border-slate-900 dark:focus:border-white focus:ring-0'
                  }`}
                >
                  <option value="" disabled>Seleccionar un rol...</option>
                  {roles.map(rol => (
                    <option key={rol.id_rol} value={rol.id_rol}>{rol.nombre}</option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* Sección 2: Acceso de Usuario al Sistema */}
          <div className="pt-5 border-t border-slate-100 dark:border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Cuenta de Usuario de Sistema</h3>
              
              {!hasSystemAccount && (
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={crearUsuario} 
                    onChange={(e) => setCrearUsuario(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-slate-200 dark:bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-zinc-650 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-zinc-900 dark:peer-checked:bg-white"></div>
                  <span className="ml-2 text-xs font-semibold text-slate-600 dark:text-zinc-400">Habilitar Cuenta</span>
                </label>
              )}
            </div>

            {crearUsuario && (
              <div className="grid gap-5 md:grid-cols-2 p-5 bg-slate-50/30 dark:bg-zinc-950/20 rounded-2xl border border-slate-100 dark:border-zinc-800/80">
                {/* Nombre de Usuario */}
                <div>
                  <label htmlFor="usuario" className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">Nombre de Usuario *</label>
                  <input 
                    type="text" 
                    name="usuario" 
                    id="usuario" 
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    className={`w-full bg-white dark:bg-zinc-950 border text-slate-800 dark:text-zinc-100 text-xs rounded-xl px-3.5 py-2.5 shadow-2xs focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-600 ${
                      submitted && isUsuarioInvalid
                        ? 'border-red-500/50 dark:border-red-500/50 focus:border-red-500 bg-red-50/10 dark:bg-red-500/5'
                        : 'border-slate-200 dark:border-zinc-800 focus:border-slate-900 dark:focus:border-white focus:ring-0'
                    }`}
                    placeholder="Ej. jdoe"
                  />
                </div>

                {/* Estado de la cuenta (Solo en Edición) */}
                {hasSystemAccount && (
                  <div>
                    <label htmlFor="usuario_estado" className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">Estado de Cuenta *</label>
                    <select 
                      id="usuario_estado" 
                      name="usuario_estado" 
                      value={usuarioEstado}
                      onChange={(e) => setUsuarioEstado(e.target.value as 'ACTIVO' | 'BLOQUEADO' | 'INACTIVO')}
                      className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-100 text-xs rounded-xl px-3.5 py-2.5 shadow-2xs focus:outline-none transition-all focus:border-slate-900 dark:focus:border-white focus:ring-0 h-[40px]"
                    >
                      <option value="ACTIVO">ACTIVO</option>
                      <option value="BLOQUEADO">BLOQUEADO</option>
                      <option value="INACTIVO">INACTIVO</option>
                    </select>
                  </div>
                )}

                {/* Contraseña */}
                <div className={hasSystemAccount ? 'md:col-span-2' : ''}>
                  <label htmlFor="password" className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                    {hasSystemAccount ? 'Contraseña (Habilitada)' : 'Contraseña *'}
                  </label>
                  <div className="relative">
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      name="password" 
                      id="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={hasSystemAccount}
                      className={`w-full bg-white dark:bg-zinc-950 border text-slate-800 dark:text-zinc-100 text-xs rounded-xl pl-3.5 pr-10 py-2.5 shadow-2xs focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-600 disabled:bg-slate-50 dark:disabled:bg-zinc-900 disabled:text-slate-400 dark:disabled:text-zinc-650 disabled:border-slate-200 dark:disabled:border-zinc-850 ${
                        submitted && isPasswordInvalid
                          ? 'border-red-500/50 dark:border-red-500/50 focus:border-red-500 bg-red-50/10 dark:bg-red-500/5'
                          : 'border-slate-200 dark:border-zinc-800 focus:border-slate-900 dark:focus:border-white focus:ring-0'
                      }`}
                      placeholder="•••••••••"
                    />
                    {!hasSystemAccount && (
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 dark:text-zinc-500 hover:text-slate-650 dark:hover:text-zinc-350 cursor-pointer"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.822 7.822L21 21m-2.228-2.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Confirmar Contraseña */}
                {!hasSystemAccount && (
                  <div>
                    <label htmlFor="confirmPassword" className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                      Confirmar Contraseña *
                    </label>
                    <div className="relative">
                      <input 
                        type={showConfirmPassword ? 'text' : 'password'} 
                        name="confirmPassword" 
                        id="confirmPassword" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`w-full bg-white dark:bg-zinc-950 border text-slate-800 dark:text-zinc-100 text-xs rounded-xl pl-3.5 pr-10 py-2.5 shadow-2xs focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-600 ${
                          submitted && isConfirmPasswordInvalid
                            ? 'border-red-500/50 dark:border-red-500/50 focus:border-red-500 bg-red-50/10 dark:bg-red-500/5'
                            : 'border-slate-200 dark:border-zinc-800 focus:border-slate-900 dark:focus:border-white focus:ring-0'
                        }`}
                        placeholder="•••••••••"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 dark:text-zinc-500 hover:text-slate-650 dark:hover:text-zinc-350 cursor-pointer"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.822 7.822L21 21m-2.228-2.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    
                    {password && confirmPassword && (
                      <p className={`mt-1.5 text-xs font-semibold ${password === confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
                        {password === confirmPassword ? '✓ Las contraseñas coinciden.' : '✗ Las contraseñas no coinciden.'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
        
        {/* Footer del modal */}
        <div className="flex flex-shrink-0 justify-end px-6 py-4 bg-slate-50/40 dark:bg-zinc-950/40 gap-3 border-t border-slate-100 dark:border-zinc-800/80">
          <button
            type="button"
            className="rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 px-5 py-2.5 text-xs font-semibold text-slate-700 dark:text-zinc-300 shadow-2xs hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
            onClick={handleClose}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="text-white dark:text-zinc-950 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 shadow-2xs font-semibold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Guardando...' : (isEditMode ? 'Guardar Cambios' : 'Registrar Miembro')}
          </button>
        </div>
      </form>
    </div>
  );
}

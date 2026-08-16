'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import FormularioEquipo from './FormularioEquipo';
import { EquipoMiembro, Rol } from '@/types/database.types';
import { eliminarMiembro, validarPasswordUsuario, actualizarPasswordUsuario } from '@/app/actions/equipo';

interface MiembroConRol extends EquipoMiembro {
  equipo_roles?: {
    id_rol: number;
    roles: {
      nombre: string;
    } | null;
  }[];
  usuarios_sistema?: {
    id_usuario: number;
    usuario: string;
    estado: 'ACTIVO' | 'BLOQUEADO' | 'INACTIVO';
    password_hash?: string | null;
  } | null;
}

interface EquipoLayoutProps {
  initialMembers: MiembroConRol[];
  roles: Rol[];
  isAdmin: boolean;
  cajasAbiertas?: {
    id_caja: number;
    id_usuario: number | null;
    monto_inicial: number;
    fecha_apertura: string;
  }[];
}

export default function EquipoLayout({ initialMembers, roles, isAdmin, cajasAbiertas = [] }: EquipoLayoutProps) {
  const members = initialMembers;
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');

  // Estados para Edición y Eliminación
  const [memberToEdit, setMemberToEdit] = useState<MiembroConRol | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<MiembroConRol | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Estados para Modal de Cambio de Contraseña
  const [memberForPasswordChange, setMemberForPasswordChange] = useState<MiembroConRol | null>(null);
  const [passwordChangeStep, setPasswordChangeStep] = useState<'validate' | 'update'>('validate');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  const handlePasswordClick = (person: MiembroConRol) => {
    setMemberForPasswordChange(person);
    setPasswordChangeStep('validate');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setPasswordSuccess(null);
    setIsPasswordLoading(false);
  };

  const handleValidatePassword = async () => {
    if (!memberForPasswordChange?.usuarios_sistema) return;
    setIsPasswordLoading(true);
    setPasswordError(null);

    try {
      const res = await validarPasswordUsuario(
        memberForPasswordChange.usuarios_sistema.id_usuario,
        currentPassword
      );
      if (res.error) {
        setPasswordError(res.error);
      } else {
        setPasswordChangeStep('update');
      }
    } catch (err) {
      console.error(err);
      setPasswordError('Error inesperado al conectar con el servidor.');
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!memberForPasswordChange?.usuarios_sistema) return;
    if (newPassword.length < 6) {
      setPasswordError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.');
      return;
    }

    setIsPasswordLoading(true);
    setPasswordError(null);

    try {
      const res = await actualizarPasswordUsuario(
        memberForPasswordChange.usuarios_sistema.id_usuario,
        newPassword
      );
      if (res.error) {
        setPasswordError(res.error);
      } else {
        setPasswordSuccess('¡La contraseña ha sido actualizada con éxito!');
      }
    } catch (err) {
      console.error(err);
      setPasswordError('Error inesperado al actualizar la contraseña.');
    } finally {
      setIsPasswordLoading(false);
    }
  };

  // Filtrado de la lista en tiempo real
  const filteredMembers = members.filter(member => {
    const matchesSearch =
      member.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.apellido && member.apellido.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (member.dni && member.dni.includes(searchTerm)) ||
      (member.usuarios_sistema?.usuario && member.usuarios_sistema.usuario.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'Todos' || member.estado === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleEditClick = (member: MiembroConRol) => {
    setMemberToEdit(member);
  };

  const handleDeleteClick = (member: MiembroConRol) => {
    setMemberToDelete(member);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!memberToDelete) return;
    setIsDeleteLoading(true);
    setDeleteError(null);

    try {
      const response = await eliminarMiembro(memberToDelete.id_miembro);
      if (response.error) {
        setDeleteError(response.error);
      } else {
        setMemberToDelete(null);
      }
    } catch (err) {
      console.error(err);
      setDeleteError('Error inesperado al conectar con el servidor.');
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const [mounted, setMounted] = useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div suppressHydrationWarning className="space-y-6 animate-pulse p-2 sm:p-4">
        <div suppressHydrationWarning className="h-32 rounded-2xl bg-zinc-200/60 dark:bg-zinc-850" />
        <div suppressHydrationWarning className="h-14 rounded-2xl bg-zinc-200/60 dark:bg-zinc-850" />
        <div suppressHydrationWarning className="h-[450px] rounded-2xl bg-zinc-200/60 dark:bg-zinc-850" />
      </div>
    );
  }

  return (
    <div suppressHydrationWarning className="space-y-6">
      {/* Formulario Modal (Sirve para Crear y Editar) */}
      <FormularioEquipo
        isOpen={isFormOpen || !!memberToEdit}
        onClose={() => {
          setIsFormOpen(false);
          setMemberToEdit(null);
        }}
        roles={roles}
        memberToEdit={memberToEdit}
      />

      {/* Header Panel */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 p-6 shadow-md border border-slate-800 sm:p-8">
        <div className="absolute right-0 top-0 -mr-20 -mt-20 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl"></div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="max-w-xl">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Gestión de Equipo</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Administra los perfiles de los miembros de tu organización, define sus cargos y configura sus accesos al sistema.
            </p>
          </div>
          <div className="flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                setMemberToEdit(null);
                setIsFormOpen(true);
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all duration-200 transform hover:-translate-y-0.5 cursor-pointer text-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Agregar Miembro
            </button>
          </div>
        </div>
      </div>

      {/* Alerta de Cajas Abiertas por el Equipo */}
      {cajasAbiertas.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="text-xl">💰</span>
            <div>
              <p className="text-xs font-bold text-emerald-900">
                Hay {cajasAbiertas.length} turno(s) de caja ABIERTO(S) actualmente en el sistema
              </p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Los cobros y ventas del gimnasio se están registrando en tiempo real en los turnos activos de los colaboradores.
              </p>
            </div>
          </div>
          <Link
            href="/admin/caja"
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-black transition-all shadow-xs shrink-0"
          >
            Ir al Arqueo de Caja →
          </Link>
        </div>
      )}

      {/* Main Container Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        {/* Filters Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre, DNI o usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:outline-none focus:ring-2 focus:ring-brand-soft focus:border-brand block w-full pl-10 pr-4 py-2.5 shadow-xs placeholder:text-body bg-white border-slate-200"
            />
          </div>
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:outline-none focus:ring-2 focus:ring-brand-soft focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body h-[42px] bg-white border-slate-200"
            >
              <option value="Todos">Todos los estados</option>
              <option value="ACTIVO">ACTIVO</option>
              <option value="INACTIVO">INACTIVO</option>
              <option value="SUSPENDIDO">SUSPENDIDO</option>
            </select>
          </div>
        </div>

        {/* Content list/table */}
        {filteredMembers.length > 0 ? (
          <>
            {/* Desktop View - Full Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th scope="col" className="py-4 pl-6 pr-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Miembro
                    </th>
                    <th scope="col" className="px-3 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      DNI
                    </th>
                    <th scope="col" className="px-3 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Teléfono
                    </th>
                    <th scope="col" className="px-3 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Rol
                    </th>
                    <th scope="col" className="px-3 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Contraseña
                    </th>
                    <th scope="col" className="px-3 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Estado
                    </th>
                    <th scope="col" className="relative py-4 pl-3 pr-6 text-right">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredMembers.map((person) => {
                    const initials = `${person.nombre.charAt(0)}${person.apellido?.charAt(0) || ''}`.toUpperCase();
                    const rolNombre = person.equipo_roles?.[0]?.roles?.nombre || '—';
                    const hasUser = !!person.usuarios_sistema;
                    const cajaTurno = cajasAbiertas.find(c => c.id_usuario === person.usuarios_sistema?.id_usuario);
                    return (
                      <tr key={person.id_miembro} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="whitespace-nowrap py-4 pl-6 pr-3">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center font-bold text-blue-700 uppercase shadow-sm border border-blue-200/50">
                              {initials}
                            </div>
                            <div className="ml-4">
                              <div className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                                <span>{person.nombre} {person.apellido || ''}</span>
                                {cajaTurno && (
                                  <Link
                                    href="/admin/caja"
                                    title="Caja abierta actualmente en el sistema"
                                    className="inline-flex items-center gap-1 text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold px-2 py-0.5 rounded-full hover:bg-emerald-200 transition-colors shadow-2xs"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Caja Abierta (S/ {Number(cajaTurno.monto_inicial || 0).toFixed(2)})
                                  </Link>
                                )}
                              </div>
                              <div className="text-xs text-slate-500">{person.email || 'Sin correo registrado'}</div>
                              {hasUser && (
                                <div className="mt-1 flex items-center gap-1.5">
                                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                                    Usuario: @{person.usuarios_sistema?.usuario}
                                  </span>
                                  <span className={`text-[9px] px-1 py-0.2 rounded-full font-bold border ${person.usuarios_sistema?.estado === 'ACTIVO'
                                      ? 'bg-green-50 text-green-700 border-green-200'
                                      : 'bg-red-50 text-red-700 border-red-200'
                                    }`}>
                                    {person.usuarios_sistema?.estado}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">
                          {person.dni || '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">
                          {person.telefono || '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 font-medium">
                          {rolNombre}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">
                          {hasUser ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-slate-500 text-xs">••••••••</span>
                              {isAdmin && (
                                <button
                                  onClick={() => handlePasswordClick(person)}
                                  className="text-[11px] text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100/80 px-2.5 py-1 rounded-lg transition-colors font-semibold"
                                >
                                  Cambiar
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs font-medium">Sin cuenta</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${person.estado === 'ACTIVO'
                            ? 'bg-green-50 text-green-700 ring-green-600/10'
                            : person.estado === 'SUSPENDIDO'
                              ? 'bg-amber-50 text-amber-700 ring-amber-600/10'
                              : 'bg-red-50 text-red-700 ring-red-600/10'
                            }`}>
                            {person.estado}
                          </span>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-6 text-sm font-medium">
                          <div className="flex justify-end gap-2 w-[150px] ml-auto">
                            <button
                              onClick={() => handleEditClick(person)}
                              className={`text-center text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/80 px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-xs font-semibold ${
                                (rolNombre === 'Administrador' || person.usuarios_sistema?.usuario === 'admin')
                                  ? 'w-full'
                                  : ''
                              }`}
                            >
                              Editar
                            </button>
                            {!(rolNombre === 'Administrador' || person.usuarios_sistema?.usuario === 'admin') && (
                              <button
                                onClick={() => handleDeleteClick(person)}
                                className="text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100/80 px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-xs font-semibold"
                              >
                                Eliminar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile View - Cards List */}
            <div className="block sm:hidden divide-y divide-slate-100 bg-white">
              {filteredMembers.map((person) => {
                const initials = `${person.nombre.charAt(0)}${person.apellido?.charAt(0) || ''}`.toUpperCase();
                const rolNombre = person.equipo_roles?.[0]?.roles?.nombre || '—';
                const hasUser = !!person.usuarios_sistema;
                return (
                  <div key={person.id_miembro} className="p-5 flex flex-col gap-3 hover:bg-slate-50/20 transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center font-bold text-blue-700 uppercase shadow-sm border border-blue-200/50">
                          {initials}
                        </div>
                        <div className="ml-3 min-w-0">
                          <div className="font-semibold text-sm text-slate-800 truncate">{person.nombre} {person.apellido || ''}</div>
                          <div className="text-[10px] text-slate-500 truncate">{person.email || 'Sin correo registrado'}</div>
                        </div>
                      </div>
                      <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-2xs font-semibold ring-1 ring-inset flex-shrink-0 ${person.estado === 'ACTIVO'
                        ? 'bg-green-50 text-green-700 ring-green-600/10'
                        : person.estado === 'SUSPENDIDO'
                          ? 'bg-amber-50 text-amber-700 ring-amber-600/10'
                          : 'bg-red-50 text-red-700 ring-red-600/10'
                        }`}>
                        {person.estado}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 bg-slate-50/50 rounded-xl p-3 border border-slate-100 text-xs text-slate-500">
                      <div>
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">DNI</span>
                        <span className="font-semibold text-slate-700 mt-0.5 block">{person.dni || '—'}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Teléfono</span>
                        <span className="font-semibold text-slate-700 mt-0.5 block">{person.telefono || '—'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Rol</span>
                        <span className="font-semibold text-slate-700 mt-0.5 block truncate">{rolNombre}</span>
                      </div>
                      {hasUser && (
                        <div className="col-span-2 pt-2 border-t border-slate-100 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Cuenta de Usuario</span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-700">@{person.usuarios_sistema?.usuario}</span>
                              <span className={`text-[9px] px-1 py-0.2 rounded-full font-bold border ${person.usuarios_sistema?.estado === 'ACTIVO'
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                                }`}>
                                {person.usuarios_sistema?.estado}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Contraseña</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-slate-500 text-xs">••••••••</span>
                              {isAdmin && (
                                <button
                                  onClick={() => handlePasswordClick(person)}
                                  className="text-[10px] text-blue-600 hover:text-blue-700 font-bold bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded transition-colors"
                                >
                                  Cambiar
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 mt-1 w-full">
                      <button
                        onClick={() => handleEditClick(person)}
                        className="text-center flex-1 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/80 px-3 py-2 rounded-xl transition-colors cursor-pointer text-xs font-semibold"
                      >
                        Editar
                      </button>
                      {!(rolNombre === 'Administrador' || person.usuarios_sistema?.usuario === 'admin') && (
                        <button
                          onClick={() => handleDeleteClick(person)}
                          className="text-center flex-1 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100/80 px-3 py-2 rounded-xl transition-colors cursor-pointer text-xs font-semibold"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="p-12 text-center text-slate-500">
            <svg className="mx-auto h-12 w-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <h3 className="text-sm font-bold text-slate-800">No se encontraron miembros</h3>
            <p className="mt-1 text-xs text-slate-500">Intenta cambiar los filtros de búsqueda o agrega un nuevo miembro.</p>
          </div>
        )}
      </div>

      {/* Modal de Confirmación de Eliminación */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-2xl transition-all border border-slate-100 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-100 rounded-full text-red-600 flex-shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-950">¿Eliminar miembro de equipo?</h3>
                <p className="text-xs text-slate-500 mt-0.5">Esta acción eliminará al miembro y su cuenta de usuario.</p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-600">
                {deleteError}
              </div>
            )}

            <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
              Estás a punto de eliminar a <strong className="text-slate-900">{memberToDelete.nombre} {memberToDelete.apellido || ''}</strong>.
              Se eliminará de forma irreversible toda su información personal, asignación de roles, sesiones de acceso y logs de seguridad asociados.
            </div>

            <div className="flex justify-end gap-2.5 mt-2">
              <button
                onClick={() => setMemberToDelete(null)}
                disabled={isDeleteLoading}
                className="rounded-xl bg-white border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleteLoading}
                className="rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-xs font-semibold shadow-sm transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleteLoading ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal para Cambiar Contraseña (con flujo de validación y confirmación) */}
      {memberForPasswordChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl transition-all border border-slate-100 dark:border-slate-800 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 dark:bg-blue-900/50 rounded-full text-blue-600 dark:text-blue-400 flex-shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m-2 4a5 5 0 11-7-7m7 7l.01.01m0 0l2 2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 21l6.435-6.435" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-950 dark:text-white">Cambiar Contraseña</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Usuario: <span className="font-semibold text-slate-850 dark:text-slate-200">@{memberForPasswordChange.usuarios_sistema?.usuario}</span>
                </p>
              </div>
            </div>

            {passwordError && (
              <div className="p-3.5 bg-red-50 dark:bg-red-955/30 border border-red-100 dark:border-red-900/50 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400">
                {passwordError}
              </div>
            )}

            {passwordSuccess ? (
              <div className="flex flex-col gap-4">
                <div className="p-3.5 bg-green-50 dark:bg-green-955/30 border border-green-100 dark:border-green-900/50 rounded-xl text-xs font-semibold text-green-600 dark:text-green-400">
                  {passwordSuccess}
                </div>
                <button
                  onClick={() => setMemberForPasswordChange(null)}
                  className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white py-2.5 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); if (passwordChangeStep === 'validate') { handleValidatePassword(); } else { handleUpdatePassword(); } }} className="space-y-4">
                {passwordChangeStep === 'validate' ? (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">
                      Contraseña Actual de la Cuenta
                    </label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Ingrese la contraseña actual"
                      className="bg-neutral-secondary-medium dark:bg-slate-800 border border-default-medium dark:border-slate-700 text-heading dark:text-white text-sm rounded-base focus:outline-none focus:ring-2 focus:ring-brand-soft focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
                    />
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5">
                      Para continuar, escriba la contraseña actual asignada a este usuario para su validación.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">
                        Nueva Contraseña
                      </label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="bg-neutral-secondary-medium dark:bg-slate-800 border border-default-medium dark:border-slate-700 text-heading dark:text-white text-sm rounded-base focus:outline-none focus:ring-2 focus:ring-brand-soft focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">
                        Confirmar Nueva Contraseña
                      </label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repita la nueva contraseña"
                        className="bg-neutral-secondary-medium dark:bg-slate-800 border border-default-medium dark:border-slate-700 text-heading dark:text-white text-sm rounded-base focus:outline-none focus:ring-2 focus:ring-brand-soft focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={isPasswordLoading}
                    onClick={() => setMemberForPasswordChange(null)}
                    className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPasswordLoading}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isPasswordLoading ? 'Procesando...' : passwordChangeStep === 'validate' ? 'Validar Contraseña' : 'Guardar Nueva'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

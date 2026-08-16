'use client';

import React, { useState } from 'react';
import { MembresiaCliente, ContactoWeb } from '@/types/gym.types';
import { useModalAlert } from '@/context/ModalAlertContext';
import EmailDesignerModal from '@/components/admin/crm/EmailDesignerModal';
import { actualizarEstadoContacto, convertirContactoASocio } from '@/app/actions/crm';
import {
  Users,
  MessageSquare,
  Mail,
  CheckCircle2,
  Clock,
  UserCheck,
  UserPlus,
  Search,
  Filter,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Flame,
  Calendar,
  Phone
} from 'lucide-react';

interface CrmClientProps {
  membresias: MembresiaCliente[];
  initialContactosWeb?: ContactoWeb[];
}

interface CrmItem extends MembresiaCliente {
  diasDiferencia: number;
  estadoVencimiento: 'VENCIDA' | 'VENCE_HOY' | 'ACTIVA';
}

export default function CrmClient({ membresias, initialContactosWeb = [] }: CrmClientProps) {
  const { showAlert } = useModalAlert();
  
  // Pestaña Principal: 'RETENCION' (Socios por vencer) o 'CONTACTOS_WEB' (Leads de la landing)
  const [mainTab, setMainTab] = useState<'RETENCION' | 'CONTACTOS_WEB'>('CONTACTOS_WEB');
  
  // Filtros para Retención de Membresías
  const [filterDays, setFilterDays] = useState<'ALL' | '3_DAYS' | '5_DAYS' | 'EXPIRED'>('ALL');

  // Contactos Web State & Filtros
  const [contactos, setContactos] = useState<ContactoWeb[]>(initialContactosWeb);
  const [contactoFiltroEstado, setContactoFiltroEstado] = useState<'ALL' | 'NUEVO' | 'CONTACTADO' | 'CONVERTIDO'>('ALL');
  const [contactoSearch, setContactoSearch] = useState('');
  
  // Modal de Correo
  const [selectedContactoForEmail, setSelectedContactoForEmail] = useState<ContactoWeb | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  // Estados de carga
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // ---------------------------------------------------------------------------
  // LÓGICA DE RETENCIÓN DE MEMBRESÍAS
  // ---------------------------------------------------------------------------
  const calculatedItems: CrmItem[] = membresias.map(m => {
    const fechaFin = new Date(m.fecha_fin + 'T00:00:00');
    fechaFin.setHours(0, 0, 0, 0);

    const diffTime = fechaFin.getTime() - hoy.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    return {
      ...m,
      diasDiferencia: diffDays,
      estadoVencimiento: (diffDays < 0 ? 'VENCIDA' : diffDays === 0 ? 'VENCE_HOY' : 'ACTIVA') as 'VENCIDA' | 'VENCE_HOY' | 'ACTIVA'
    };
  });

  const filteredMembresias = calculatedItems.filter(item => {
    if (filterDays === '3_DAYS') return item.diasDiferencia >= 0 && item.diasDiferencia <= 3;
    if (filterDays === '5_DAYS') return item.diasDiferencia >= 0 && item.diasDiferencia <= 5;
    if (filterDays === 'EXPIRED') return item.diasDiferencia < 0;
    return true;
  });

  const handleSendWhatsAppSocio = (item: CrmItem) => {
    const cleanPhone = item.clientes?.telefono ? item.clientes.telefono.replace(/\D/g, '') : '';
    if (!cleanPhone) {
      showAlert({
        title: 'Teléfono no registrado',
        message: 'Este socio no tiene un número de teléfono o celular registrado.',
        type: 'warning'
      });
      return;
    }

    let formattedPhone = cleanPhone;
    if (cleanPhone.length === 9) formattedPhone = '51' + cleanPhone;

    const clienteNombre = item.clientes?.nombre || 'Socio';
    const planNombre = item.tipos_membresia?.nombre || 'plan';
    const dias = item.diasDiferencia;

    let mensaje = '';
    if (dias > 0) {
      mensaje = `Hola *${clienteNombre}*, te recordamos que tu membresía del plan *${planNombre}* en *GestionWeb Gym* está próxima a vencer en ${dias} día(s). ¡Te esperamos en recepción para renovar y mantener tus entrenamientos activos!`;
    } else if (dias === 0) {
      mensaje = `Hola *${clienteNombre}*, te recordamos que tu membresía del plan *${planNombre}* vence *HOY*. ¡Renueva hoy mismo en el counter para mantener tu acceso sin interrupciones!`;
    } else {
      mensaje = `Hola *${clienteNombre}*, notamos que tu membresía del plan *${planNombre}* venció hace ${Math.abs(dias)} día(s). ¡Acércate a recepción o responde a este mensaje para activar tu plan!`;
    }

    const url = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  // ---------------------------------------------------------------------------
  // LÓGICA DE BANDEJA DE CONTACTOS WEB
  // ---------------------------------------------------------------------------
  const filteredContactos = contactos.filter(c => {
    if (contactoFiltroEstado !== 'ALL' && c.estado !== contactoFiltroEstado) {
      return false;
    }
    if (contactoSearch.trim()) {
      const q = contactoSearch.toLowerCase();
      const matchName = c.nombre.toLowerCase().includes(q);
      const matchDni = c.dni.includes(q);
      const matchPhone = c.celular.includes(q);
      const matchEmail = c.email.toLowerCase().includes(q);
      const matchMotivo = c.motivo.toLowerCase().includes(q);
      if (!matchName && !matchDni && !matchPhone && !matchEmail && !matchMotivo) {
        return false;
      }
    }
    return true;
  });

  const handleSendWhatsAppLead = (c: ContactoWeb) => {
    let cleanPhone = c.celular.replace(/\D/g, '');
    if (cleanPhone.length === 9) cleanPhone = '51' + cleanPhone;

    const mensaje = `Hola *${c.nombre}*, recibimos tu consulta en *GestionWeb Gym* sobre "*${c.motivo}*". ¡Con mucho gusto te ayudamos con todos los detalles, planes y promociones vigentes! ¿Te gustaría agendar una visita guiada a nuestras instalaciones?`;

    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');

    // Marcar automáticamente como contactado si estaba en nuevo
    if (c.estado === 'NUEVO') {
      handleChangeEstadoContacto(c.id_contacto, 'CONTACTADO');
    }
  };

  const handleOpenEmailModal = (c: ContactoWeb) => {
    setSelectedContactoForEmail(c);
    setIsEmailModalOpen(true);
  };

  const handleChangeEstadoContacto = async (id_contacto: number, nuevoEstado: 'NUEVO' | 'CONTACTADO' | 'CONVERTIDO' | 'DESCARTADO') => {
    setActionLoadingId(id_contacto);
    try {
      const res = await actualizarEstadoContacto(id_contacto, nuevoEstado);
      if (res.success) {
        setContactos(prev =>
          prev.map(item => (item.id_contacto === id_contacto ? { ...item, estado: nuevoEstado } : item))
        );
      }
    } catch {
      showAlert({ title: 'Error', message: 'No se pudo actualizar el estado.', type: 'danger' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConvertirASocio = async (c: ContactoWeb) => {
    if (c.es_socio) {
      showAlert({
        title: 'Socio ya registrado',
        message: `El cliente con DNI ${c.dni} ya se encuentra registrado en el Directorio de Socios.`,
        type: 'info'
      });
      return;
    }

    setActionLoadingId(c.id_contacto);
    try {
      const res = await convertirContactoASocio(c.id_contacto);
      if (res.success) {
        setContactos(prev =>
          prev.map(item =>
            item.id_contacto === c.id_contacto ? { ...item, estado: 'CONVERTIDO', es_socio: true } : item
          )
        );
        showAlert({
          title: '¡Socio Registrado con Éxito!',
          message: `${c.nombre} ha sido añadido al Directorio de Socios en Recepción. Ahora puedes asignarle su membresía en counter.`,
          type: 'success'
        });
      } else {
        showAlert({ title: 'Aviso', message: res.error || 'No se pudo convertir el contacto.', type: 'danger' });
      }
    } catch {
      showAlert({ title: 'Error', message: 'Error al conectar con el servidor.', type: 'danger' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const nuevosCount = contactos.filter(c => c.estado === 'NUEVO').length;

  return (
    <div suppressHydrationWarning className="space-y-6">
      {/* Header Panel Principal CRM */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-zinc-900 via-zinc-850 to-zinc-900 p-6 sm:p-8 shadow-xl border border-zinc-200/10 dark:border-zinc-800 text-white">
        <div className="absolute right-0 top-0 -mr-20 -mt-20 h-80 w-80 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-widest mb-1.5">
              <Users className="w-4 h-4" />
              <span>Gestión de Relaciones & Retención</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              CRM & Bandeja de Prospectos
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-zinc-350 max-w-2xl leading-relaxed">
              Atiende consultas recibidas desde la página web, envía correos corporativos prediseñados, escribe por WhatsApp con un solo clic y fideliza socios con membresías por vencer.
            </p>
          </div>

          {/* Selector de Pestaña Principal */}
          <div className="flex bg-zinc-800/90 border border-zinc-700/80 p-1 rounded-2xl shrink-0 backdrop-blur-xs">
            <button
              type="button"
              onClick={() => setMainTab('CONTACTOS_WEB')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                mainTab === 'CONTACTOS_WEB'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Contactos Web</span>
              {nuevosCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">
                  {nuevosCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setMainTab('RETENCION')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                mainTab === 'RETENCION'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Retención de Socios</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-700 text-zinc-300 font-mono">
                {calculatedItems.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* VISTA 1: BANDEJA DE CONTACTOS WEB (PROSPECTOS / LEADS) */}
      {/* --------------------------------------------------------------------- */}
      {mainTab === 'CONTACTOS_WEB' && (
        <div className="space-y-4">
          {/* Barra de Filtros y Búsqueda */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
            {/* Filtros de Estado */}
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setContactoFiltroEstado('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  contactoFiltroEstado === 'ALL'
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                }`}
              >
                Todos ({contactos.length})
              </button>
              <button
                type="button"
                onClick={() => setContactoFiltroEstado('NUEVO')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  contactoFiltroEstado === 'NUEVO'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                <span>Nuevos ({nuevosCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setContactoFiltroEstado('CONTACTADO')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  contactoFiltroEstado === 'CONTACTADO'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 hover:bg-amber-100'
                }`}
              >
                Contactados ({contactos.filter(c => c.estado === 'CONTACTADO').length})
              </button>
              <button
                type="button"
                onClick={() => setContactoFiltroEstado('CONVERTIDO')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  contactoFiltroEstado === 'CONVERTIDO'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100'
                }`}
              >
                Convertidos a Socio ({contactos.filter(c => c.estado === 'CONVERTIDO').length})
              </button>
            </div>

            {/* Input Buscador */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={contactoSearch}
                onChange={e => setContactoSearch(e.target.value)}
                placeholder="Buscar por nombre, DNI, celular..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {/* Tabla de Prospectos Web */}
          <div className="bg-white border border-zinc-200/80 rounded-3xl shadow-xs overflow-hidden dark:bg-zinc-900 dark:border-zinc-800">
            {filteredContactos.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-950/60 text-zinc-500 dark:text-zinc-400 font-bold border-b border-zinc-200 dark:border-zinc-800">
                      <th className="p-4 uppercase tracking-wider text-[11px]">Prospecto / Contacto</th>
                      <th className="p-4 uppercase tracking-wider text-[11px]">Motivo & Consulta</th>
                      <th className="p-4 uppercase tracking-wider text-[11px]">Estado</th>
                      <th className="p-4 uppercase tracking-wider text-[11px]">Fecha</th>
                      <th className="p-4 uppercase tracking-wider text-[11px] text-right">Atención Rápida</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
                    {filteredContactos.map(c => {
                      const fechaFormateada = new Date(c.fecha_registro).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      return (
                        <tr
                          key={c.id_contacto}
                          className="hover:bg-zinc-50/60 dark:hover:bg-zinc-850/40 transition-colors"
                        >
                          {/* Datos del contacto */}
                          <td className="p-4 align-top">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                                {c.nombre}
                              </span>
                              {c.tiene_membresia_activa ? (
                                <span
                                  className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-200 dark:border-emerald-900/40 flex items-center gap-1"
                                  title={c.plan_actual || 'Plan Activo'}
                                >
                                  <UserCheck className="w-3 h-3" />
                                  <span>Membresía Activa {c.plan_actual ? `(${c.plan_actual})` : ''}</span>
                                </span>
                              ) : c.es_socio ? (
                                <span
                                  className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 text-[10px] font-bold border border-amber-200 dark:border-amber-900/40 flex items-center gap-1"
                                  title="Registrado en el directorio pero sin membresía activa vigente"
                                >
                                  <UserCheck className="w-3 h-3" />
                                  <span>Cliente Registrado (Sin Membresía)</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 text-[10px] font-bold border border-blue-200 dark:border-blue-900/40 flex items-center gap-1">
                                  <UserPlus className="w-3 h-3" />
                                  <span>Nuevo Prospecto</span>
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-zinc-500 dark:text-zinc-400 text-[11px] mt-1">
                              <span>DNI: <strong className="font-mono text-zinc-700 dark:text-zinc-300">{c.dni}</strong></span>
                              <span>•</span>
                              <span>Cel: <strong className="font-mono text-zinc-700 dark:text-zinc-300">{c.celular}</strong></span>
                              <span>•</span>
                              <span className="text-zinc-600 dark:text-zinc-400">{c.email}</span>
                            </div>
                          </td>

                          {/* Motivo y Mensaje */}
                          <td className="p-4 align-top max-w-xs">
                            <span className="inline-block px-2.5 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-[11px] mb-1">
                              {c.motivo}
                            </span>
                            <p className="text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed text-[11px]">
                              &quot;{c.mensaje}&quot;
                            </p>
                          </td>

                          {/* Selector de Estado */}
                          <td className="p-4 align-top">
                            <select
                              value={c.estado}
                              disabled={actionLoadingId === c.id_contacto}
                              onChange={e =>
                                handleChangeEstadoContacto(
                                  c.id_contacto,
                                  e.target.value as 'NUEVO' | 'CONTACTADO' | 'CONVERTIDO' | 'DESCARTADO'
                                )
                              }
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border focus:outline-none cursor-pointer transition-colors ${
                                c.estado === 'NUEVO'
                                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                                  : c.estado === 'CONTACTADO'
                                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                                  : c.estado === 'CONVERTIDO'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'
                              }`}
                            >
                              <option value="NUEVO">🔵 NUEVO</option>
                              <option value="CONTACTADO">🟡 CONTACTADO</option>
                              <option value="CONVERTIDO">🟢 CONVERTIDO</option>
                              <option value="DESCARTADO">⚪ DESCARTADO</option>
                            </select>
                          </td>

                          {/* Fecha */}
                          <td className="p-4 align-top text-zinc-500 font-mono text-[11px]">
                            {fechaFormateada}
                          </td>

                          {/* Acciones */}
                          <td className="p-4 align-top text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* WhatsApp */}
                              <button
                                type="button"
                                onClick={() => handleSendWhatsAppLead(c)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
                                title="Abrir chat de WhatsApp con mensaje personalizado"
                              >
                                <Phone className="w-3.5 h-3.5 fill-current" />
                                <span>WhatsApp</span>
                              </button>

                              {/* Enviar Gmail */}
                              <button
                                type="button"
                                onClick={() => handleOpenEmailModal(c)}
                                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm shadow-red-600/20 transition-all cursor-pointer"
                                title="Abrir respuesta con plantilla en Gmail"
                              >
                                <Mail className="w-3.5 h-3.5" />
                                <span>Gmail</span>
                              </button>

                              {/* Convertir a Socio */}
                              {!c.es_socio && c.estado !== 'CONVERTIDO' && (
                                <button
                                  type="button"
                                  disabled={actionLoadingId === c.id_contacto}
                                  onClick={() => handleConvertirASocio(c)}
                                  className="px-2.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Registrar automáticamente en el directorio de clientes"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span className="hidden lg:inline">A Socio</span>
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
            ) : (
              <div className="p-16 text-center text-zinc-500">
                <MessageSquare className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-700 mb-3" />
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">No hay contactos registrados</h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Las consultas enviadas por los usuarios desde la página web aparecerán aquí en tiempo real.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* VISTA 2: RETENCIÓN DE SOCIOS (VENCIMIENTOS) */}
      {/* --------------------------------------------------------------------- */}
      {mainTab === 'RETENCION' && (
        <div className="space-y-4">
          {/* Tabs Filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterDays('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterDays === 'ALL'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                  : 'bg-white border border-zinc-200 text-zinc-650 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300'
              }`}
            >
              Ver Todos ({calculatedItems.length})
            </button>
            <button
              onClick={() => setFilterDays('3_DAYS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterDays === '3_DAYS'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                  : 'bg-white border border-zinc-200 text-zinc-650 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300'
              }`}
            >
              Vence en 3 días o menos ({calculatedItems.filter(i => i.diasDiferencia >= 0 && i.diasDiferencia <= 3).length})
            </button>
            <button
              onClick={() => setFilterDays('5_DAYS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterDays === '5_DAYS'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                  : 'bg-white border border-zinc-200 text-zinc-650 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300'
              }`}
            >
              Vence en 5 días o menos ({calculatedItems.filter(i => i.diasDiferencia >= 0 && i.diasDiferencia <= 5).length})
            </button>
            <button
              onClick={() => setFilterDays('EXPIRED')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterDays === 'EXPIRED'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                  : 'bg-white border border-zinc-200 text-zinc-650 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300'
              }`}
            >
              Membresías Vencidas ({calculatedItems.filter(i => i.diasDiferencia < 0).length})
            </button>
          </div>

          {/* CRM List Table */}
          <div className="bg-white border border-zinc-200/80 rounded-3xl shadow-xs overflow-hidden dark:bg-zinc-900 dark:border-zinc-800">
            {filteredMembresias.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-950/60 text-zinc-500 dark:text-zinc-400 font-bold border-b border-zinc-200 dark:border-zinc-800">
                      <th className="p-4 uppercase tracking-wider">Cliente Socio</th>
                      <th className="p-4 uppercase tracking-wider">Plan Contratado</th>
                      <th className="p-4 uppercase tracking-wider">Estado Vencimiento</th>
                      <th className="p-4 uppercase tracking-wider">Fecha Fin</th>
                      <th className="p-4 uppercase tracking-wider text-right">Acción Rápida</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
                    {filteredMembresias.map(item => {
                      let badgeColor = '';
                      let badgeText = '';

                      if (item.diasDiferencia < 0) {
                        badgeColor = 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400';
                        badgeText = `Venció hace ${Math.abs(item.diasDiferencia)} día(s)`;
                      } else if (item.diasDiferencia === 0) {
                        badgeColor = 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400';
                        badgeText = 'Vence HOY';
                      } else {
                        badgeColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400';
                        badgeText = `Vence en ${item.diasDiferencia} día(s)`;
                      }

                      return (
                        <tr key={item.id_membresia} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-850/40">
                          <td className="p-4">
                            <div className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">
                              {item.clientes?.nombre} {item.clientes?.apellido || ''}
                            </div>
                            <div className="text-[11px] text-zinc-400 mt-0.5">
                              DNI: {item.clientes?.dni || 'Sin registrar'} — Tel: {item.clientes?.telefono || 'Sin registrar'}
                            </div>
                          </td>
                          <td className="p-4 font-semibold text-zinc-700 dark:text-zinc-300">
                            {item.tipos_membresia?.nombre}
                          </td>
                          <td className="p-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-lg font-bold text-[11px] ${badgeColor}`}>
                              {badgeText}
                            </span>
                          </td>
                          <td className="p-4 text-zinc-500 font-semibold">
                            {new Date(item.fecha_fin + 'T00:00:00').toLocaleDateString('es-ES', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleSendWhatsAppSocio(item)}
                              disabled={!item.clientes?.telefono}
                              className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                              title="Enviar aviso por WhatsApp"
                            >
                              <Phone className="w-3.5 h-3.5 fill-current" />
                              <span>WhatsApp</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-16 text-center text-zinc-500">
                <Users className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-700 mb-3" />
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Todo en orden</h3>
                <p className="mt-1 text-xs text-zinc-500">Ningún cliente se encuentra dentro del filtro seleccionado en este momento.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Diseñador de Correo */}
      <EmailDesignerModal
        contacto={selectedContactoForEmail}
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        onMarkAsContacted={id => handleChangeEstadoContacto(id, 'CONTACTADO')}
      />
    </div>
  );
}

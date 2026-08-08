'use client';

import React, { useState } from 'react';
import { MembresiaCliente } from '@/types/gym.types';
import { useModalAlert } from '@/context/ModalAlertContext';

interface CrmClientProps {
  membresias: MembresiaCliente[];
}

interface CrmItem extends MembresiaCliente {
  diasDiferencia: number;
  estadoVencimiento: 'VENCIDA' | 'VENCE_HOY' | 'ACTIVA';
}


export default function CrmClient({ membresias }: CrmClientProps) {
  const { showAlert } = useModalAlert();
  const [filterDays, setFilterDays] = useState<'ALL' | '3_DAYS' | '5_DAYS' | 'EXPIRED'>('ALL');

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // Calcular días restantes y clasificar
  const calculatedItems = membresias.map((m) => {
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

  // Filtrar según la pestaña seleccionada
  const filteredItems = calculatedItems.filter((item) => {
    if (filterDays === '3_DAYS') {
      return item.diasDiferencia >= 0 && item.diasDiferencia <= 3;
    }
    if (filterDays === '5_DAYS') {
      return item.diasDiferencia >= 0 && item.diasDiferencia <= 5;
    }
    if (filterDays === 'EXPIRED') {
      return item.diasDiferencia < 0;
    }
    return true; // ALL
  });

  // Enviar mensaje de WhatsApp
  const handleSendWhatsApp = (item: CrmItem) => {
    const cleanPhone = item.clientes?.telefono
      ? item.clientes.telefono.replace(/\D/g, '')
      : '';
    
    if (!cleanPhone) {
      showAlert({
        title: 'Teléfono no registrado',
        message: 'Este cliente no tiene un número de teléfono o celular registrado en su ficha de socio.',
        type: 'warning'
      });
      return;
    }

    // Agregar código de país de Perú (51) si tiene 9 dígitos y no tiene prefijo
    let formattedPhone = cleanPhone;
    if (cleanPhone.length === 9) {
      formattedPhone = '51' + cleanPhone;
    }

    const clienteNombre = item.clientes?.nombre || 'Hola';
    const planNombre = item.tipos_membresia?.nombre || 'plan';
    const dias = item.diasDiferencia;
    
    let mensaje = '';
    if (dias > 0) {
      mensaje = `Hola *${clienteNombre}*, te recordamos que tu membresía de plan *${planNombre}* está próxima a vencer en ${dias} día(s). ¡Te esperamos en el gym para renovar y seguir entrenando duro! 💪🏋️`;
    } else if (dias === 0) {
      mensaje = `Hola *${clienteNombre}*, te recordamos que tu membresía de plan *${planNombre}* vence *HOY*. ¡Renueva hoy mismo para no perder tu acceso al gimnasio! 🏋️‍♀️🔥`;
    } else {
      mensaje = `Hola *${clienteNombre}*, notamos que tu membresía de plan *${planNombre}* venció hace ${Math.abs(dias)} día(s). ¡Aprovecha nuestra promo especial de renovación hoy! Escríbenos para activarla. 💪😎`;
    }

    const url = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 p-6 shadow-md border border-zinc-200/10 sm:p-8 dark:border-zinc-800">
        <div className="absolute right-0 top-0 -mr-20 -mt-20 h-80 w-80 rounded-full bg-zinc-700/10 blur-3xl"></div>
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Retención y CRM</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Fidelización y retención de clientes. Consulta los planes por vencer y envíales un recordatorio amigable por WhatsApp con un solo clic.
          </p>
        </div>
      </div>

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
      <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-xs overflow-hidden dark:bg-zinc-900 dark:border-zinc-850">
        {filteredItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-850 text-zinc-400 font-bold border-b border-zinc-150 dark:border-zinc-800">
                  <th className="p-4 uppercase tracking-wider">Cliente</th>
                  <th className="p-4 uppercase tracking-wider">Plan Contratado</th>
                  <th className="p-4 uppercase tracking-wider">Estado Vencimiento</th>
                  <th className="p-4 uppercase tracking-wider">Fecha Fin</th>
                  <th className="p-4 uppercase tracking-wider">Acción Rápida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
                {filteredItems.map((item) => {
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
                    <tr key={item.id_membresia} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-850/10">
                      <td className="p-4">
                        <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                          {item.clientes?.nombre} {item.clientes?.apellido || ''}
                        </div>
                        <div className="text-[10px] text-zinc-450 dark:text-zinc-500 mt-0.5">
                          DNI: {item.clientes?.dni || 'Sin registrar'} — Tel: {item.clientes?.telefono || 'Sin registrar'}
                        </div>
                      </td>
                      <td className="p-4 font-semibold text-zinc-700 dark:text-zinc-350">
                        {item.tipos_membresia?.nombre}
                      </td>
                      <td className="p-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-md font-bold ${badgeColor}`}>
                          {badgeText}
                        </span>
                      </td>
                      <td className="p-4 text-zinc-500 font-semibold">
                        {new Date(item.fecha_fin + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleSendWhatsApp(item)}
                          disabled={!item.clientes?.telefono}
                          className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Enviar aviso por WhatsApp"
                        >
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.193 1.45 4.817 1.452 5.433 0 9.85-4.417 9.854-9.852.002-2.63-1.023-5.101-2.883-6.963C16.478 1.928 14.015.908 11.4 1.096c-5.436 0-9.853 4.418-9.858 9.853-.002 1.625.42 3.218 1.22 4.62l-1.011 3.693 3.791-.994c1.396.762 2.975 1.164 4.505 1.166zm10.742-7.393c-.295-.148-1.748-.862-2.019-.962-.271-.099-.468-.148-.665.148-.198.295-.765.962-.937 1.159-.172.198-.344.222-.64.074-.295-.148-1.25-.461-2.382-1.472-.881-.787-1.476-1.76-1.649-2.057-.172-.295-.018-.455.13-.603.133-.133.295-.345.443-.518.148-.172.198-.295.295-.493.099-.198.05-.37-.025-.518-.074-.148-.665-1.602-.911-2.193-.24-.578-.48-.5-.665-.509-.172-.008-.37-.01-.567-.01-.198 0-.518.074-.789.37-.271.295-1.035 1.012-1.035 2.467 0 1.456 1.06 2.863 1.208 3.061.148.198 2.087 3.187 5.056 4.47.706.305 1.257.488 1.687.625.71.225 1.356.193 1.867.118.571-.085 1.748-.714 1.995-1.405.247-.69.247-1.282.172-1.405-.074-.124-.271-.198-.567-.346z" />
                          </svg>
                          WhatsApp
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
            <svg className="mx-auto h-12 w-12 text-zinc-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <h3 className="text-sm font-bold text-zinc-800">Todo en orden</h3>
            <p className="mt-1 text-xs text-zinc-500">Ningún cliente se encuentra dentro del filtro seleccionado en este momento.</p>
          </div>
        )}
      </div>
    </div>
  );
}

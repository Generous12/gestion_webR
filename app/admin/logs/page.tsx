import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { LogSeguridadConUsuario } from '@/types/database.types';
import { getSesionActual } from '@/app/actions/auth';
import { redirect } from 'next/navigation';
import LogsFilterForm from './LogsFilterForm';

export default async function LogsSeguridadPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; date?: string }>;
}) {
  const user = await getSesionActual();
  if (!user || (user.usuario !== 'admin' && !user.modulos?.includes('LogsSeguridad'))) {
    redirect('/admin');
  }

  const resolvedParams = await searchParams;
  const q = resolvedParams.q || '';
  const date = resolvedParams.date || '';

  const supabase = await createClient();

  // Armar la consulta base de logs
  let query = supabase
    .from('logs_seguridad')
    .select('*, usuarios_sistema(usuario)')
    .order('fecha', { ascending: false })
    .limit(50);

  // Filtrar si hay una búsqueda de texto
  if (q) {
    query = query.or(`accion.ilike.%${q}%,detalle.ilike.%${q}%`);
  }

  // Filtrar por fecha exacta (formato YYYY-MM-DD)
  if (date) {
    const inicioDia = `${date}T00:00:00.000Z`;
    const finDia = `${date}T23:59:59.999Z`;
    query = query.gte('fecha', inicioDia).lte('fecha', finDia);
  }

  const { data: logs } = await query;

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 p-6 shadow-md border border-slate-800 sm:p-8">
        <div className="absolute right-0 top-0 -mr-20 -mt-20 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl"></div>
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Logs de Seguridad</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Historial de eventos de seguridad, auditorías y control de sesiones registrados en tiempo real.
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200/85 rounded-2xl shadow-sm overflow-hidden">
        {/* Formulario de Filtros */}
        <LogsFilterForm initialQ={q} initialDate={date} />

        {/* Content list/table */}
        {logs && logs.length > 0 ? (
          <>
            {/* Desktop View - Full Table (Hidden on small/medium screens) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-6 pr-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Fecha y Hora
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Acción
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Detalle
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {logs.map((log: LogSeguridadConUsuario) => (
                    <tr key={log.id_log} className="hover:bg-slate-50/40 transition-colors">
                      <td className="whitespace-nowrap py-4 pl-6 pr-3 text-xs text-slate-500">
                        {new Date(log.fecha).toLocaleString('es-PE', { timeZone: 'America/Lima' })}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-xs font-bold text-slate-800">
                        {log.usuarios_sistema?.usuario || 'Sistema'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-xs">
                        <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-2xs font-semibold ring-1 ring-inset ${
                          log.accion === 'LOGIN_FALLIDO' 
                            ? 'bg-rose-50 text-rose-700 ring-rose-600/10' 
                            : log.accion === 'LOGIN_EXITOSO'
                            ? 'bg-green-50 text-green-700 ring-green-600/10'
                            : log.accion === 'CREACION_ADMIN'
                            ? 'bg-indigo-50 text-indigo-700 ring-indigo-600/10'
                            : 'bg-blue-50 text-blue-700 ring-blue-600/10'
                        }`}>
                          {log.accion}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-xs text-slate-600 max-w-md truncate leading-relaxed">
                        {log.detalle}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View - Cards List (Hidden on desktop/tablet) */}
            <div className="block md:hidden divide-y divide-slate-100 bg-white">
              {logs.map((log: LogSeguridadConUsuario) => (
                <div key={log.id_log} className="p-5 flex flex-col gap-2.5 hover:bg-slate-50/20 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-2xs font-semibold ring-1 ring-inset ${
                      log.accion === 'LOGIN_FALLIDO' 
                        ? 'bg-rose-50 text-rose-700 ring-rose-600/10' 
                        : log.accion === 'LOGIN_EXITOSO'
                        ? 'bg-green-50 text-green-700 ring-green-600/10'
                        : log.accion === 'CREACION_ADMIN'
                        ? 'bg-indigo-50 text-indigo-700 ring-indigo-600/10'
                        : 'bg-blue-50 text-blue-700 ring-blue-600/10'
                    }`}>
                      {log.accion}
                    </span>
                    <span className="text-[10px] text-slate-450 font-semibold bg-slate-100/70 px-2 py-0.5 rounded">
                      {new Date(log.fecha).toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 flex justify-between">
                    <span>
                      <strong className="text-slate-800 font-semibold">Usuario:</strong> {log.usuarios_sistema?.usuario || 'Sistema'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.fecha).toLocaleDateString('es-PE', { timeZone: 'America/Lima' })}
                    </span>
                  </div>

                  <div className="text-xs text-slate-650 leading-relaxed bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                    {log.detalle}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="p-12 text-center text-slate-500">
            <svg className="mx-auto h-12 w-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-sm font-bold text-slate-850">No se encontraron logs</h3>
            <p className="mt-1 text-xs text-slate-500">No se encontraron registros de seguridad que coincidan con la búsqueda.</p>
          </div>
        )}
      </div>
    </div>
  );
}

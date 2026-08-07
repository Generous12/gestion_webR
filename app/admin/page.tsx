import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { LogSeguridadConUsuario } from '@/types/database.types';
import { getSesionActual } from '@/app/actions/auth';
import { redirect } from 'next/navigation';

function obtenerHace24Horas() {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
}

export default async function AdminDashboardPage() {
  const user = await getSesionActual();
  if (!user) {
    redirect('/login');
  }

  if (user.usuario !== 'admin' && !user.modulos?.includes('Dashboard')) {
    if (user.modulos?.includes('EquipoUsuarios')) {
      redirect('/admin/equipo');
    } else if (user.modulos?.includes('RolesPermisos')) {
      redirect('/admin/roles');
    } else if (user.modulos?.includes('LogsSeguridad')) {
      redirect('/admin/logs');
    } else {
      redirect('/login');
    }
  }

  const supabase = await createClient();

  // 1. Obtener cantidad de usuarios activos
  const { count: usuariosActivos } = await supabase
    .from('usuarios_sistema')
    .select('*', { count: 'exact', head: true })
    .eq('estado', 'ACTIVO');

  // 2. Obtener cantidad de roles
  const { count: totalRoles } = await supabase
    .from('roles')
    .select('*', { count: 'exact', head: true });

  // 3. Obtener sesiones totales hoy (desde hace 24 horas)
  const hace24Horas = obtenerHace24Horas();
  const { count: sesionesHoy } = await supabase
    .from('sesiones_usuario')
    .select('*', { count: 'exact', head: true })
    .gt('fecha_inicio', hace24Horas);

  // 4. Logs de incidentes recientes (LOGIN_FALLIDO)
  const { count: fallidos } = await supabase
    .from('logs_seguridad')
    .select('*', { count: 'exact', head: true })
    .eq('accion', 'LOGIN_FALLIDO');

  // 5. Últimas acciones registradas en el log
  const { data: logsRecientes } = await supabase
    .from('logs_seguridad')
    .select('*, usuarios_sistema(usuario)')
    .order('fecha', { ascending: false })
    .limit(5);

  const stats = [
    { 
      name: 'Usuarios Activos', 
      value: usuariosActivos ?? 0,
      icon: (
        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      borderColor: 'border-l-blue-500'
    },
    { 
      name: 'Roles del Sistema', 
      value: totalRoles ?? 0,
      icon: (
        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      borderColor: 'border-l-indigo-500'
    },
    { 
      name: 'Sesiones (Últimas 24h)', 
      value: sesionesHoy ?? 0,
      icon: (
        <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      borderColor: 'border-l-emerald-500'
    },
    { 
      name: 'Intentes Fallidos', 
      value: fallidos ?? 0,
      icon: (
        <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      borderColor: 'border-l-rose-500'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 p-6 shadow-md border border-slate-800 sm:p-8">
        <div className="absolute right-0 top-0 -mr-20 -mt-20 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl"></div>
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Resumen de Seguridad</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Monitoreo en tiempo real de accesos, métricas clave e historial de actividades del sistema de seguridad.
          </p>
        </div>
      </div>

      {/* Grid of Key Statistics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div key={item.name} className={`bg-white rounded-xl p-5 shadow-sm border border-slate-200/80 border-l-4 ${item.borderColor} flex items-center justify-between`}>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{item.name}</span>
              <p className="text-2xl font-bold text-slate-850 tracking-tight">{item.value}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              {item.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Security Logs list & Quick info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Logs column */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-sm font-bold text-slate-850">Últimos Logs de Seguridad</h2>
            <p className="text-xs text-slate-500 mt-0.5">Actividades de autenticación y auditorías de seguridad recientes.</p>
          </div>
          
          {logsRecientes && logsRecientes.length > 0 ? (
            <ul role="list" className="divide-y divide-slate-100">
              {logsRecientes.map((log: LogSeguridadConUsuario) => (
                <li key={log.id_log} className="p-5 hover:bg-slate-50/40 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`mt-0.5 p-2 rounded-xl flex-shrink-0 border ${
                        log.accion === 'LOGIN_FALLIDO'
                          ? 'bg-rose-50 border-rose-100 text-rose-600'
                          : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                      }`}>
                        {log.accion === 'LOGIN_FALLIDO' ? (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">{log.accion}</p>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                          Usuario: <span className="font-medium text-slate-700">{log.usuarios_sistema?.usuario || 'Sistema'}</span> — {log.detalle}
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 rounded-lg px-2 py-1">
                        {new Date(log.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <p className="text-[9px] text-slate-400 mt-1 font-medium">
                        {new Date(log.fecha).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-10 text-center text-slate-500">
              <svg className="mx-auto h-12 w-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h3 className="text-sm font-bold text-slate-800">No hay registros</h3>
              <p className="mt-1 text-xs text-slate-500">No se han registrado logs de seguridad todavía.</p>
            </div>
          )}
        </div>

        {/* Right Info Column (Quick details / tips) */}
        <div className="lg:col-span-1 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-blue-900 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Recomendaciones
          </h2>
          <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
            <div className="bg-white/80 rounded-xl p-3.5 border border-blue-100">
              <p className="font-semibold text-blue-900">Mantén los roles actualizados</p>
              <p className="mt-1 text-slate-500 text-[11px]">Asigna permisos restrictivos según el rol de cada usuario para evitar accesos no autorizados a datos confidenciales.</p>
            </div>
            <div className="bg-white/80 rounded-xl p-3.5 border border-blue-100">
              <p className="font-semibold text-blue-900">Audita incidentes</p>
              <p className="mt-1 text-slate-500 text-[11px]">Los intentos fallidos acumulados pueden indicar ataques de fuerza bruta. Configura alertas de seguridad si detectas picos de actividad.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

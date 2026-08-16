'use client';

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutUsuario, getSesionActual } from '@/app/actions/auth';
import { ModalAlertProvider } from '@/context/ModalAlertContext';
import { Caja } from '@/types/gym.types';

export interface AdminLayoutClientProps {
  children: React.ReactNode;
  user: {
    usuario: string;
    permisos?: string[];
    modulos?: string[];
    roles?: string[];
    equipo?: {
      nombre: string;
      apellido: string | null;
      email: string | null;
    } | null;
  };
  cajaActiva?: Caja | null;
}

interface NavItem {
  name: string;
  href: string;
  modulo: string;
  roleBadge: string;
  badge?: string;
  badgeType?: 'success' | 'danger' | 'warning' | 'neutral';
  icon: React.ReactNode;
}

interface NavCategory {
  title: string;
  roleScope: string;
  items: NavItem[];
}

function subscribeTheme(callback: () => void) {
  window.addEventListener('storage', callback);
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.attributeName === 'class') {
        callback();
      }
    }
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
  return () => {
    window.removeEventListener('storage', callback);
    observer.disconnect();
  };
}

function getThemeSnapshot() {
  return document.documentElement.classList.contains('dark');
}

function getThemeServerSnapshot() {
  return true;
}

const emptySubscribe = () => () => {};

export default function AdminLayoutClient({ children, user, cajaActiva }: AdminLayoutClientProps) {
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState<string>(pathname);
  const [optimisticPath, setOptimisticPath] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sincronizar estado cuando cambia la ruta sin renderizados en cascada (recomendado por React)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOptimisticPath(null);
    setIsNavigating(false);
  }

  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const isDark = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getThemeServerSnapshot
  );

  const toggleTheme = (event: React.MouseEvent<HTMLButtonElement>) => {
    const isDarkBefore = document.documentElement.classList.contains('dark');

    const changeTheme = () => {
      const isDarkNow = document.documentElement.classList.toggle('dark');
      try {
        localStorage.setItem('theme', isDarkNow ? 'dark' : 'light');
        localStorage.setItem('gym_theme', isDarkNow ? 'dark' : 'light');
      } catch {}
    };

    if (!document.startViewTransition) {
      changeTheme();
      return;
    }

    const x = event.clientX;
    const y = event.clientY;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = document.startViewTransition(changeTheme);

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`
          ]
        },
        {
          duration: 550,
          easing: 'ease-in-out',
          pseudoElement: isDarkBefore
            ? '::view-transition-old(root)'
            : '::view-transition-new(root)'
        }
      );
    });
  };

  useEffect(() => {
    const TIEMPO_INACTIVIDAD = 30 * 60 * 1000; // 30 minutos

    let timeoutId: number;
    let ultimoPingEnviado = 0;
    const PING_INTERVAL = Math.min(60 * 1000, TIEMPO_INACTIVIDAD / 2);

    const reiniciarTemporizador = () => {
      window.clearTimeout(timeoutId);

      timeoutId = window.setTimeout(async () => {
        await logoutUsuario();
      }, TIEMPO_INACTIVIDAD);

      const ahora = Date.now();
      if (ahora - ultimoPingEnviado > PING_INTERVAL) {
        ultimoPingEnviado = ahora;
        getSesionActual().catch(console.error);
      }
    };

    const eventos = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    reiniciarTemporizador();

    eventos.forEach((evento) => {
      window.addEventListener(evento, reiniciarTemporizador);
    });

    return () => {
      window.clearTimeout(timeoutId);
      eventos.forEach((evento) => {
        window.removeEventListener(evento, reiniciarTemporizador);
      });
    };
  }, []);

  // Módulos ordenados de forma estratégica según roles y dependencia operativa real
  const categories: NavCategory[] = [
    {
      title: 'Punto de Venta y Caja',
      roleScope: 'Rol: Cajero / Mostrador',
      items: [
        {
          name: 'Arqueo de Caja',
          href: '/admin/caja',
          modulo: 'Caja',
          roleBadge: 'Turno / Fondos',
          badge: cajaActiva ? 'Abierta' : 'Cerrada',
          badgeType: cajaActiva ? 'success' : 'danger',
          icon: (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          )
        },
        {
          name: 'Venta de Productos (POS)',
          href: '/admin/ventas',
          modulo: 'Ventas',
          roleBadge: 'Cajero / Cobro',
          badge: !cajaActiva ? '🔒 Requiere Caja' : undefined,
          badgeType: 'warning',
          icon: (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          )
        },
        {
          name: 'Historial y Vouchers',
          href: '/admin/historial-ventas',
          modulo: 'HistorialVentas',
          roleBadge: 'Auditoría Boletas',
          icon: (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )
        },
        {
          name: 'Inventario y Stock',
          href: '/admin/inventario',
          modulo: 'Inventario',
          roleBadge: 'Almacén / Bebidas',
          icon: (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          )
        }
      ]
    },
    {
      title: 'Recepción y Atención al Socio',
      roleScope: 'Rol: Recepcionista / Entrenador',
      items: [
        {
          name: 'Recepción (Check-in DNI)',
          href: '/admin/recepcion',
          modulo: 'Recepcion',
          roleBadge: 'Control Puerta',
          icon: (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          )
        },
        {
          name: 'CRM y Directorio de Socios',
          href: '/admin/crm',
          modulo: 'CRM',
          roleBadge: 'Fichas / Clientes',
          icon: (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          )
        },
        {
          name: 'Planes y Tarifas',
          href: '/admin/planes',
          modulo: 'Planes',
          roleBadge: 'Catálogo Tarifas',
          icon: (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          )
        }
      ]
    },
    {
      title: 'Dirección, Finanzas y Reportes',
      roleScope: 'Rol: Administrador / Dueño',
      items: [
        {
          name: 'Dashboard General',
          href: '/admin',
          modulo: 'Dashboard',
          roleBadge: 'KPIs en Vivo',
          icon: (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
            </svg>
          )
        },
        {
          name: 'Finanzas y Gastos',
          href: '/admin/finanzas',
          modulo: 'Finanzas',
          roleBadge: 'Flujo de Caja / SUNAT',
          icon: (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        }
      ]
    },
    {
      title: 'Seguridad y Personal',
      roleScope: 'Rol: Super Admin / TI',
      items: [
        {
          name: 'Equipo y Colaboradores',
          href: '/admin/equipo',
          modulo: 'EquipoUsuarios',
          roleBadge: 'Usuarios / Turnos',
          icon: (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )
        },
        {
          name: 'Roles y Permisos (RBAC)',
          href: '/admin/roles',
          modulo: 'RolesPermisos',
          roleBadge: 'Privilegios',
          icon: (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          )
        },
        {
          name: 'Auditoría y Logs',
          href: '/admin/logs',
          modulo: 'LogsSeguridad',
          roleBadge: 'Trazabilidad TI',
          icon: (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )
        }
      ]
    }
  ];

  // Helper para validar permisos de acceso a cada ítem del menú según RBAC estricto
  const tieneAccesoModulo = (modulo: string, _href: string) => {
    if (user.usuario === 'admin') return true;
    const esAdmin = user.roles?.includes('Super Admin') || user.roles?.includes('Administrador') || user.roles?.includes('Admin');
    if (esAdmin) return true;
    return user.modulos?.includes(modulo) || user.permisos?.includes(modulo) || false;
  };

  const userInitials = user.equipo
    ? `${user.equipo.nombre.charAt(0)}${user.equipo.apellido?.charAt(0) || ''}`
    : user.usuario.substring(0, 2).toUpperCase();

  const userFullName = user.equipo
    ? `${user.equipo.nombre} ${user.equipo.apellido || ''}`
    : user.usuario;

  const userRole = user.roles && user.roles.length > 0 ? user.roles.join(', ') : 'Usuario';

  return (
    <div suppressHydrationWarning className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950/20 flex">
        {/* Sidebar - Desktop */}
        <div className="hidden md:flex w-68 flex-col fixed inset-y-0 z-50 bg-white dark:bg-zinc-950 border-r border-zinc-200/70 dark:border-zinc-900 shadow-xs">
          <div className="flex h-16 shrink-0 items-center justify-between px-5 border-b border-zinc-200/50 dark:border-zinc-900">
            <Link href="/admin" className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-xs font-black text-white shadow-sm shadow-blue-500/20">
                G
              </div>
              <div>
                <span className="text-sm font-black text-zinc-900 dark:text-white tracking-tight block">GestionWeb</span>
                <span className="text-[10px] text-zinc-400 font-medium block -mt-0.5">Gym Management OS</span>
              </div>
            </Link>
          </div>

          <div className="flex flex-1 flex-col overflow-y-auto px-3 py-4 space-y-5">
            <nav className="flex-1 space-y-5">
              {categories.map((cat) => {
                const filteredItems = cat.items.filter(item => tieneAccesoModulo(item.modulo, item.href));
                if (filteredItems.length === 0) return null;
                return (
                  <div key={cat.title} className="space-y-1">
                    <div className="px-3 flex items-center justify-between mb-1">
                      <h3 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                        {cat.title}
                      </h3>
                    </div>
                    <div className="space-y-0.5">
                      {filteredItems.map((item) => {
                        const currentPath = (isNavigating && optimisticPath) ? optimisticPath : pathname;
                        const isActive = currentPath === item.href || (item.href !== '/admin' && currentPath?.startsWith(`${item.href}`));
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            prefetch={true}
                            onClick={() => {
                              if (pathname !== item.href) {
                                setOptimisticPath(item.href);
                                setIsNavigating(true);
                              }
                            }}
                            className={`group flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all ${isActive
                              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 dark:bg-blue-600 dark:text-white'
                              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/80 dark:hover:bg-zinc-900/80 hover:text-zinc-950 dark:hover:text-white'
                              }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <span className={`${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-700 dark:text-zinc-500 dark:group-hover:text-zinc-300'} transition-colors`}>
                                {item.icon}
                              </span>
                              <span className="truncate">{item.name}</span>
                            </div>
                            {item.badge && (
                              <span
                                className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md tracking-tight shrink-0 ${isActive
                                    ? 'bg-white/20 text-white'
                                    : item.badgeType === 'success'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                      : item.badgeType === 'danger'
                                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                        : item.badgeType === 'warning'
                                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                                  }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>
          </div>

          {/* User Card */}
          <div className="p-3 border-t border-zinc-200/60 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/40">
            <div className="flex items-center gap-3 px-2 py-1.5 rounded-xl">
              <div className="h-8 w-8 rounded-lg bg-zinc-900 dark:bg-white flex items-center justify-center text-xs font-bold text-white dark:text-zinc-950 shrink-0 uppercase shadow-2xs">
                {userInitials}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">{userFullName}</span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate font-medium">{userRole}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col md:pl-68 h-screen">
          {/* Barra de progreso de carga superior instantánea */}
          {isNavigating && (
            <div className="fixed top-0 left-0 right-0 h-1 z-[100] overflow-hidden bg-blue-100/40 dark:bg-blue-950/40">
              <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 animate-pulse w-full shadow-[0_0_12px_rgba(59,130,246,0.9)]" />
            </div>
          )}

          {/* Header - Mobile & Desktop */}
          <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-zinc-200/60 bg-white/90 backdrop-blur-md dark:bg-zinc-950/90 dark:border-zinc-900 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="-m-2.5 p-2.5 text-zinc-500 md:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <span className="sr-only">Abrir menú</span>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>

              {/* Path indicator */}
              <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-zinc-400">
                <span>Admin</span>
                <span>/</span>
                <span className="text-zinc-800 dark:text-zinc-200 font-semibold capitalize">
                  {pathname === '/admin' ? 'Dashboard General' : pathname.replace('/admin/', '').replace('-', ' ')}
                </span>
                {isNavigating && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-blue-500 font-bold bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    Cargando...
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Indicador de Estado de Caja en Header */}
              {cajaActiva ? (
                <Link
                  href="/admin/caja"
                  prefetch={true}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all hover:bg-emerald-100 dark:hover:bg-emerald-900/60 shadow-2xs"
                  title="Caja activa. Haz clic para ver arqueo y movimientos."
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="hidden sm:inline">Caja Abierta:</span> S/ {Number(cajaActiva.monto_inicial || 0).toFixed(2)}
                </Link>
              ) : (
                <Link
                  href="/admin/caja"
                  prefetch={true}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-300 text-xs font-bold transition-all hover:bg-amber-100 dark:hover:bg-amber-900/60 shadow-2xs"
                  title="Caja no iniciada. Haz clic para abrir turno."
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span className="hidden sm:inline">Caja Cerrada •</span> Abrir Turno
                </Link>
              )}

              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
                aria-label="Cambiar modo oscuro / claro"
                title="Cambiar tema"
              >
                {!isMounted ? (
                  <span className="w-4 h-4 block" />
                ) : isDark ? (
                  <svg className="w-4 h-4 text-amber-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707m12.728 12.728A9 9 0 115.636 5.636a9 9 0 0112.728 12.728z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-zinc-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              <button
                onClick={() => logoutUsuario()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/50 transition-all cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Salir
              </button>
            </div>
          </header>

          {/* Mobile menu modal */}
          {isMobileMenuOpen && (
            <div className="relative z-50 md:hidden">
              <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs transition-opacity" onClick={() => setIsMobileMenuOpen(false)}></div>
              <div className="fixed inset-0 flex flex-row">
                <div className="relative flex w-full max-w-xs flex-col bg-white dark:bg-zinc-950 pt-5 pb-4 border-r border-zinc-200 dark:border-zinc-900 shadow-xl">
                  <div className="flex h-12 shrink-0 items-center justify-between px-6 border-b border-zinc-100 dark:border-zinc-900 pb-4">
                    <Link href="/admin" prefetch={true} className="flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
                      <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center text-xs font-black text-white">G</div>
                      <span className="text-base font-bold text-zinc-900 dark:text-white">GestionWeb</span>
                    </Link>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer">
                      ✕
                    </button>
                  </div>
                  <nav className="mt-4 space-y-4 px-3 flex-1 overflow-y-auto">
                    {categories.map((cat) => {
                      const filteredItems = cat.items.filter(item => tieneAccesoModulo(item.modulo, item.href));
                      if (filteredItems.length === 0) return null;
                      return (
                        <div key={cat.title} className="space-y-1">
                          <h3 className="px-3 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                            {cat.title}
                          </h3>
                          <div className="space-y-0.5">
                            {filteredItems.map((item) => {
                              const currentPath = (isNavigating && optimisticPath) ? optimisticPath : pathname;
                              const isActive = currentPath === item.href || (item.href !== '/admin' && currentPath?.startsWith(`${item.href}`));
                              return (
                                <Link
                                  key={item.name}
                                  href={item.href}
                                  prefetch={true}
                                  onClick={() => {
                                    setIsMobileMenuOpen(false);
                                    if (pathname !== item.href) {
                                      setOptimisticPath(item.href);
                                      setIsNavigating(true);
                                    }
                                  }}
                                  className={`group flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-xl transition-all ${isActive
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                                    }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    {item.icon}
                                    <span>{item.name}</span>
                                  </div>
                                  {item.badge && (
                                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-white/20 text-white">
                                      {item.badge}
                                    </span>
                                  )}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </nav>
                </div>
              </div>
            </div>
          )}

          {/* Main page view */}
          <main className="flex-1 overflow-y-auto bg-zinc-50/40 dark:bg-zinc-950/20">
            <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
  );
}

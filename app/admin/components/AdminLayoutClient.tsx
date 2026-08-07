'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutUsuario, getSesionActual } from '@/app/actions/auth';

export interface AdminLayoutClientProps {
  children: React.ReactNode;
  user: {
    usuario: string;
    permisos?: string[];
    modulos?: string[];
    equipo?: {
      nombre: string;
      apellido: string | null;
      email: string | null;
    } | null;
  };
}

export default function AdminLayoutClient({ children, user }: AdminLayoutClientProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  });

  const toggleTheme = (event: React.MouseEvent<HTMLButtonElement>) => {
    const isDarkBefore = document.documentElement.classList.contains('dark');

    const changeTheme = () => {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      setTheme(isDark ? 'dark' : 'light');
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
    // 30 minutos en milisegundos (30 * 60 * 1000)
    // CAMBIA ESTE VALOR PARA TUS PRUEBAS:
    // const TIEMPO_INACTIVIDAD = 10 * 1000; (10 segundos)
    // const TIEMPO_INACTIVIDAD = 60 * 1000; (1 minuto)
    // const TIEMPO_INACTIVIDAD = 30 * 60 * 1000; (30 minutos)
    const TIEMPO_INACTIVIDAD = 30 * 60 * 1000;

    let timeoutId: number;
    let ultimoPingEnviado = 0;
    const PING_INTERVAL = Math.min(60 * 1000, TIEMPO_INACTIVIDAD / 2);

    const reiniciarTemporizador = () => {
      console.log('Actividad detectada. Reiniciando temporizador...');
      window.clearTimeout(timeoutId);

      timeoutId = window.setTimeout(async () => {
        console.log('Temporizador de inactividad alcanzado (0). Cerrando sesión...');
        await logoutUsuario();
      }, TIEMPO_INACTIVIDAD);

      // Sincronizar actividad con la base de datos (Supabase)
      const ahora = Date.now();
      if (ahora - ultimoPingEnviado > PING_INTERVAL) {
        ultimoPingEnviado = ahora;
        console.log('Sincronizando ultimo_ping con la base de datos...');
        getSesionActual().catch(console.error);
      }
    };

    // Eventos para detectar actividad del usuario
    const eventos = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

    // Iniciar temporizador al cargar
    reiniciarTemporizador();

    // Registrar detectores de eventos
    eventos.forEach((evento) => {
      window.addEventListener(evento, reiniciarTemporizador);
    });

    // Limpieza al desmontar
    return () => {
      window.clearTimeout(timeoutId);
      eventos.forEach((evento) => {
        window.removeEventListener(evento, reiniciarTemporizador);
      });
    };
  }, []);

  const navigation = [
    { name: 'Dashboard', href: '/admin', modulo: 'Dashboard' },
    { name: 'Equipo y Usuarios', href: '/admin/equipo', modulo: 'EquipoUsuarios' },
    { name: 'Roles y Permisos', href: '/admin/roles', modulo: 'RolesPermisos' },
    { name: 'Logs de Seguridad', href: '/admin/logs', modulo: 'LogsSeguridad' },
  ].filter(item => {
    // El usuario con username 'admin' ve todo.
    if (user.usuario === 'admin') return true;
    // Si tiene el rol 'Administrador' (veamos si está en permisos o modulos), ve todo.
    // O si sus módulos asignados en base de datos incluyen este módulo.
    return user.modulos?.includes(item.modulo) ?? false;
  });

  const userInitials = user.equipo
    ? `${user.equipo.nombre.charAt(0)}${user.equipo.apellido?.charAt(0) || ''}`
    : user.usuario.substring(0, 2).toUpperCase();

  const userFullName = user.equipo
    ? `${user.equipo.nombre} ${user.equipo.apellido || ''}`
    : user.usuario;

  const userEmail = user.equipo?.email || `${user.usuario}@sistema.local`;

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950/20 flex">
      {/* Sidebar - Desktop */}
      <div className="hidden md:flex w-64 flex-col fixed inset-y-0 z-50 bg-white dark:bg-zinc-950 border-r border-zinc-200/60 dark:border-zinc-900">
        <div className="flex h-16 shrink-0 items-center px-6 border-b border-zinc-200/40 dark:border-zinc-900">
          <Link href="/admin" className="flex items-center gap-2.5">
            <span className="h-6 w-6 rounded-md bg-zinc-900 dark:bg-white flex items-center justify-center text-xs font-black text-white dark:text-zinc-950">G</span>
            <span className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">GestionWeb</span>
          </Link>
        </div>
        <div className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
          <nav className="flex-1 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(`${item.href}`));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-3.5 py-2.5 text-xs font-medium rounded-lg transition-colors ${isActive
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100/60 dark:hover:bg-zinc-900/50 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="p-4 border-t border-zinc-200/60 dark:border-zinc-900">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="h-8 w-8 rounded-full bg-zinc-900 dark:bg-white flex items-center justify-center text-xs font-semibold text-white dark:text-zinc-950 uppercase">
              {userInitials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-zinc-900 dark:text-white truncate">{userFullName}</span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">{userEmail}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col md:pl-64 h-screen">
        {/* Header - Mobile & Desktop */}
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-zinc-200/60 bg-white dark:bg-zinc-950 dark:border-zinc-900 px-4 shadow-2xs sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-zinc-500 md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <span className="sr-only">Open sidebar</span>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 justify-end items-center">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
              aria-label="Toggle dark mode"
              title="Cambiar tema"
            >
              {theme === 'dark' ? (
                <svg className="w-4 h-4 text-amber-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707m12.728 12.728A9 9 0 115.636 5.636a9 9 0 0112.728 12.728z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-zinc-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            <button
              onClick={() => logoutUsuario()}
              className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </header>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="relative z-50 md:hidden">
            <div className="fixed inset-0 bg-zinc-950/40 dark:bg-zinc-950/80 transition-opacity" onClick={() => setIsMobileMenuOpen(false)}></div>
            <div className="fixed inset-0 flex flex-row">
              <div className="relative flex w-full max-w-xs flex-col bg-white dark:bg-zinc-950 pt-5 pb-4 border-r border-zinc-200 dark:border-zinc-900">
                <div className="flex h-16 shrink-0 items-center px-6 border-b border-zinc-200/40 dark:border-zinc-900">
                  <Link href="/admin" className="flex items-center gap-2.5" onClick={() => setIsMobileMenuOpen(false)}>
                    <span className="h-6 w-6 rounded-md bg-zinc-900 dark:bg-white flex items-center justify-center text-xs font-black text-white dark:text-zinc-950">G</span>
                    <span className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">GestionWeb</span>
                  </Link>
                </div>
                <nav className="mt-5 space-y-1 px-3 flex-1">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`group flex items-center px-3.5 py-2.5 text-xs font-medium rounded-lg ${pathname === item.href
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                        : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100/60 dark:hover:bg-zinc-900/50 hover:text-zinc-900 dark:hover:text-white'
                        }`}
                    >
                      {item.name}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto bg-zinc-50/30 dark:bg-zinc-950/10">
          <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

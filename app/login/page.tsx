'use client';

import React, { useActionState, useState } from 'react';
import { loginUsuario } from '../actions/auth';
import Link from 'next/link';
import ThemeToggle from '@/components/theme/ThemeToggle';
import { Dumbbell, Eye, EyeOff, Lock, User, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginUsuario, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div suppressHydrationWarning className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-center items-center p-6 relative overflow-hidden transition-colors duration-200">
      
      {/* Top bar controls */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-20 max-w-5xl mx-auto">
        <Link
          href="/"
          className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al inicio</span>
        </Link>
        <ThemeToggle />
      </div>

      <div className="w-full max-w-[400px] space-y-6 relative z-10">
        {/* Header / Brand */}
        <div className="flex flex-col items-center text-center space-y-2">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Dumbbell className="w-4 h-4" />
            </div>
            <span className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">GestionWeb</span>
          </Link>
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Acceso a Colaboradores</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs leading-relaxed">
              Consola administrativa para personal del gimnasio y recepción.
            </p>
          </div>
        </div>

        {/* Card Form */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 sm:p-7 rounded-3xl shadow-xs transition-colors duration-200">
          
          {state?.error && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 leading-relaxed">
              {state.error}
            </div>
          )}

          <form className="space-y-4" action={formAction}>
            <div className="space-y-1">
              <label htmlFor="usuario" className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                Nombre de Usuario
              </label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
                <input
                  id="usuario"
                  name="usuario"
                  type="text"
                  autoComplete="username"
                  required
                  className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs rounded-xl focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 block w-full pl-9 pr-3 py-2.5 placeholder:text-zinc-400 transition-all"
                  placeholder="ej. admin"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                Contraseña
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs rounded-xl focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 block w-full pl-9 pr-10 py-2.5 placeholder:text-zinc-400 transition-all font-mono"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="w-full flex justify-center py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer items-center"
              >
                {isPending ? 'Verificando...' : 'Iniciar Sesión'}
              </button>
            </div>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-[11px] text-zinc-500 text-center leading-relaxed max-w-xs mx-auto">
          Acceso reservado para administradores y entrenadores del gimnasio.
        </p>
      </div>
    </div>
  );
}

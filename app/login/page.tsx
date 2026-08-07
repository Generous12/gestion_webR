'use client';

import React, { useActionState, useState } from 'react';
import { loginUsuario } from '../actions/auth';
import Link from 'next/link';

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginUsuario, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-center items-center p-6 relative overflow-hidden transition-colors duration-300">
      {/* Decorative clean line overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-5 dark:opacity-[0.02] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      <div className="w-full max-w-[420px] space-y-8 relative z-10">
        {/* Header / Brand */}
        <div className="flex flex-col items-center text-center space-y-3">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="h-7 w-7 rounded-lg bg-zinc-900 dark:bg-white flex items-center justify-center text-xs font-black text-white dark:text-zinc-950">G</span>
            <span className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">GestionWeb</span>
          </Link>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Iniciar Sesión</h2>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-xs leading-relaxed">
              Ingresa tus credenciales autorizadas para acceder a la consola.
            </p>
          </div>
        </div>

        {/* Card Form */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 p-8 rounded-2xl shadow-xs transition-colors duration-300">
          
          {state?.error && (
            <div className="mb-6 p-4 bg-red-500/5 dark:bg-red-500/10 border border-red-500/15 rounded-xl text-[11px] font-medium text-red-600 dark:text-red-400 leading-relaxed">
              {state.error}
            </div>
          )}

          <form className="space-y-5" action={formAction}>
            <div>
              <label htmlFor="usuario" className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                Nombre de Usuario
              </label>
              <input
                id="usuario"
                name="usuario"
                type="text"
                autoComplete="username"
                required
                className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 focus:border-zinc-900 dark:focus:border-white block w-full px-3 py-2.5 shadow-2xs placeholder:text-zinc-400 transition-all h-[42px]"
                placeholder="ej. braulio"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 focus:border-zinc-900 dark:focus:border-white block w-full pl-3 pr-10 py-2.5 shadow-2xs placeholder:text-zinc-400 transition-all h-[42px]"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-350 cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.822 7.822L21 21m-2.228-2.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center select-none">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-3.5 w-3.5 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:ring-zinc-900/10 rounded cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-zinc-500 dark:text-zinc-400 cursor-pointer font-medium">
                  Recordarme
                </label>
              </div>

              <div>
                <a href="#" className="font-semibold text-zinc-900 dark:text-white hover:underline">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isPending}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-xs text-xs font-semibold text-white dark:text-zinc-950 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer h-[42px] items-center"
              >
                {isPending ? 'Validando accesos...' : 'Acceder al Dashboard'}
              </button>
            </div>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 text-center leading-relaxed max-w-xs mx-auto">
          ¿Primera vez ingresando? Utiliza la contraseña de administrador asignada durante el registro inicial en base de datos.
        </p>
      </div>
    </div>
  );
}

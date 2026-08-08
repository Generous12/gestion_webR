'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type DialogType = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: DialogType;
}

export interface AlertOptions {
  title?: string;
  message: string;
  type?: DialogType;
  buttonText?: string;
}

export interface ToastItem {
  id: string;
  title?: string;
  message: string;
  type: DialogType;
  duration?: number;
}

interface ModalAlertContextValue {
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
  showAlert: (options: string | AlertOptions) => Promise<void>;
  showToast: (message: string, type?: DialogType, title?: string) => void;
}

const ModalAlertContext = createContext<ModalAlertContextValue | null>(null);

export function ModalAlertProvider({ children }: { children: ReactNode }) {
  // Confirm state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  // Alert Modal state
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    options: AlertOptions;
    resolve: () => void;
  } | null>(null);

  // Toast notifications state
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Function to trigger a confirmation dialog (replaces window.confirm)
  const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({
        isOpen: true,
        options: {
          title: options.title || '¿Estás seguro?',
          message: options.message,
          confirmText: options.confirmText || 'Aceptar',
          cancelText: options.cancelText || 'Cancelar',
          type: options.type || 'warning'
        },
        resolve
      });
    });
  }, []);

  // Function to trigger an alert dialog (replaces window.alert)
  const showAlert = useCallback((options: string | AlertOptions): Promise<void> => {
    const opts: AlertOptions =
      typeof options === 'string'
        ? { message: options, title: 'Atención', type: 'info', buttonText: 'Entendido' }
        : {
            title: options.title || 'Atención',
            message: options.message,
            type: options.type || 'info',
            buttonText: options.buttonText || 'Entendido'
          };

    return new Promise<void>((resolve) => {
      setAlertState({
        isOpen: true,
        options: opts,
        resolve
      });
    });
  }, []);

  // Function to trigger non-blocking toast notification
  const showToast = useCallback((message: string, type: DialogType = 'info', title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastItem = { id, message, type, title, duration: 4000 };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, newToast.duration);
  }, []);

  // Bridge para interceptar llamadas nativas en todo el navegador
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const originalAlert = window.alert;

    // Sobrescritura global transparente de alert()
    window.alert = (message?: unknown) => {
      showAlert({
        title: 'Notificación del Sistema',
        message: String(message ?? ''),
        type: 'info'
      });
    };

    return () => {
      window.alert = originalAlert;
    };
  }, [showAlert]);

  const handleConfirmClose = (result: boolean) => {
    if (confirmState) {
      confirmState.resolve(result);
      setConfirmState(null);
    }
  };

  const handleAlertClose = () => {
    if (alertState) {
      alertState.resolve();
      setAlertState(null);
    }
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ModalAlertContext.Provider value={{ showConfirm, showAlert, showToast }}>
      {children}

      {/* ========================================================================= */}
      {/* MODAL DE CONFIRMACIÓN MINIMALISTA (Reemplazo de window.confirm)             */}
      {/* ========================================================================= */}
      {confirmState?.isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          {/* Backdrop con desenfoque elegante */}
          <div
            className="fixed inset-0 bg-zinc-950/60 dark:bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
            onClick={() => handleConfirmClose(false)}
          />

          {/* Tarjeta Modal */}
          <div className="relative w-full max-w-md transform overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 p-6 md:p-7 shadow-2xl border border-zinc-200/80 dark:border-zinc-800 transition-all animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              {/* Icono de Estado Minimalista */}
              <div
                className={`p-3 rounded-2xl shrink-0 ${
                  confirmState.options.type === 'danger'
                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50'
                    : confirmState.options.type === 'warning'
                    ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50'
                    : confirmState.options.type === 'success'
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50'
                    : 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50'
                }`}
              >
                {confirmState.options.type === 'danger' ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                ) : confirmState.options.type === 'warning' ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>

              <div className="space-y-1.5 flex-1">
                <h3 className="text-base font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                  {confirmState.options.title}
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                  {confirmState.options.message}
                </p>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => handleConfirmClose(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-750"
              >
                {confirmState.options.cancelText}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmClose(true)}
                className={`px-5 py-2.5 rounded-xl text-xs font-black text-white transition-all shadow-md cursor-pointer ${
                  confirmState.options.type === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                    : confirmState.options.type === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                    : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100'
                }`}
              >
                {confirmState.options.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE ALERTA MINIMALISTA (Reemplazo de window.alert)                    */}
      {/* ========================================================================= */}
      {alertState?.isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-zinc-950/60 dark:bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
            onClick={handleAlertClose}
          />

          <div className="relative w-full max-w-md transform overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 p-6 md:p-7 shadow-2xl border border-zinc-200/80 dark:border-zinc-800 transition-all animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div
                className={`p-3 rounded-2xl shrink-0 ${
                  alertState.options.type === 'danger'
                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50'
                    : alertState.options.type === 'warning'
                    ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50'
                    : alertState.options.type === 'success'
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50'
                    : 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50'
                }`}
              >
                {alertState.options.type === 'danger' ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : alertState.options.type === 'warning' ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : alertState.options.type === 'success' ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>

              <div className="space-y-1.5 flex-1">
                <h3 className="text-base font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                  {alertState.options.title}
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                  {alertState.options.message}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleAlertClose}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-black text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 transition-all shadow-md cursor-pointer"
              >
                {alertState.options.buttonText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOASTS FLOTANTES MINIMALISTAS (Notificaciones rápidas)                    */}
      {/* ========================================================================= */}
      {toasts.length > 0 && (
        <div className="fixed bottom-5 right-5 z-[99999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="pointer-events-auto flex items-start gap-3 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xl transition-all animate-in slide-in-from-bottom-5 duration-200"
            >
              <span className="text-base shrink-0">
                {t.type === 'success' ? '🟢' : t.type === 'danger' ? '🔴' : t.type === 'warning' ? '🟡' : '🔵'}
              </span>
              <div className="flex-1 min-w-0">
                {t.title && (
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{t.title}</h4>
                )}
                <p className="text-[11px] text-zinc-600 dark:text-zinc-300 font-medium leading-snug mt-0.5">
                  {t.message}
                </p>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-xs font-bold p-0.5 cursor-pointer"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </ModalAlertContext.Provider>
  );
}

export function useModalAlert() {
  const context = useContext(ModalAlertContext);
  if (!context) {
    throw new Error('useModalAlert must be used within a ModalAlertProvider');
  }
  return context;
}

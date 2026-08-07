'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface LogsFilterFormProps {
  initialQ: string;
  initialDate: string;
}

export default function LogsFilterForm({ initialQ, initialDate }: LogsFilterFormProps) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [date, setDate] = useState(initialDate);

  const [prevInitialQ, setPrevInitialQ] = useState(initialQ);
  const [prevInitialDate, setPrevInitialDate] = useState(initialDate);

  // Sync state with search params changes (e.g. when clearing) during render
  if (initialQ !== prevInitialQ || initialDate !== prevInitialDate) {
    setPrevInitialQ(initialQ);
    setPrevInitialDate(initialDate);
    setQ(initialQ);
    setDate(initialDate);
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Evitar buscar si ambos campos están vacíos
    if (!q.trim() && !date) {
      return;
    }

    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (date) params.set('date', date);

    router.push(`/admin/logs?${params.toString()}`);
  };

  const isSearchDisabled = !q.trim() && !date;

  return (
    <form onSubmit={handleSubmit} className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 items-stretch md:items-end">
      <div className="flex-1">
        <label htmlFor="q" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Buscar por acción o detalle</label>
        <input 
          type="text" 
          name="q"
          id="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ej. LOGIN_EXITOSO..." 
          className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:outline-none focus:ring-2 focus:ring-brand-soft focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body h-[42px] w-full"
        />
      </div>
      <div className="min-w-[180px]">
        <label htmlFor="date" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Filtrar por Fecha</label>
        <input 
          type="date" 
          name="date"
          id="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:outline-none focus:ring-2 focus:ring-brand-soft focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body h-[42px] w-full"
        />
      </div>
      <div className="flex gap-2 min-w-[200px]">
        <button 
          type="submit"
          disabled={isSearchDisabled}
          className="text-white bg-brand box-border border border-transparent hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none cursor-pointer text-center h-[42px] flex items-center justify-center flex-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Buscar
        </button>
        {(initialQ || initialDate) && (
          <Link 
            href="/admin/logs"
            onClick={() => {
              setQ('');
              setDate('');
            }}
            className="text-heading bg-white box-border border border-default-medium hover:bg-slate-50 focus:ring-4 focus:ring-slate-100 shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none cursor-pointer text-center h-[42px] flex items-center justify-center flex-1 transition-colors border-slate-200"
          >
            Limpiar
          </Link>
        )}
      </div>
    </form>
  );
}

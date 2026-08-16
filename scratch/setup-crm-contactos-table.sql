-- =========================================================================
-- SCRIPT SQL: CREACIÓN DE TABLA DE CONTACTOS WEB / LEADS CRM
-- Ejecutar en el SQL Editor de tu proyecto en Supabase Dashboard
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.contactos_web (
    id_contacto BIGSERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    dni TEXT NOT NULL,
    celular TEXT NOT NULL,
    email TEXT NOT NULL,
    motivo TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'NUEVO' CHECK (estado IN ('NUEVO', 'CONTACTADO', 'CONVERTIDO', 'DESCARTADO')),
    notas_admin TEXT,
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.contactos_web ENABLE ROW LEVEL SECURITY;

-- Política 1: Permitir inserciones públicas desde el formulario de la landing
DROP POLICY IF EXISTS "Permitir insercion publica de contactos web" ON public.contactos_web;
CREATE POLICY "Permitir insercion publica de contactos web" 
ON public.contactos_web FOR INSERT 
WITH CHECK (true);

-- Política 2: Permitir lectura y gestión a usuarios autorizados
DROP POLICY IF EXISTS "Permitir lectura y modificacion a personal autorizado" ON public.contactos_web;
CREATE POLICY "Permitir lectura y modificacion a personal autorizado" 
ON public.contactos_web FOR ALL 
USING (true);

-- =========================================================================
-- GUÍA DE SEGURIDAD Y BLINDAJE RLS PARA SUPABASE (GESTION_WEB)
-- =========================================================================
-- Instrucciones:
-- 1. Ve a tu panel de Supabase: https://supabase.com/dashboard
-- 2. Entra a tu proyecto -> "SQL Editor" -> "New Query"
-- 3. Pega y ejecuta estas sentencias para proteger todas tus tablas contra accesos no autorizados.
-- =========================================================================

-- 1. HABILITAR ROW LEVEL SECURITY (RLS) EN TODAS LAS TABLAS DEL SISTEMA
ALTER TABLE IF EXISTS public.usuarios_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sesiones_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.equipo ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.permisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.equipo_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.roles_permisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tipos_membresia ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.membresias_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.metodos_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cajas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.movimientos_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categorias_gasto ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.movimientos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ventas_productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.detalle_ventas_productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.logs_seguridad ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.crm_interacciones ENABLE ROW LEVEL SECURITY;

-- 2. BLOQUEO EXPLÍCITO DE CONSULTAS PÚBLICAS (ROL ANON) EN TABLAS SENSIBLES
-- (Evita que cualquier persona con la anon key pública lea contraseñas, pagos o clientes)

-- Denegar acceso público a usuarios y credenciales
DROP POLICY IF EXISTS "Deny public access to usuarios_sistema" ON public.usuarios_sistema;
CREATE POLICY "Deny public access to usuarios_sistema" ON public.usuarios_sistema FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "Deny public access to sesiones_usuario" ON public.sesiones_usuario;
CREATE POLICY "Deny public access to sesiones_usuario" ON public.sesiones_usuario FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "Deny public access to logs_seguridad" ON public.logs_seguridad;
CREATE POLICY "Deny public access to logs_seguridad" ON public.logs_seguridad FOR ALL TO anon USING (false);

-- 3. PERMITIR LECTURA PÚBLICA SOLO EN DATOS NECESARIOS PARA EL PORTAL PÚBLICO / LANDING (PLANES Y PRODUCTOS ACTIVOS)
DROP POLICY IF EXISTS "Permitir ver planes publicos" ON public.tipos_membresia;
CREATE POLICY "Permitir ver planes publicos" ON public.tipos_membresia FOR SELECT TO anon USING (estado = 'ACTIVO');

DROP POLICY IF EXISTS "Permitir ver catalogo publico" ON public.productos;
CREATE POLICY "Permitir ver catalogo publico" ON public.productos FOR SELECT TO anon USING (estado = 'ACTIVO');

-- =========================================================================
-- FIN DEL SCRIPT DE SEGURIDAD SUPABASE
-- =========================================================================

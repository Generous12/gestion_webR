-- =========================================================================
-- SCRIPT SQL: CREACIÓN DE TABLAS DE INVENTARIO Y PRODUCTOS (FASE 3)
-- Ejecutar en el SQL Editor de tu proyecto en Supabase Dashboard
-- =========================================================================

-- 1. Tabla de Catálogo de Productos
CREATE TABLE IF NOT EXISTS public.productos (
    id_producto BIGSERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    precio_compra NUMERIC(10, 2),
    precio_venta NUMERIC(10, 2) NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    imagen_url TEXT,
    codigo_barras TEXT UNIQUE,
    estado TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'INACTIVO')),
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabla de Movimientos y Ajustes de Inventario (Kardex)
CREATE TABLE IF NOT EXISTS public.movimientos_inventario (
    id_mov_inventario BIGSERIAL PRIMARY KEY,
    id_producto BIGINT NOT NULL REFERENCES public.productos(id_producto) ON DELETE CASCADE,
    id_usuario BIGINT REFERENCES public.usuarios_sistema(id_usuario) ON DELETE SET NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('INGRESO', 'EGRESO', 'VENTA', 'AJUSTE')),
    cantidad INTEGER NOT NULL,
    concepto TEXT NOT NULL,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabla de Ventas de Productos (Tienda / Mostrador)
CREATE TABLE IF NOT EXISTS public.ventas_productos (
    id_venta BIGSERIAL PRIMARY KEY,
    id_cliente BIGINT REFERENCES public.clientes(id_cliente) ON DELETE SET NULL,
    id_usuario BIGINT REFERENCES public.usuarios_sistema(id_usuario) ON DELETE SET NULL,
    id_caja BIGINT REFERENCES public.cajas(id_caja) ON DELETE SET NULL,
    total NUMERIC(10, 2) NOT NULL,
    metodo_pago TEXT DEFAULT 'Efectivo',
    id_stripe_intent TEXT,
    estado TEXT NOT NULL DEFAULT 'COMPLETADA' CHECK (estado IN ('COMPLETADA', 'ANULADA')),
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Si la tabla ya existía, añadir las columnas opcionales:
ALTER TABLE public.ventas_productos ADD COLUMN IF NOT EXISTS id_caja BIGINT REFERENCES public.cajas(id_caja) ON DELETE SET NULL;
ALTER TABLE public.ventas_productos ADD COLUMN IF NOT EXISTS metodo_pago TEXT DEFAULT 'Efectivo';
ALTER TABLE public.ventas_productos ADD COLUMN IF NOT EXISTS id_stripe_intent TEXT;

-- 4. Tabla de Detalle de Productos por Venta
CREATE TABLE IF NOT EXISTS public.detalle_ventas_productos (
    id_detalle BIGSERIAL PRIMARY KEY,
    id_venta BIGINT NOT NULL REFERENCES public.ventas_productos(id_venta) ON DELETE CASCADE,
    id_producto BIGINT NOT NULL REFERENCES public.productos(id_producto) ON DELETE RESTRICT,
    cantidad INTEGER NOT NULL,
    precio_unitario NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL
);

-- 5. Habilitar RLS en las nuevas tablas
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas_productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_ventas_productos ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de acceso (lectura y escritura para usuarios del sistema)
DROP POLICY IF EXISTS "Permitir todo a usuarios autenticados en productos" ON public.productos;
CREATE POLICY "Permitir todo a usuarios autenticados en productos" ON public.productos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a usuarios autenticados en movimientos_inventario" ON public.movimientos_inventario;
CREATE POLICY "Permitir todo a usuarios autenticados en movimientos_inventario" ON public.movimientos_inventario FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a usuarios autenticados en ventas_productos" ON public.ventas_productos;
CREATE POLICY "Permitir todo a usuarios autenticados en ventas_productos" ON public.ventas_productos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a usuarios autenticados en detalle_ventas_productos" ON public.detalle_ventas_productos;
CREATE POLICY "Permitir todo a usuarios autenticados en detalle_ventas_productos" ON public.detalle_ventas_productos FOR ALL USING (true) WITH CHECK (true);

-- 7. Insertar permiso 'Inventario' y asociar al rol de Administrador
INSERT INTO public.permisos (codigo, descripcion, modulo)
VALUES ('Inventario', 'Módulo de Gestión de Catálogo y Control de Inventario', 'Inventario')
ON CONFLICT (codigo) DO NOTHING;

-- Asociar el permiso a todos los roles de Administrador existentes
INSERT INTO public.roles_permisos (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM public.roles r, public.permisos p
WHERE p.codigo = 'Inventario'
  AND r.nombre IN ('Administrador', 'Super Admin')
ON CONFLICT DO NOTHING;

-- 8. Insertar método de pago 'Stripe' si no existe
INSERT INTO public.metodos_pago (nombre, estado)
VALUES ('Stripe', 'ACTIVO')
ON CONFLICT DO NOTHING;

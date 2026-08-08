import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Parse env
try {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      process.env[key] = value.trim();
    }
  });
} catch (e) {
  console.warn("Could not read .env.local:", e.message);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function setup() {
  console.log("Creando permiso 'Inventario'...");

  // 1. Insertar permiso
  const { data: perm, error: permErr } = await supabase
    .from('permisos')
    .insert([
      { 
        codigo: 'Inventario', 
        descripcion: 'Módulo de Gestión de Catálogo y Control de Inventario', 
        modulo: 'Inventario' 
      }
    ])
    .select()
    .single();

  if (permErr) {
    if (permErr.message.includes('duplicate') || permErr.message.includes('already exists') || permErr.code === '23505') {
      console.log("El permiso 'Inventario' ya existía.");
    } else {
      console.error("Error al crear permiso:", permErr.message);
    }
  } else {
    console.log("Permiso creado:", perm);
  }

  // Obtener ID del permiso 'Inventario'
  const { data: permData } = await supabase
    .from('permisos')
    .select('id_permiso')
    .eq('codigo', 'Inventario')
    .single();

  if (!permData) {
    console.error("No se pudo encontrar el permiso 'Inventario'.");
    return;
  }

  // 2. Asociar al rol de Administrador y Super Admin (si existen)
  const { data: roles } = await supabase
    .from('roles')
    .select('id_rol, nombre')
    .in('nombre', ['Super Admin', 'Administrador', 'admin']);

  if (roles && roles.length > 0) {
    for (const rol of roles) {
      const { error: linkErr } = await supabase
        .from('roles_permisos')
        .insert([
          { id_rol: rol.id_rol, id_permiso: permData.id_permiso }
        ]);

      if (linkErr) {
        console.log(`Asociación con rol "${rol.nombre}" ya existía o falló:`, linkErr.message);
      } else {
        console.log(`Permiso 'Inventario' asociado con éxito al rol "${rol.nombre}".`);
      }
    }
  }

  // 3. Crear el método de pago 'Stripe' si no existe en metodos_pago
  const { data: stripePay, error: stripeErr } = await supabase
    .from('metodos_pago')
    .insert([
      { nombre: 'Stripe', estado: 'ACTIVO' }
    ])
    .select()
    .single();

  if (stripeErr) {
    console.log("El método de pago 'Stripe' ya existía o falló:", stripeErr.message);
  } else {
    console.log("Método de pago 'Stripe' registrado:", stripePay);
  }

  console.log("Proceso completado.");
}

setup();

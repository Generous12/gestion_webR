import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

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

async function ensureHistorialVentasPermiso() {
  const { data: existing } = await supabase.from('permisos').select('*').eq('codigo', 'HistorialVentas').maybeSingle();
  if (!existing) {
    const { data: p, error } = await supabase.from('permisos').insert({
      codigo: 'HistorialVentas',
      descripcion: 'Permite consultar el historial de ventas, auditoría diaria y comprobantes de pago.',
      modulo: 'HistorialVentas'
    }).select().single();
    console.log("Inserted HistorialVentas permiso:", p, error);

    // Auto-assign to Admin (rol 1) and Cajero (rol 3) and Recepcionista (rol 4) if exists
    if (p) {
      await supabase.from('roles_permisos').insert([
        { id_rol: 1, id_permiso: p.id_permiso },
        { id_rol: 3, id_permiso: p.id_permiso },
        { id_rol: 4, id_permiso: p.id_permiso }
      ]);
    }
  } else {
    console.log("HistorialVentas already exists:", existing);
  }
}

ensureHistorialVentasPermiso();

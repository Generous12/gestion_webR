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

async function linkTicket4() {
  // Check if pago already exists for Ticket #4
  const { data: existing } = await supabase.from('pagos').select('*').eq('concepto', 'Venta Tienda Tkt #4').maybeSingle();
  if (!existing) {
    const { data: p, error } = await supabase.from('pagos').insert({
      id_membresia: null,
      id_metodo: 2, // Yape
      id_usuario: 3,
      concepto: 'Venta Tienda Tkt #4',
      monto: 150,
      estado: 'CONFIRMADO',
      fecha_pago: '2026-08-08T16:22:55.428296+00:00'
    }).select().single();
    console.log("Inserted pago for Tkt #4:", p, error);

    // Update movimiento 10
    if (p) {
      await supabase.from('movimientos_caja').update({ id_pago: p.id_pago }).eq('id_movimiento', 10);
    }
  } else {
    console.log("Pago already exists for Tkt #4:", existing);
  }
}

linkTicket4();

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Manually parse .env.local
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

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase URL or Key not found");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("=== PAGO COUNT & STATUS ===");
  const { data: pagos, error: errPagos } = await supabase.from('pagos').select('*');
  if (errPagos) console.error("Error pagos:", errPagos);
  else console.log(pagos.map(p => ({ id: p.id_pago, monto: p.monto, estado: p.estado, concepto: p.concepto })));

  console.log("=== GASTOS COUNT & STATUS ===");
  const { data: gastos, error: errGastos } = await supabase.from('gastos').select('*');
  if (errGastos) console.error("Error gastos:", errGastos);
  else console.log(gastos.map(g => ({ id: g.id_gasto, monto: g.monto_final, estado: g.estado, descripcion: g.descripcion })));

  console.log("=== CAJAS DIARIAS ===");
  const { data: cajas, error: errCajas } = await supabase.from('cajas_diarias').select('*');
  if (errCajas) console.error("Error cajas:", errCajas);
  else console.log(cajas.map(c => ({ id: c.id_caja, fecha_apertura: c.fecha_apertura, fecha_cierre: c.fecha_cierre, ingresos: c.total_ingresos, egresos: c.total_egresos, estado: c.estado })));

  console.log("=== MOVIMIENTOS CAJA ===");
  const { data: movs, error: errMovs } = await supabase.from('movimientos_caja').select('*');
  if (errMovs) console.error("Error movs:", errMovs);
  else console.log(movs.map(m => ({ id: m.id_movimiento, tipo: m.tipo, monto: m.monto, concepto: m.concepto })));
}

check();

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

async function fix() {
  console.log("Searching for incorrect 1200 egreso in movimientos_caja...");
  const { data: movs, error: errFind } = await supabase
    .from('movimientos_caja')
    .select('*')
    .eq('tipo', 'EGRESO')
    .eq('monto', 1200);

  if (errFind) {
    console.error("Error finding movement:", errFind);
    return;
  }

  console.log("Found movements:", movs);

  if (movs && movs.length > 0) {
    for (const m of movs) {
      console.log(`Deleting movimiento_caja ID #${m.id_movimiento} (monto: ${m.monto}, concepto: ${m.concepto})...`);
      const { error: errDel } = await supabase
        .from('movimientos_caja')
        .delete()
        .eq('id_movimiento', m.id_movimiento);

      if (errDel) {
        console.error("Error deleting movement:", errDel);
      } else {
        console.log(`Successfully deleted movimiento #${m.id_movimiento}`);
      }
    }
  } else {
    console.log("No 1200 egreso movements found.");
  }

  // Check active caja state
  const { data: cajaAbierta } = await supabase
    .from('cajas')
    .select('*')
    .eq('estado', 'ABIERTA')
    .maybeSingle();

  if (cajaAbierta) {
    const { data: activeMovs } = await supabase
      .from('movimientos_caja')
      .select('*')
      .eq('id_caja', cajaAbierta.id_caja);

    const ingresos = (activeMovs || []).filter(m => m.tipo === 'INGRESO').reduce((acc, m) => acc + Number(m.monto), 0);
    const egresos = (activeMovs || []).filter(m => m.tipo === 'EGRESO').reduce((acc, m) => acc + Number(m.monto), 0);
    const fondoInicial = Number(cajaAbierta.monto_inicial || 0);
    const totalEsperado = fondoInicial + ingresos - egresos;

    console.log("=== ESTADO ACTUALIZADO DE CAJA ABIERTA ===");
    console.log(`ID Caja: ${cajaAbierta.id_caja}`);
    console.log(`Fondo Inicial: S/ ${fondoInicial.toFixed(2)}`);
    console.log(`(+) Ingresos: S/ ${ingresos.toFixed(2)}`);
    console.log(`(-) Egresos: S/ ${egresos.toFixed(2)}`);
    console.log(`Monto Esperado: S/ ${totalEsperado.toFixed(2)}`);
  }
}

fix();

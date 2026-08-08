import { ReporteContableMensual } from '@/app/actions/contabilidad';
import { ReporteVentaItem } from '@/app/actions/ventas_productos';

/**
 * Escapa y formatea celdas para CSV compatible con Excel
 */
function escaparCSV(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return '""';
  const texto = String(valor).replace(/"/g, '""');
  return `"${texto}"`;
}

/**
 * Descarga en el navegador un archivo de texto/CSV con codificación UTF-8 con BOM
 * asegurando compatibilidad perfecta con Microsoft Excel (Windows/Mac), Google Sheets y LibreOffice.
 */
export function descargarArchivoCSV(contenido: string, nombreArchivo: string) {
  // \uFEFF añade el Byte Order Mark (BOM) UTF-8 para que Excel detecte tildes y caracteres especiales automáticamente
  const blob = new Blob(['\uFEFF' + contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', nombreArchivo);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Genera el CSV del Consolidado General Contable (Ingresos, Gastos, Métodos y Cajas)
 */
export function generarCSVConsolidadoGeneral(reporte: ReporteContableMensual, separador = ';'): string {
  const lineas: string[] = [];

  const sep = separador;
  const fechaHoy = new Date().toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  // 1. ENCABEZADO CORPORATIVO
  lineas.push([escaparCSV('SISTEMA DE GESTIÓN DEPORTIVA - REPORTE CONTABLE MENSUAL')].join(sep));
  lineas.push([escaparCSV('PERÍODO:'), escaparCSV(`${reporte.periodo.nombreMes} ${reporte.periodo.año}`)].join(sep));
  lineas.push([escaparCSV('RANGO DE FECHAS:'), escaparCSV(`${reporte.periodo.fechaInicio} al ${reporte.periodo.fechaFin}`)].join(sep));
  lineas.push([escaparCSV('FECHA DE EMISIÓN:'), escaparCSV(fechaHoy)].join(sep));
  lineas.push('');

  // 2. RESUMEN EJECUTIVO / CARÁTULA
  lineas.push([escaparCSV('=== RESUMEN FINANCIERO Y RESULTADO DEL MES ===')].join(sep));
  lineas.push([escaparCSV('CONCEPTO'), escaparCSV('MONTO TOTAL (S/)')].join(sep));
  lineas.push([escaparCSV('INGRESOS TOTALES (Membresías + Ventas Mostrador)'), escaparCSV(reporte.totales.ingresos.toFixed(2))].join(sep));
  lineas.push([escaparCSV('EGRESOS TOTALES LIQUIDADOS (Gastos Operativos)'), escaparCSV(reporte.totales.egresos.toFixed(2))].join(sep));
  lineas.push([escaparCSV('UTILIDAD OPERATIVA / BALANCE NETO'), escaparCSV(reporte.totales.balanceNeto.toFixed(2))].join(sep));
  lineas.push([escaparCSV('GASTOS PROGRAMADOS PENDIENTES DE PAGO'), escaparCSV(reporte.totales.gastosPendientes.toFixed(2))].join(sep));
  lineas.push([escaparCSV('TOTAL DE TRANSACCIONES REGISTRADAS'), escaparCSV(reporte.totales.totalTransacciones)].join(sep));
  lineas.push('');

  // 3. DESGLOSE POR MÉTODO DE PAGO
  lineas.push([escaparCSV('=== DESGLOSE DE INGRESOS POR MÉTODO DE PAGO ===')].join(sep));
  lineas.push([escaparCSV('MÉTODO DE PAGO'), escaparCSV('MONTO (S/)'), escaparCSV('PARTICIPACIÓN (%)')].join(sep));
  reporte.distribucionMetodosPago.forEach((m) => {
    lineas.push([escaparCSV(m.metodo), escaparCSV(m.total.toFixed(2)), escaparCSV(m.porcentaje.toFixed(1) + '%')].join(sep));
  });
  lineas.push('');

  // 4. DESGLOSE POR CATEGORÍA DE GASTO
  lineas.push([escaparCSV('=== DESGLOSE DE EGRESOS POR CATEGORÍA ===')].join(sep));
  lineas.push([escaparCSV('CATEGORÍA DE GASTO'), escaparCSV('MONTO LIQUIDADO (S/)'), escaparCSV('PARTICIPACIÓN (%)')].join(sep));
  reporte.distribucionCategoriasGasto.forEach((c) => {
    lineas.push([escaparCSV(c.categoria), escaparCSV(c.total.toFixed(2)), escaparCSV(c.porcentaje.toFixed(1) + '%')].join(sep));
  });
  lineas.push('');

  // 5. LIBRO DE INGRESOS DETALLADO
  lineas.push([escaparCSV('=== DETALLE LIBRO DE INGRESOS (Cobros y Ventas) ===')].join(sep));
  lineas.push([
    escaparCSV('Fecha'),
    escaparCSV('Tipo Ingreso'),
    escaparCSV('Cliente / Razón Social'),
    escaparCSV('DNI / RUC'),
    escaparCSV('Concepto'),
    escaparCSV('Método Pago'),
    escaparCSV('N° Operación / Ticket'),
    escaparCSV('Monto (S/)'),
    escaparCSV('Cajero / Responsable')
  ].join(sep));

  if (reporte.ingresos.length === 0) {
    lineas.push([escaparCSV('Sin movimientos de ingreso registrados en este mes')].join(sep));
  } else {
    reporte.ingresos.forEach((ing) => {
      lineas.push([
        escaparCSV(ing.fecha),
        escaparCSV(ing.tipo === 'MEMBRESIA' ? 'Membresía' : ing.tipo === 'VENTA_TIENDA' ? 'Venta Tienda' : 'Otro'),
        escaparCSV(ing.cliente),
        escaparCSV(ing.dni),
        escaparCSV(ing.concepto),
        escaparCSV(ing.metodoPago),
        escaparCSV(ing.numeroOperacion),
        escaparCSV(ing.monto.toFixed(2)),
        escaparCSV(ing.responsable)
      ].join(sep));
    });
  }
  lineas.push('');

  // 6. LIBRO DE GASTOS / EGRESOS DETALLADO
  lineas.push([escaparCSV('=== DETALLE LIBRO DE GASTOS Y EGRESOS ===')].join(sep));
  lineas.push([
    escaparCSV('Fecha Registro/Pago'),
    escaparCSV('Categoría'),
    escaparCSV('Concepto'),
    escaparCSV('Descripción / Detalle'),
    escaparCSV('Estado'),
    escaparCSV('Monto Estimado (S/)'),
    escaparCSV('Monto Pagado / Final (S/)'),
    escaparCSV('Registrado Por')
  ].join(sep));

  if (reporte.egresos.length === 0) {
    lineas.push([escaparCSV('Sin gastos registrados en este mes')].join(sep));
  } else {
    reporte.egresos.forEach((egr) => {
      lineas.push([
        escaparCSV(egr.fecha),
        escaparCSV(egr.categoria),
        escaparCSV(egr.concepto),
        escaparCSV(egr.descripcion || '-'),
        escaparCSV(egr.estado),
        escaparCSV(egr.montoEstimado.toFixed(2)),
        escaparCSV(egr.estado === 'PAGADO' ? egr.montoFinal.toFixed(2) : '-'),
        escaparCSV(egr.responsable)
      ].join(sep));
    });
  }
  lineas.push('');

  // 7. HISTORIAL DE ARQUEOS DE CAJA
  lineas.push([escaparCSV('=== REGISTRO DE ARQUEOS Y CIERRES DE CAJA ===')].join(sep));
  lineas.push([
    escaparCSV('Fecha Caja'),
    escaparCSV('Cajero'),
    escaparCSV('Monto Inicial (S/)'),
    escaparCSV('Monto Final (S/)'),
    escaparCSV('Estado'),
    escaparCSV('Fecha Apertura'),
    escaparCSV('Fecha Cierre')
  ].join(sep));

  if (reporte.cajas.length === 0) {
    lineas.push([escaparCSV('Sin arqueos de caja registrados')].join(sep));
  } else {
    reporte.cajas.forEach((c) => {
      lineas.push([
        escaparCSV(c.fecha),
        escaparCSV(c.usuario),
        escaparCSV(c.montoInicial.toFixed(2)),
        escaparCSV(c.montoFinal !== null ? c.montoFinal.toFixed(2) : 'En Curso'),
        escaparCSV(c.estado),
        escaparCSV(c.fechaApertura),
        escaparCSV(c.fechaCierre || 'Sin Cerrar')
      ].join(sep));
    });
  }

  return lineas.join('\r\n');
}

/**
 * Genera el texto con formato limpio para enviar el reporte resumido por WhatsApp / Correo
 */
export function generarTextoResumenContable(reporte: ReporteContableMensual): string {
  const lineas: string[] = [];
  lineas.push(`📊 *CONSOLIDADO CONTABLE - ${reporte.periodo.nombreMes.toUpperCase()} ${reporte.periodo.año}*`);
  lineas.push(`📅 *Período:* ${reporte.periodo.fechaInicio} al ${reporte.periodo.fechaFin}`);
  lineas.push('----------------------------------------');
  lineas.push(`💰 *Ingresos Totales:* S/ ${reporte.totales.ingresos.toFixed(2)}`);
  lineas.push(`💸 *Egresos Totales:* S/ ${reporte.totales.egresos.toFixed(2)}`);
  lineas.push(`⚖️ *Balance Neto / Utilidad:* S/ ${reporte.totales.balanceNeto.toFixed(2)}`);
  lineas.push(`🕒 *Gastos por Pagar:* S/ ${reporte.totales.gastosPendientes.toFixed(2)}`);
  lineas.push('----------------------------------------');
  
  lineas.push(`💳 *Ingresos por Método de Pago:*`);
  reporte.distribucionMetodosPago.forEach((m) => {
    lineas.push(` • ${m.metodo}: S/ ${m.total.toFixed(2)} (${m.porcentaje.toFixed(0)}%)`);
  });

  if (reporte.distribucionCategoriasGasto.length > 0) {
    lineas.push('');
    lineas.push(`🏷️ *Gastos por Categoría:*`);
    reporte.distribucionCategoriasGasto.forEach((c) => {
      lineas.push(` • ${c.categoria}: S/ ${c.total.toFixed(2)} (${c.porcentaje.toFixed(0)}%)`);
    });
  }

  lineas.push('----------------------------------------');
  lineas.push(`📦 Total Movimientos: ${reporte.totales.totalTransacciones} operaciones registradas.`);
  lineas.push(`_Generado automáticamente desde el Sistema de Gestión Financiera._`);

  return lineas.join('\n');
}

/**
 * Exporta el reporte del día en Historial de Ventas a CSV/Excel
 */
export function generarCSVVentasDia(ventas: ReporteVentaItem[], fechaStr: string, separador = ';'): string {
  const lineas: string[] = [];
  const sep = separador;

  lineas.push([escaparCSV('REPORTE DIARIO DE VENTAS Y COBROS')].join(sep));
  lineas.push([escaparCSV('FECHA:'), escaparCSV(fechaStr)].join(sep));
  lineas.push('');

  const totalDia = ventas.reduce((sum, v) => sum + (v.total || 0), 0);
  lineas.push([escaparCSV('TOTAL RECAUDADO EN EL DÍA (S/):'), escaparCSV(totalDia.toFixed(2))].join(sep));
  lineas.push([escaparCSV('CANTIDAD DE TRANSACCIONES:'), escaparCSV(ventas.length)].join(sep));
  lineas.push('');

  lineas.push([
    escaparCSV('ID Ticket'),
    escaparCSV('Hora / Fecha'),
    escaparCSV('Tipo'),
    escaparCSV('Cliente'),
    escaparCSV('DNI'),
    escaparCSV('Método Pago'),
    escaparCSV('N° Operación'),
    escaparCSV('Total (S/)'),
    escaparCSV('Cajero / Responsable'),
    escaparCSV('Detalle Items')
  ].join(sep));

  if (ventas.length === 0) {
    lineas.push([escaparCSV('Sin ventas ni cobros registrados en esta fecha')].join(sep));
  } else {
    ventas.forEach((v) => {
      const itemsTexto = (v.detalles || []).map((d) => `${d.cantidad}x ${d.nombre} (S/ ${d.subtotal.toFixed(2)})`).join(' | ');
      lineas.push([
        escaparCSV(v.id),
        escaparCSV(v.fecha ? new Date(v.fecha).toLocaleTimeString('es-PE') : '-'),
        escaparCSV(v.tipoVenta === 'MEMBRESIA' ? 'Membresía' : 'Venta Tienda'),
        escaparCSV(v.clienteNombre),
        escaparCSV(v.clienteDni || 'S/D'),
        escaparCSV(v.metodoPago),
        escaparCSV(v.numeroOperacion || '-'),
        escaparCSV(Number(v.total || 0).toFixed(2)),
        escaparCSV(v.usuarioNombre || 'Sistema'),
        escaparCSV(itemsTexto)
      ].join(sep));
    });
  }

  return lineas.join('\r\n');
}


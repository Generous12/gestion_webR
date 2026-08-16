import ExcelJS from 'exceljs';
import { ReporteContableMensual } from '@/app/actions/contabilidad';
import { ReporteVentaItem } from '@/app/actions/ventas_productos';
import { Producto } from '@/app/actions/productos';

// Paleta de Colores Corporativos
const PALETA = {
  headerBg: '1E293B', // Slate 800
  headerText: 'FFFFFF',
  subHeaderBg: '334155', // Slate 700
  accentBlue: '2563EB', // Blue 600
  accentGreen: '16A34A', // Green 600
  accentPurple: '9333EA', // Purple 600
  accentAmber: 'D97706', // Amber 600
  accentRose: 'E11D48', // Rose 600
  zebraLight: 'F8FAFC', // Slate 50
  cardBg: 'F1F5F9', // Slate 100
  borderGray: 'E2E8F0', // Slate 200
  textDark: '0F172A', // Slate 900
  textMuted: '64748B' // Slate 500
};

// Formatos de celda
const FORMATO_MONEDA = '"S/" #,##0.00;[Red]-"S/" #,##0.00;"S/" 0.00';
const FORMATO_PORCENTAJE = '0.0%';
const FORMATO_NUMERO = '#,##0';

/**
 * Descarga en el navegador el libro de Excel generado como .xlsx
 */
export async function descargarWorkbookExcel(workbook: ExcelJS.Workbook, nombreArchivo: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', nombreArchivo.endsWith('.xlsx') ? nombreArchivo : `${nombreArchivo}.xlsx`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Ajusta automáticamente el ancho de las columnas de una hoja basándose en el contenido
 */
function autoAjustarColumnas(worksheet: ExcelJS.Worksheet, minWidth = 12) {
  worksheet.columns.forEach((column) => {
    let maxLength = minWidth;
    if (column.values) {
      column.values.forEach((val) => {
        if (val !== null && val !== undefined) {
          const str = String(val);
          // Ignorar líneas muy largas de encabezados combinados
          if (str.length > maxLength && str.length < 80) {
            maxLength = str.length;
          }
        }
      });
    }
    column.width = Math.min(Math.max(maxLength + 4, minWidth), 60);
  });
}

/**
 * Aplica estilos de encabezado corporativo a una fila
 */
function aplicarEstiloEncabezado(row: ExcelJS.Row, bgArgb = PALETA.headerBg) {
  row.height = 28;
  row.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: bgArgb }
    };
    cell.font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: PALETA.headerText }
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true
    };
    cell.border = {
      top: { style: 'thin', color: { argb: PALETA.borderGray } },
      bottom: { style: 'medium', color: { argb: '0F172A' } },
      left: { style: 'thin', color: { argb: PALETA.borderGray } },
      right: { style: 'thin', color: { argb: PALETA.borderGray } }
    };
  });
}

/**
 * Aplica bordes limpios y alineación vertical a una fila de datos
 */
function aplicarEstiloFilaDatos(row: ExcelJS.Row, isEven = false) {
  row.height = 22;
  row.eachCell((cell) => {
    cell.font = {
      name: 'Calibri',
      size: 10,
      color: { argb: PALETA.textDark }
    };
    cell.alignment = {
      vertical: 'middle'
    };
    if (isEven) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: PALETA.zebraLight }
      };
    }
    cell.border = {
      top: { style: 'thin', color: { argb: PALETA.borderGray } },
      bottom: { style: 'thin', color: { argb: PALETA.borderGray } },
      left: { style: 'thin', color: { argb: PALETA.borderGray } },
      right: { style: 'thin', color: { argb: PALETA.borderGray } }
    };
  });
}

// =========================================================================
// 1. EXPORTADOR DEL CONSOLIDADO GENERAL CONTABLE (FINANZAS - MULTI-HOJA)
// =========================================================================
export async function exportarExcelConsolidadoGeneral(reporte: ReporteContableMensual, nombreArchivo?: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistema de Gestión Gym';
  workbook.created = new Date();

  const fechaHoy = new Date().toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  // -------------------------------------------------------------
  // HOJA 1: RESUMEN EJECUTIVO
  // -------------------------------------------------------------
  const wsResumen = workbook.addWorksheet('Resumen Ejecutivo', {
    views: [{ showGridLines: true }]
  });

  // Título
  wsResumen.mergeCells('B2:G2');
  const titleCell = wsResumen.getCell('B2');
  titleCell.value = 'SISTEMA DE GESTIÓN DEPORTIVA - CONSOLIDADO FINANCIERO MENSUAL';
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: PALETA.headerText } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA.headerBg } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  wsResumen.getRow(2).height = 36;

  // Subtítulos
  wsResumen.getCell('B3').value = 'Período:';
  wsResumen.getCell('B3').font = { bold: true, color: { argb: PALETA.textMuted } };
  wsResumen.getCell('C3').value = `${reporte.periodo.nombreMes} ${reporte.periodo.año}`;
  wsResumen.getCell('C3').font = { bold: true };

  wsResumen.getCell('E3').value = 'Rango Fechas:';
  wsResumen.getCell('E3').font = { bold: true, color: { argb: PALETA.textMuted } };
  wsResumen.getCell('F3').value = `${reporte.periodo.fechaInicio} al ${reporte.periodo.fechaFin}`;
  wsResumen.getCell('F3').font = { bold: true };

  wsResumen.getCell('B4').value = 'Fecha Emisión:';
  wsResumen.getCell('B4').font = { bold: true, color: { argb: PALETA.textMuted } };
  wsResumen.getCell('C4').value = fechaHoy;

  // Tarjetas de Métricas Ejecutivas
  wsResumen.mergeCells('B6:C6');
  wsResumen.getCell('B6').value = 'INGRESOS TOTALES';
  wsResumen.getCell('B6').font = { bold: true, color: { argb: 'FFFFFF' }, size: 10 };
  wsResumen.getCell('B6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA.accentBlue } };
  wsResumen.getCell('B6').alignment = { horizontal: 'center', vertical: 'middle' };

  wsResumen.mergeCells('B7:C7');
  const cellIng = wsResumen.getCell('B7');
  cellIng.value = reporte.totales.ingresos;
  cellIng.numFmt = FORMATO_MONEDA;
  cellIng.font = { bold: true, size: 14, color: { argb: PALETA.textDark } };
  cellIng.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA.cardBg } };
  cellIng.alignment = { horizontal: 'center', vertical: 'middle' };

  wsResumen.mergeCells('D6:E6');
  wsResumen.getCell('D6').value = 'EGRESOS TOTALES LIQUIDADOS';
  wsResumen.getCell('D6').font = { bold: true, color: { argb: 'FFFFFF' }, size: 10 };
  wsResumen.getCell('D6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA.accentRose } };
  wsResumen.getCell('D6').alignment = { horizontal: 'center', vertical: 'middle' };

  wsResumen.mergeCells('D7:E7');
  const cellEgr = wsResumen.getCell('D7');
  cellEgr.value = reporte.totales.egresos;
  cellEgr.numFmt = FORMATO_MONEDA;
  cellEgr.font = { bold: true, size: 14, color: { argb: PALETA.textDark } };
  cellEgr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA.cardBg } };
  cellEgr.alignment = { horizontal: 'center', vertical: 'middle' };

  wsResumen.mergeCells('F6:G6');
  wsResumen.getCell('F6').value = 'UTILIDAD NETA / BALANCE';
  wsResumen.getCell('F6').font = { bold: true, color: { argb: 'FFFFFF' }, size: 10 };
  wsResumen.getCell('F6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA.accentGreen } };
  wsResumen.getCell('F6').alignment = { horizontal: 'center', vertical: 'middle' };

  wsResumen.mergeCells('F7:G7');
  const cellBal = wsResumen.getCell('F7');
  cellBal.value = reporte.totales.balanceNeto;
  cellBal.numFmt = FORMATO_MONEDA;
  cellBal.font = { bold: true, size: 14, color: { argb: reporte.totales.balanceNeto >= 0 ? PALETA.accentGreen : PALETA.accentRose } };
  cellBal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA.cardBg } };
  cellBal.alignment = { horizontal: 'center', vertical: 'middle' };

  // Gastos pendientes y operaciones
  wsResumen.getCell('B9').value = 'Gastos Pendientes por Pagar:';
  wsResumen.getCell('B9').font = { bold: true };
  const cellPend = wsResumen.getCell('C9');
  cellPend.value = reporte.totales.gastosPendientes;
  cellPend.numFmt = FORMATO_MONEDA;
  cellPend.font = { bold: true, color: { argb: PALETA.accentAmber } };

  wsResumen.getCell('E9').value = 'Total de Transacciones:';
  wsResumen.getCell('E9').font = { bold: true };
  const cellTrx = wsResumen.getCell('F9');
  cellTrx.value = reporte.totales.totalTransacciones;
  cellTrx.numFmt = FORMATO_NUMERO;
  cellTrx.font = { bold: true };

  // Tabla 1: Métodos de Pago
  wsResumen.mergeCells('B11:D11');
  const tMetHeader = wsResumen.getCell('B11');
  tMetHeader.value = 'DESGLOSE DE INGRESOS POR MÉTODO DE PAGO';
  tMetHeader.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
  tMetHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA.subHeaderBg } };
  tMetHeader.alignment = { horizontal: 'center', vertical: 'middle' };
  wsResumen.getRow(11).height = 24;

  const rowMetHeaders = wsResumen.getRow(12);
  rowMetHeaders.getCell(2).value = 'Método de Pago';
  rowMetHeaders.getCell(3).value = 'Monto (S/)';
  rowMetHeaders.getCell(4).value = 'Participación';
  rowMetHeaders.height = 22;
  [2, 3, 4].forEach(colIdx => {
    const c = rowMetHeaders.getCell(colIdx);
    c.font = { bold: true, color: { argb: PALETA.headerText } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA.headerBg } };
    c.alignment = { horizontal: colIdx === 2 ? 'left' : 'right', vertical: 'middle' };
    c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });

  let currentRow = 13;
  reporte.distribucionMetodosPago.forEach((m, idx) => {
    const r = wsResumen.getRow(currentRow);
    r.getCell(2).value = m.metodo;
    r.getCell(3).value = m.total;
    r.getCell(3).numFmt = FORMATO_MONEDA;
    r.getCell(4).value = m.porcentaje / 100;
    r.getCell(4).numFmt = FORMATO_PORCENTAJE;
    r.height = 20;

    [2, 3, 4].forEach(colIdx => {
      const c = r.getCell(colIdx);
      c.font = { name: 'Calibri', size: 10 };
      if (idx % 2 === 1) {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA.zebraLight } };
      }
      c.border = { top: { style: 'thin', color: { argb: PALETA.borderGray } }, bottom: { style: 'thin', color: { argb: PALETA.borderGray } }, left: { style: 'thin', color: { argb: PALETA.borderGray } }, right: { style: 'thin', color: { argb: PALETA.borderGray } } };
      c.alignment = { horizontal: colIdx === 2 ? 'left' : 'right', vertical: 'middle' };
    });
    currentRow++;
  });

  // Tabla 2: Categorías de Gasto
  wsResumen.mergeCells('E11:G11');
  const tCatHeader = wsResumen.getCell('E11');
  tCatHeader.value = 'DESGLOSE DE EGRESOS POR CATEGORÍA';
  tCatHeader.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
  tCatHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA.subHeaderBg } };
  tCatHeader.alignment = { horizontal: 'center', vertical: 'middle' };

  const rowCatHeaders = wsResumen.getRow(12);
  rowCatHeaders.getCell(5).value = 'Categoría';
  rowCatHeaders.getCell(6).value = 'Monto (S/)';
  rowCatHeaders.getCell(7).value = 'Participación';
  [5, 6, 7].forEach(colIdx => {
    const c = rowCatHeaders.getCell(colIdx);
    c.font = { bold: true, color: { argb: PALETA.headerText } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA.headerBg } };
    c.alignment = { horizontal: colIdx === 5 ? 'left' : 'right', vertical: 'middle' };
    c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });

  let curCatRow = 13;
  reporte.distribucionCategoriasGasto.forEach((c, idx) => {
    const r = wsResumen.getRow(curCatRow);
    r.getCell(5).value = c.categoria;
    r.getCell(6).value = c.total;
    r.getCell(6).numFmt = FORMATO_MONEDA;
    r.getCell(7).value = c.porcentaje / 100;
    r.getCell(7).numFmt = FORMATO_PORCENTAJE;
    r.height = 20;

    [5, 6, 7].forEach(colIdx => {
      const cell = r.getCell(colIdx);
      cell.font = { name: 'Calibri', size: 10 };
      if (idx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA.zebraLight } };
      }
      cell.border = { top: { style: 'thin', color: { argb: PALETA.borderGray } }, bottom: { style: 'thin', color: { argb: PALETA.borderGray } }, left: { style: 'thin', color: { argb: PALETA.borderGray } }, right: { style: 'thin', color: { argb: PALETA.borderGray } } };
      cell.alignment = { horizontal: colIdx === 5 ? 'left' : 'right', vertical: 'middle' };
    });
    curCatRow++;
  });

  autoAjustarColumnas(wsResumen, 14);
  wsResumen.getColumn(1).width = 4; // Margen izquierdo

  // -------------------------------------------------------------
  // HOJA 2: LIBRO DE INGRESOS DETALLADO
  // -------------------------------------------------------------
  const wsIngresos = workbook.addWorksheet('Libro de Ingresos', {
    views: [{ showGridLines: true }]
  });

  wsIngresos.columns = [
    { header: 'Fecha', key: 'fecha', width: 14 },
    { header: 'Tipo', key: 'tipo', width: 16 },
    { header: 'Cliente / Razón Social', key: 'cliente', width: 28 },
    { header: 'DNI / RUC', key: 'dni', width: 14 },
    { header: 'Concepto / Detalle', key: 'concepto', width: 34 },
    { header: 'Método Pago', key: 'metodoPago', width: 16 },
    { header: 'N° Operación', key: 'numeroOperacion', width: 18 },
    { header: 'Monto (S/)', key: 'monto', width: 16 },
    { header: 'Cajero / Responsable', key: 'responsable', width: 22 }
  ];

  aplicarEstiloEncabezado(wsIngresos.getRow(1));

  reporte.ingresos.forEach((ing, index) => {
    const row = wsIngresos.addRow({
      fecha: ing.fecha,
      tipo: ing.tipo === 'MEMBRESIA' ? 'Membresía' : ing.tipo === 'VENTA_TIENDA' ? 'Venta Tienda' : 'Otro',
      cliente: ing.cliente,
      dni: ing.dni || 'S/D',
      concepto: ing.concepto,
      metodoPago: ing.metodoPago,
      numeroOperacion: ing.numeroOperacion || '-',
      monto: ing.monto,
      responsable: ing.responsable
    });

    aplicarEstiloFilaDatos(row, index % 2 === 1);
    row.getCell(8).numFmt = FORMATO_MONEDA;
    row.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // Fila de Total Ingresos
  if (reporte.ingresos.length > 0) {
    const totalRow = wsIngresos.addRow({
      fecha: '',
      tipo: '',
      cliente: '',
      dni: '',
      concepto: 'TOTAL INGRESOS DEL MES:',
      metodoPago: '',
      numeroOperacion: '',
      monto: reporte.totales.ingresos,
      responsable: ''
    });
    totalRow.height = 26;
    totalRow.eachCell((c) => {
      c.font = { bold: true, size: 11, color: { argb: PALETA.headerText } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA.headerBg } };
      c.border = { top: { style: 'medium' }, bottom: { style: 'double' } };
    });
    totalRow.getCell(8).numFmt = FORMATO_MONEDA;
    totalRow.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
  }

  autoAjustarColumnas(wsIngresos, 12);

  // -------------------------------------------------------------
  // HOJA 3: LIBRO DE GASTOS Y EGRESOS
  // -------------------------------------------------------------
  const wsEgresos = workbook.addWorksheet('Libro de Gastos', {
    views: [{ showGridLines: true }]
  });

  wsEgresos.columns = [
    { header: 'Fecha', key: 'fecha', width: 14 },
    { header: 'Categoría', key: 'categoria', width: 20 },
    { header: 'Concepto', key: 'concepto', width: 30 },
    { header: 'Detalle / Descripción', key: 'descripcion', width: 34 },
    { header: 'Estado', key: 'estado', width: 14 },
    { header: 'Monto Estimado', key: 'montoEstimado', width: 16 },
    { header: 'Monto Pagado (S/)', key: 'montoFinal', width: 18 },
    { header: 'Registrado Por', key: 'responsable', width: 22 }
  ];

  aplicarEstiloEncabezado(wsEgresos.getRow(1));

  reporte.egresos.forEach((egr, index) => {
    const row = wsEgresos.addRow({
      fecha: egr.fecha,
      categoria: egr.categoria,
      concepto: egr.concepto,
      descripcion: egr.descripcion || '-',
      estado: egr.estado,
      montoEstimado: egr.montoEstimado,
      montoFinal: egr.estado === 'PAGADO' ? egr.montoFinal : null,
      responsable: egr.responsable
    });

    aplicarEstiloFilaDatos(row, index % 2 === 1);
    row.getCell(6).numFmt = FORMATO_MONEDA;
    row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(7).numFmt = FORMATO_MONEDA;
    row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Formato de badge para Estado
    const cellEstado = row.getCell(5);
    cellEstado.alignment = { horizontal: 'center', vertical: 'middle' };
    cellEstado.font = { bold: true, size: 9 };
    if (egr.estado === 'PAGADO') {
      cellEstado.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DCFCE7' } }; // Emerald 100
      cellEstado.font = { bold: true, size: 9, color: { argb: '166534' } }; // Emerald 800
    } else {
      cellEstado.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } }; // Amber 100
      cellEstado.font = { bold: true, size: 9, color: { argb: '92400E' } }; // Amber 800
    }
  });

  // Total Egresos
  if (reporte.egresos.length > 0) {
    const totalRowEgr = wsEgresos.addRow({
      fecha: '',
      categoria: '',
      concepto: 'TOTAL EGRESOS LIQUIDADOS:',
      descripcion: '',
      estado: '',
      montoEstimado: null,
      montoFinal: reporte.totales.egresos,
      responsable: ''
    });
    totalRowEgr.height = 26;
    totalRowEgr.eachCell((c) => {
      c.font = { bold: true, size: 11, color: { argb: PALETA.headerText } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA.headerBg } };
      c.border = { top: { style: 'medium' }, bottom: { style: 'double' } };
    });
    totalRowEgr.getCell(7).numFmt = FORMATO_MONEDA;
    totalRowEgr.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
  }

  autoAjustarColumnas(wsEgresos, 12);

  // -------------------------------------------------------------
  // HOJA 4: HISTORIAL DE ARQUEOS DE CAJA
  // -------------------------------------------------------------
  const wsCajas = workbook.addWorksheet('Arqueos de Caja', {
    views: [{ showGridLines: true }]
  });

  wsCajas.columns = [
    { header: 'Fecha Caja', key: 'fecha', width: 14 },
    { header: 'Cajero / Usuario', key: 'usuario', width: 22 },
    { header: 'Monto Inicial (S/)', key: 'montoInicial', width: 18 },
    { header: 'Monto Final (S/)', key: 'montoFinal', width: 18 },
    { header: 'Estado', key: 'estado', width: 14 },
    { header: 'Apertura', key: 'fechaApertura', width: 20 },
    { header: 'Cierre', key: 'fechaCierre', width: 20 }
  ];

  aplicarEstiloEncabezado(wsCajas.getRow(1));

  reporte.cajas.forEach((c, index) => {
    const row = wsCajas.addRow({
      fecha: c.fecha,
      usuario: c.usuario,
      montoInicial: c.montoInicial,
      montoFinal: c.montoFinal !== null ? c.montoFinal : null,
      estado: c.estado,
      fechaApertura: c.fechaApertura,
      fechaCierre: c.fechaCierre || 'En Curso'
    });

    aplicarEstiloFilaDatos(row, index % 2 === 1);
    row.getCell(3).numFmt = FORMATO_MONEDA;
    row.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(4).numFmt = FORMATO_MONEDA;
    row.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
  });

  autoAjustarColumnas(wsCajas, 14);

  // Descargar archivo
  const filename = nombreArchivo || `Reporte_Contable_Gym_${reporte.periodo.año}_${reporte.periodo.mes.toString().padStart(2, '0')}.xlsx`;
  await descargarWorkbookExcel(workbook, filename);
}

// =========================================================================
// 2. EXPORTADOR DEL REPORTE DIARIO DE VENTAS (HISTORIAL DE VENTAS)
// =========================================================================
export async function exportarExcelVentasDia(ventas: ReporteVentaItem[], fechaStr: string, nombreArchivo?: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistema de Gestión Gym';
  workbook.created = new Date();

  const ws = workbook.addWorksheet(`Ventas ${fechaStr}`, {
    views: [{ showGridLines: true }]
  });

  // Título
  ws.mergeCells('A1:J1');
  const title = ws.getCell('A1');
  title.value = `REPORTE DIARIO DE VENTAS Y COBROS - FECHA: ${fechaStr}`;
  title.font = { name: 'Calibri', size: 14, bold: true, color: { argb: PALETA.headerText } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA.headerBg } };
  title.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 32;

  // Resumen KPI Diario
  const totalDia = ventas.reduce((sum, v) => sum + (v.total || 0), 0);
  const totalEfectivo = ventas.filter((v) => v.metodoPago.toLowerCase().includes('efectivo')).reduce((sum, v) => sum + v.total, 0);
  const totalYape = ventas.filter((v) => v.metodoPago.toLowerCase().includes('yape')).reduce((sum, v) => sum + v.total, 0);
  const totalPlin = ventas.filter((v) => v.metodoPago.toLowerCase().includes('plin')).reduce((sum, v) => sum + v.total, 0);
  const totalOtros = ventas.filter((v) => !['efectivo', 'yape', 'plin'].includes(v.metodoPago.toLowerCase())).reduce((sum, v) => sum + v.total, 0);

  ws.getCell('A3').value = 'Total Recaudado:';
  ws.getCell('A3').font = { bold: true };
  const cellTot = ws.getCell('B3');
  cellTot.value = totalDia;
  cellTot.numFmt = FORMATO_MONEDA;
  cellTot.font = { bold: true, color: { argb: PALETA.accentBlue }, size: 12 };

  ws.getCell('D3').value = 'N° Operaciones:';
  ws.getCell('D3').font = { bold: true };
  ws.getCell('E3').value = `${ventas.length} tickets`;
  ws.getCell('E3').font = { bold: true };

  ws.getCell('A4').value = 'Efectivo:';
  ws.getCell('B4').value = totalEfectivo;
  ws.getCell('B4').numFmt = FORMATO_MONEDA;

  ws.getCell('C4').value = 'Yape:';
  ws.getCell('D4').value = totalYape;
  ws.getCell('D4').numFmt = FORMATO_MONEDA;

  ws.getCell('E4').value = 'Plin:';
  ws.getCell('F4').value = totalPlin;
  ws.getCell('F4').numFmt = FORMATO_MONEDA;

  ws.getCell('G4').value = 'Tarjeta/Otros:';
  ws.getCell('H4').value = totalOtros;
  ws.getCell('H4').numFmt = FORMATO_MONEDA;

  [3, 4].forEach(r => { ws.getRow(r).height = 20; });

  // Encabezados de la Tabla
  const headerRowIdx = 6;
  const headerRow = ws.getRow(headerRowIdx);
  const headers = [
    'N° Ticket',
    'Hora',
    'Tipo',
    'Cliente',
    'DNI / Doc',
    'Método Pago',
    'N° Operación',
    'Total (S/)',
    'Cajero / Responsable',
    'Detalle de Productos / Membresía'
  ];

  headers.forEach((h, i) => {
    const c = headerRow.getCell(i + 1);
    c.value = h;
  });

  aplicarEstiloEncabezado(headerRow);

  // Filas de Datos
  let currentRowIdx = 7;
  ventas.forEach((v, index) => {
    const row = ws.getRow(currentRowIdx);
    const hora = v.fecha ? new Date(v.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '-';
    const itemsTexto = (v.detalles || []).map((d) => `${d.cantidad}x ${d.nombre} (S/ ${d.subtotal.toFixed(2)})`).join(' | ');

    row.getCell(1).value = v.id;
    row.getCell(2).value = hora;
    row.getCell(3).value = v.tipoVenta === 'MEMBRESIA' ? 'Membresía' : 'Tienda';
    row.getCell(4).value = v.clienteNombre;
    row.getCell(5).value = v.clienteDni || 'S/D';
    row.getCell(6).value = v.metodoPago;
    row.getCell(7).value = v.numeroOperacion || '-';
    row.getCell(8).value = Number(v.total || 0);
    row.getCell(8).numFmt = FORMATO_MONEDA;
    row.getCell(9).value = v.usuarioNombre || 'Sistema';
    row.getCell(10).value = itemsTexto;

    aplicarEstiloFilaDatos(row, index % 2 === 1);
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };

    currentRowIdx++;
  });

  // Fila de Total General
  if (ventas.length > 0) {
    const totalRow = ws.getRow(currentRowIdx);
    totalRow.getCell(7).value = 'TOTAL RECAUDADO:';
    totalRow.getCell(8).value = totalDia;
    totalRow.getCell(8).numFmt = FORMATO_MONEDA;
    totalRow.height = 26;

    totalRow.eachCell((c) => {
      c.font = { bold: true, size: 11, color: { argb: PALETA.headerText } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA.headerBg } };
      c.border = { top: { style: 'medium' }, bottom: { style: 'double' } };
    });
    totalRow.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
  }

  autoAjustarColumnas(ws, 12);

  const filename = nombreArchivo || `Ventas_Gym_${fechaStr}.xlsx`;
  await descargarWorkbookExcel(workbook, filename);
}

// =========================================================================
// 3. EXPORTADOR DE INVENTARIO Y CATÁLOGO DE PRODUCTOS
// =========================================================================
export async function exportarExcelInventario(productos: Producto[], nombreArchivo?: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistema de Gestión Gym';
  workbook.created = new Date();

  const fechaHoy = new Date().toLocaleDateString('es-PE');
  const ws = workbook.addWorksheet('Catálogo e Inventario', {
    views: [{ showGridLines: true }]
  });

  // Título
  ws.mergeCells('A1:I1');
  const title = ws.getCell('A1');
  title.value = `CATÁLOGO E INVENTARIO DE PRODUCTOS (STOCK) - ${fechaHoy}`;
  title.font = { name: 'Calibri', size: 14, bold: true, color: { argb: PALETA.headerText } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA.headerBg } };
  title.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 32;

  // Métricas de Inventario
  const totalItems = productos.reduce((sum, p) => sum + (p.stock || 0), 0);
  const valorCompra = productos.reduce((sum, p) => sum + ((p.precio_compra || 0) * (p.stock || 0)), 0);
  const valorVenta = productos.reduce((sum, p) => sum + (p.precio_venta * (p.stock || 0)), 0);

  ws.getCell('A3').value = 'Total Unidades en Stock:';
  ws.getCell('A3').font = { bold: true };
  ws.getCell('B3').value = `${totalItems} unidades`;
  ws.getCell('B3').font = { bold: true };

  ws.getCell('D3').value = 'Valorizado Costo (Compra):';
  ws.getCell('D3').font = { bold: true };
  const cellVc = ws.getCell('E3');
  cellVc.value = valorCompra;
  cellVc.numFmt = FORMATO_MONEDA;
  cellVc.font = { bold: true };

  ws.getCell('G3').value = 'Valorizado Retail (Venta):';
  ws.getCell('G3').font = { bold: true };
  const cellVv = ws.getCell('H3');
  cellVv.value = valorVenta;
  cellVv.numFmt = FORMATO_MONEDA;
  cellVv.font = { bold: true, color: { argb: PALETA.accentGreen } };

  ws.getRow(3).height = 22;

  // Encabezados
  const headerRow = ws.getRow(5);
  const headers = [
    'ID',
    'Código Barras',
    'Producto',
    'Existencias',
    'Precio Compra',
    'Precio Venta',
    'Margen Unitario',
    'Valor Total Stock',
    'Estado'
  ];

  headers.forEach((h, i) => {
    headerRow.getCell(i + 1).value = h;
  });
  aplicarEstiloEncabezado(headerRow);

  // Filas
  let rowIdx = 6;
  productos.forEach((p, index) => {
    const row = ws.getRow(rowIdx);
    const margin = p.precio_compra ? p.precio_venta - p.precio_compra : null;
    const valorStock = p.precio_venta * (p.stock || 0);

    row.getCell(1).value = p.id_producto;
    row.getCell(2).value = p.codigo_barras || '-';
    row.getCell(3).value = p.nombre;
    row.getCell(4).value = p.stock;
    row.getCell(5).value = p.precio_compra || null;
    row.getCell(6).value = p.precio_venta;
    row.getCell(7).value = margin;
    row.getCell(8).value = valorStock;
    row.getCell(9).value = p.estado;

    aplicarEstiloFilaDatos(row, index % 2 === 1);
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(4).font = { bold: true };
    row.getCell(5).numFmt = FORMATO_MONEDA;
    row.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(6).numFmt = FORMATO_MONEDA;
    row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(7).numFmt = FORMATO_MONEDA;
    row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(8).numFmt = FORMATO_MONEDA;
    row.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(8).font = { bold: true };

    const cEst = row.getCell(9);
    cEst.alignment = { horizontal: 'center', vertical: 'middle' };
    cEst.font = { bold: true, size: 9 };
    if (p.estado === 'ACTIVO') {
      cEst.font = { color: { argb: '166534' }, bold: true };
      cEst.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DCFCE7' } };
    } else {
      cEst.font = { color: { argb: '991B1B' }, bold: true };
      cEst.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEE2E2' } };
    }

    rowIdx++;
  });

  // Total
  const totalRow = ws.getRow(rowIdx);
  totalRow.getCell(3).value = 'TOTAL VALORIZADO DE INVENTARIO:';
  totalRow.getCell(4).value = totalItems;
  totalRow.getCell(8).value = valorVenta;
  totalRow.getCell(8).numFmt = FORMATO_MONEDA;
  totalRow.height = 26;

  totalRow.eachCell((c) => {
    c.font = { bold: true, size: 11, color: { argb: PALETA.headerText } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA.headerBg } };
    c.border = { top: { style: 'medium' }, bottom: { style: 'double' } };
  });
  totalRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
  totalRow.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };

  autoAjustarColumnas(ws, 12);

  const filename = nombreArchivo || `Inventario_Productos_Gym_${fechaHoy.replace(/\//g, '-')}.xlsx`;
  await descargarWorkbookExcel(workbook, filename);
}

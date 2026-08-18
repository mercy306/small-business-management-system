import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Excel Export ─────────────────────────────────────────────────────────────

export function exportToExcel(
  data: Record<string, any>[],
  filename: string,
  sheetName = 'Report'
) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Auto-size columns
  const cols = Object.keys(data[0] || {}).map((key) => ({
    wch: Math.max(key.length, ...data.map((row) => String(row[key] ?? '').length)) + 2,
  }));
  worksheet['!cols'] = cols;

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

export function exportToPDF(
  title: string,
  subtitle: string,
  columns: { header: string; dataKey: string }[],
  data: Record<string, any>[],
  filename: string,
  summary?: { label: string; value: string }[]
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Header
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(title, 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(subtitle, 14, 28);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);

  // Summary section (if provided)
  let startY = 44;
  if (summary && summary.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Summary', 14, startY);
    startY += 6;

    summary.forEach(({ label, value }) => {
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(label, 14, startY);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(10);
      doc.text(value, 80, startY);
      startY += 7;
    });
    startY += 4;
  }

  // Data table
  autoTable(doc, {
    startY,
    head: [columns.map((c) => c.header)],
    body: data.map((row) => columns.map((c) => row[c.dataKey] ?? '')),
    headStyles: {
      fillColor: [5, 150, 105], // emerald-600
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
    tableWidth: 'auto',
  });

  doc.save(`${filename}.pdf`);
}

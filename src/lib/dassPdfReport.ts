import { jsPDF } from 'jspdf';
import type { DassReportRow } from './dassReports.ts';

const pageWidth = 210;
const pageHeight = 297;
const margin = 16;
const chartHeight = 64;
const chartWidth = pageWidth - margin * 2;
const chartKeys = ['depression', 'anxiety', 'stress'] as const;
const chartColors = {
  depression: '#C66B3D',
  anxiety: '#B06A7A',
  stress: '#606C38',
};
const chartLabels = {
  depression: 'Depression',
  anxiety: 'Anxiety',
  stress: 'Stress',
};

function drawHeader(document: jsPDF, generatedAt: Date) {
  document.setTextColor('#3B3028');
  document.setFont('helvetica', 'bold');
  document.setFontSize(18);
  document.text('DASS-21 Monitoring Report', margin, 20);

  document.setFont('helvetica', 'normal');
  document.setFontSize(9);
  document.setTextColor('#6B5A4D');
  document.text(`Generated ${generatedAt.toISOString().slice(0, 10)}`, margin, 27);

  document.setTextColor('#3B3028');
  const notice = document.splitTextToSize(
    'DASS-21 is a monitoring tool, not a diagnosis. Consult a doctor or qualified mental-health professional if concerns continue.',
    chartWidth,
  );
  document.text(notice, margin, 35);
  return 35 + notice.length * 4 + 7;
}

function drawFooter(document: jsPDF, pageNumber: number) {
  document.setFont('helvetica', 'normal');
  document.setFontSize(8);
  document.setTextColor('#6B5A4D');
  document.text('Sensitive final scores only. Keep this report private.', margin, 282);
  document.text(`Page ${pageNumber}`, pageWidth - margin, 282, { align: 'right' });
}

function drawTableHeader(document: jsPDF, y: number) {
  const columns = [
    { label: 'Date taken', x: 16 },
    { label: 'Depression', x: 62 },
    { label: 'Anxiety', x: 89 },
    { label: 'Stress', x: 112 },
    { label: 'Overall status', x: 134 },
  ];
  document.setFillColor('#E8DCC7');
  document.roundedRect(margin, y - 4, chartWidth, 7, 1, 1, 'F');
  document.setTextColor('#3B3028');
  document.setFont('helvetica', 'bold');
  document.setFontSize(8);
  columns.forEach((column) => document.text(column.label, column.x, y));
  document.setFont('helvetica', 'normal');
  return y + 7;
}

function drawChart(document: jsPDF, rows: readonly DassReportRow[], top: number) {
  const left = margin;
  const bottom = top + chartHeight;
  document.setTextColor('#3B3028');
  document.setFont('helvetica', 'bold');
  document.setFontSize(11);
  document.text('Score trends', left, top - 7);

  document.setDrawColor('#C9B69E');
  document.rect(left, top, chartWidth, chartHeight);
  document.setFont('helvetica', 'normal');
  document.setFontSize(8);
  [0, 14, 28, 42].forEach((score) => {
    const y = bottom - (score / 42) * chartHeight;
    document.setDrawColor('#E8DCC7');
    document.line(left, y, left + chartWidth, y);
    document.setTextColor('#6B5A4D');
    document.text(String(score), left - 3, y + 2, { align: 'right' });
  });

  const pointX = (index: number) =>
    left + (index / Math.max(rows.length - 1, 1)) * chartWidth;
  const pointY = (value: number) => bottom - (value / 42) * chartHeight;

  chartKeys.forEach((key) => {
    document.setDrawColor(chartColors[key]);
    document.setFillColor(chartColors[key]);
    document.setLineWidth(0.7);
    rows.forEach((row, index) => {
      const x = pointX(index);
      const y = pointY(row[key]);
      if (index > 0) {
        const previous = rows[index - 1];
        document.line(pointX(index - 1), pointY(previous[key]), x, y);
      }
      document.circle(x, y, 1.1, 'F');
    });
  });

  const legendY = bottom + 8;
  chartKeys.forEach((key, index) => {
    const x = left + index * 49;
    document.setFillColor(chartColors[key]);
    document.circle(x, legendY - 1, 1.4, 'F');
    document.setTextColor('#3B3028');
    document.text(chartLabels[key], x + 3.5, legendY);
  });
}

export function createDassPdfReport(
  rows: readonly DassReportRow[],
  generatedAt = new Date(),
) {
  const document = new jsPDF({ unit: 'mm', format: 'a4', compress: false });
  let pageNumber = 1;
  let y = drawHeader(document, generatedAt);
  y = drawTableHeader(document, y);

  rows.forEach((row) => {
    if (y > 252) {
      drawFooter(document, pageNumber);
      document.addPage();
      pageNumber += 1;
      y = drawHeader(document, generatedAt);
      y = drawTableHeader(document, y);
    }
    document.setTextColor('#3B3028');
    document.setFont('helvetica', 'normal');
    document.setFontSize(8.5);
    document.text(row.dateTaken, 16, y);
    document.text(String(row.depression), 62, y);
    document.text(String(row.anxiety), 89, y);
    document.text(String(row.stress), 112, y);
    document.text(row.overallStatus, 134, y);
    y += 7;
  });

  if (y > 194) {
    drawFooter(document, pageNumber);
    document.addPage();
    pageNumber += 1;
    y = drawHeader(document, generatedAt);
  }
  drawChart(document, rows, y + 12);
  drawFooter(document, pageNumber);
  return document;
}

export function getDassPdfBlob(
  rows: readonly DassReportRow[],
  generatedAt = new Date(),
) {
  return createDassPdfReport(rows, generatedAt).output('blob');
}

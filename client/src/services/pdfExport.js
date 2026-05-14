import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export const exportShiftReportToPDF = (doc, SHIFT_ROWS) => {
  const dataStr = typeof doc.data === 'string' ? doc.data : JSON.stringify(doc.data);
  const docData = JSON.parse(dataStr);
  const header = docData;
  const selectedMachines = docData.selectedMachines || [];
  const entries = docData.entries || {};

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 10;
  const contentWidth = pageWidth - (margin * 2);

  // --- Helper: Draw Table Header Box ---
  const drawHeaderBox = (yStart) => {
    pdf.setLineWidth(0.5);
    pdf.rect(margin, yStart, contentWidth, 30); // Main box
    
    // Vertical line 1
    pdf.line(margin + (contentWidth * 0.6), yStart, margin + (contentWidth * 0.6), yStart + 30);
    
    // Horizontal lines in right section
    pdf.line(margin + (contentWidth * 0.6), yStart + 10, margin + contentWidth, yStart + 10);
    pdf.line(margin + (contentWidth * 0.6), yStart + 20, margin + contentWidth, yStart + 20);

    // Text in Header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('GOGOI PRIVATE LIMITED', margin + 5, yStart + 8);
    
    pdf.setFontSize(10);
    pdf.text('PACKING SHIFT REPORT (SANKO MACHINE)', margin + 5, yStart + 18);
    
    pdf.setFont('helvetica', 'normal');
    pdf.text('Format No. :', margin + 5, yStart + 26);

    // Right section text
    pdf.setFontSize(8);
    pdf.text('Issue/ Rev. No.', margin + (contentWidth * 0.6) + 2, yStart + 6);
    pdf.text('01/00', margin + (contentWidth * 0.8) + 5, yStart + 6);

    pdf.text('Effective date', margin + (contentWidth * 0.6) + 2, yStart + 16);
    pdf.text('01.12.2025', margin + (contentWidth * 0.8) + 5, yStart + 16);

    pdf.text('Page No.', margin + (contentWidth * 0.6) + 2, yStart + 26);
    pdf.text('1 of 1', margin + (contentWidth * 0.8) + 5, yStart + 26);

    return yStart + 30;
  };

  let currentY = drawHeaderBox(margin);

  // --- Sub-header ---
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.rect(margin, currentY, contentWidth, 15);
  pdf.text(`Date:- ${header.date ? format(new Date(header.date), 'dd.MM.yyyy') : ''}`, margin + 5, currentY + 6);
  pdf.text(`Shift:- ${header.shift || ''}`, margin + (contentWidth * 0.5), currentY + 6);
  pdf.text(`Shift Incharge:- ${header.shiftIncharge || ''}`, margin + 5, currentY + 11);
  pdf.text(`Variety / SKU:- ${header.varietySKU || ''}`, margin + (contentWidth * 0.5), currentY + 11);
  
  currentY += 15;

  // --- Data Table ---
  const tableHeaders = ['Variety', 'UOM', ...selectedMachines, 'Remarks'];
  const tableRows = [];

  SHIFT_ROWS.forEach(row => {
    if (row.section === 'separator') return;
    
    const isManpower = row.section === 'manpower';
    const isMerged = row.section === 'merged';
    const isDynamicBreakdown = row.section === 'breakdown_dynamic';

    if (isDynamicBreakdown) {
      selectedMachines.forEach((m, idx) => {
        const rowData = [
          idx === 0 ? 'Machine Breakdown(Min) with reason' : '',
          m,
          { content: entries[`${row.key}_${m}`] || '', colSpan: selectedMachines.length + 1 }
        ];
        tableRows.push(rowData);
      });
      return;
    }

    const rowData = [row.label, row.uom];
    if (isManpower || isMerged) {
      rowData.push({ content: entries[`${row.key}_common`] || '', colSpan: selectedMachines.length });
    } else {
      selectedMachines.forEach(m => {
        rowData.push(entries[`${row.key}_${m}`] || '');
      });
    }
    rowData.push(entries[`${row.key}_remarks`] || '');
    tableRows.push(rowData);
  });

  autoTable(pdf, {
    startY: currentY,
    head: [tableHeaders],
    body: tableRows,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1, lineWidth: 0.1, lineColor: [0, 0, 0] },
    headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40 },
      1: { halign: 'center', cellWidth: 10 }
    },
    didParseCell: (data) => {
      // Custom styling for merged/common rows
      if (data.column.index > 1 && data.column.index < tableHeaders.length - 1) {
        data.cell.styles.halign = 'center';
      }
    }
  });

  currentY = pdf.lastAutoTable.finalY + 15;

  // --- Signatures ---
  const checkSigY = currentY;
  pdf.setLineWidth(0.3);
  
  // Left: Incharge
  pdf.line(margin + 10, checkSigY + 10, margin + 60, checkSigY + 10);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Signature Shift Incharge', margin + 15, checkSigY + 15);
  
  if (doc.checkedBy) {
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(7);
    pdf.setTextColor(0, 128, 0);
    pdf.text(`Digitally Signed by ${doc.checkedBy.name}`, margin + 10, checkSigY + 5);
    pdf.text(format(new Date(doc.checkedAt), 'dd.MM.yy HH:mm'), margin + 10, checkSigY + 8);
    pdf.setTextColor(0, 0, 0);
  } else {
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(7);
    pdf.setTextColor(150, 150, 150);
    pdf.text('[PENDING CHECKED BY]', margin + 10, checkSigY + 8);
    pdf.setTextColor(0, 0, 0);
  }

  // Right: Manager
  const rightX = pageWidth - margin - 60;
  pdf.line(rightX, checkSigY + 10, pageWidth - margin - 10, checkSigY + 10);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('Signature Production Manager', rightX, checkSigY + 15);

  if (doc.verifiedBy) {
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(7);
    pdf.setTextColor(0, 128, 0);
    pdf.text(`Digitally Verified by ${doc.verifiedBy.name}`, rightX, checkSigY + 5);
    pdf.text(format(new Date(doc.verifiedAt), 'dd.MM.yy HH:mm'), rightX, checkSigY + 8);
    pdf.setTextColor(0, 0, 0);
  } else {
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(7);
    pdf.setTextColor(150, 150, 150);
    pdf.text('[PENDING VERIFIED BY]', rightX, checkSigY + 8);
    pdf.setTextColor(0, 0, 0);
  }

  pdf.save(`Shift_Report_${doc.location}_${header.date}.pdf`);
};

export const exportGSMRecordToPDF = (doc) => {
  const dataStr = typeof doc.data === 'string' ? doc.data : JSON.stringify(doc.data);
  const docData = JSON.parse(dataStr);
  const header = docData;
  const rows = docData.rows || [];

  const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape for many columns
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 10;
  const contentWidth = pageWidth - (margin * 2);

  // --- Header ---
  const drawHeader = (y) => {
    pdf.setLineWidth(0.5);
    pdf.rect(margin, y, contentWidth, 30);
    pdf.line(margin + (contentWidth * 0.7), y, margin + (contentWidth * 0.7), y + 30);
    pdf.line(margin + (contentWidth * 0.7), y + 10, margin + contentWidth, y + 10);
    pdf.line(margin + (contentWidth * 0.7), y + 20, margin + contentWidth, y + 20);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('GOGOI PRIVATE LIMITED', margin + 5, y + 8);
    pdf.setFontSize(10);
    pdf.text('LAMINATE RECORD FOR GSM VERIFICATION', margin + 5, y + 18);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Format No. : 5.Format', margin + 5, y + 26);

    pdf.setFontSize(8);
    pdf.text('Issue/ Rev. No.', margin + (contentWidth * 0.7) + 2, y + 6);
    pdf.text('01/00', margin + (contentWidth * 0.85) + 5, y + 6);
    pdf.text('Effective date', margin + (contentWidth * 0.7) + 2, y + 16);
    pdf.text('01.01.2026', margin + (contentWidth * 0.85) + 5, y + 16);
    pdf.text('Page No.', margin + (contentWidth * 0.7) + 2, y + 26);
    pdf.text('1 of 1', margin + (contentWidth * 0.85) + 5, y + 26);
    return y + 30;
  };

  let currentY = drawHeader(margin);

  // --- Sub-header ---
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.rect(margin, currentY, contentWidth, 10);
  pdf.text(`Date: ${header.date ? format(new Date(header.date), 'dd.MM.yyyy') : ''}`, margin + 5, currentY + 6);
  pdf.text(`Shift: ${header.shift || ''}`, margin + (contentWidth * 0.25), currentY + 6);
  pdf.text(`SKU: ${header.sku || ''}`, margin + (contentWidth * 0.5), currentY + 6);
  pdf.text(`REWINDER NO: ${header.rewinderNo || ''}`, margin + (contentWidth * 0.75), currentY + 6);
  currentY += 10;

  // --- Table ---
  const COLUMNS = [
    { key: 'rollNo', label: 'ROLL NO' },
    { key: 'vendor', label: 'VENDOR' },
    { key: 'declaredNetWt', label: 'NETWT(Kg)' },
    { key: 'vendorDeclaredLength', label: 'LENGTH(m)' },
    { key: 'noOfPouchesVendorData', label: 'POUCHES' },
    { key: 'wtRecordedAtUnit', label: 'WT(Kg) UNIT' },
    { key: 'rollDiameterAtUnit', label: 'DIA(mm)' },
    { key: 'eyemarkCountedAtUnit', label: 'EYEMARK' },
    { key: 'noOfUnprintedPouches', label: 'UNPRINTED' },
    { key: 'operatorSignature', label: 'Operator' },
    { key: 'remarks', label: 'REMARKS' },
  ];

  const tableHeaders = COLUMNS.map(c => c.label);
  const tableRows = rows.map(row => COLUMNS.map(col => row[col.key] || ''));

  autoTable(pdf, {
    startY: currentY,
    head: [tableHeaders],
    body: tableRows,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1, lineWidth: 0.1, lineColor: [0, 0, 0] },
    headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
  });

  currentY = pdf.lastAutoTable.finalY + 15;

  // --- Signatures ---
  pdf.setLineWidth(0.3);
  pdf.line(margin + 10, currentY + 10, margin + 80, currentY + 10);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Signature ( Production Shift Incharge)', margin + 15, currentY + 15);

  if (doc.checkedBy) {
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(7);
    pdf.setTextColor(0, 128, 0);
    pdf.text(`Digitally Signed by ${doc.checkedBy.name}`, margin + 15, currentY + 5);
    pdf.text(format(new Date(doc.checkedAt), 'dd.MM.yy HH:mm'), margin + 15, currentY + 8);
  }

  const rightX = pageWidth - margin - 80;
  pdf.setTextColor(0, 0, 0);
  pdf.line(rightX, currentY + 10, pageWidth - margin - 10, currentY + 10);
  pdf.text('Signature ( Quality Control)', rightX + 5, currentY + 15);

  if (doc.verifiedBy) {
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(7);
    pdf.setTextColor(0, 128, 0);
    pdf.text(`Digitally Verified by ${doc.verifiedBy.name}`, rightX + 5, currentY + 5);
    pdf.text(format(new Date(doc.verifiedAt), 'dd.MM.yy HH:mm'), rightX + 5, currentY + 8);
  }

  pdf.save(`GSM_Record_${doc.location}_${header.date}.pdf`);
};

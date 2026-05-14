import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

export const exportShiftReportToExcel = async (doc, SHIFT_ROWS) => {
  const dataStr = typeof doc.data === 'string' ? doc.data : JSON.stringify(doc.data);
  const docData = JSON.parse(dataStr);
  const header = docData; 
  const selectedMachines = docData.selectedMachines || [];
  const entries = docData.entries || {};
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Shift Report');

  // Set column widths
  worksheet.columns = [
    { width: 45 }, // Variety
    { width: 12 }, // UOM
    ...selectedMachines.map(() => ({ width: 15 })), // Machines
    { width: 25 }, // Remarks
  ];

  const totalCols = 3 + selectedMachines.length;

  // --- Header Section ---
  const applyHeaderStyle = (cell, isBold = true, size = 11) => {
    cell.font = { bold: isBold, size: size };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  };

  // Row 1
  worksheet.mergeCells(1, 1, 1, 3);
  worksheet.getCell(1, 1).value = 'GOGOI PRIVATE LIMITED';
  applyHeaderStyle(worksheet.getCell(1, 1), true, 14);
  worksheet.getCell(1, 4).value = 'Issue/ Rev. No.';
  applyHeaderStyle(worksheet.getCell(1, 4));
  worksheet.getCell(1, 5).value = '01/00';
  applyHeaderStyle(worksheet.getCell(1, 5));
  worksheet.getCell(1, 5).alignment = { horizontal: 'center' };

  // Row 2
  worksheet.mergeCells(2, 1, 2, 3);
  worksheet.getCell(2, 1).value = 'PACKING SHIFT REPORT (SANKO MACHINE)';
  applyHeaderStyle(worksheet.getCell(2, 1), true, 12);
  worksheet.getCell(2, 4).value = 'Effective date';
  applyHeaderStyle(worksheet.getCell(2, 4));
  worksheet.getCell(2, 5).value = '01.12.2025';
  applyHeaderStyle(worksheet.getCell(2, 5));
  worksheet.getCell(2, 5).alignment = { horizontal: 'center' };

  // Row 3
  worksheet.mergeCells(3, 1, 3, 3);
  worksheet.getCell(3, 1).value = 'Format No. :';
  applyHeaderStyle(worksheet.getCell(3, 1));
  worksheet.getCell(3, 4).value = 'Page No.';
  applyHeaderStyle(worksheet.getCell(3, 4));
  worksheet.getCell(3, 5).value = '1 of 1';
  applyHeaderStyle(worksheet.getCell(3, 5));
  worksheet.getCell(3, 5).alignment = { horizontal: 'center' };

  // Sub-header
  const subHeaderStart = 4;
  worksheet.mergeCells(subHeaderStart, 1, subHeaderStart, totalCols);
  worksheet.getCell(subHeaderStart, 1).value = `Date:- ${header.date ? format(new Date(header.date), 'dd.MM.yyyy') : ''}`;
  worksheet.getCell(subHeaderStart, 1).font = { bold: true };
  worksheet.getCell(subHeaderStart, 1).border = { left: { style: 'thin' }, right: { style: 'thin' } };

  worksheet.mergeCells(subHeaderStart + 1, 1, subHeaderStart + 1, totalCols);
  worksheet.getCell(subHeaderStart + 1, 1).value = `Shift:- ${header.shift || ''}      Variety / SKU:- ${header.varietySKU || ''}`;
  worksheet.getCell(subHeaderStart + 1, 1).font = { bold: true };
  worksheet.getCell(subHeaderStart + 1, 1).border = { left: { style: 'thin' }, right: { style: 'thin' } };

  worksheet.mergeCells(subHeaderStart + 2, 1, subHeaderStart + 2, totalCols);
  worksheet.getCell(subHeaderStart + 2, 1).value = `Shift Incharge:- ${header.shiftIncharge || ''}`;
  worksheet.getCell(subHeaderStart + 2, 1).font = { bold: true };
  worksheet.getCell(subHeaderStart + 2, 1).border = { left: { style: 'thin' }, right: { style: 'thin' }, bottom: { style: 'thin' } };

  // --- Main Table ---
  const tableHeaderRow = 7;
  worksheet.getCell(tableHeaderRow, 1).value = 'Varity:-';
  worksheet.getCell(tableHeaderRow, 2).value = 'UOM';
  selectedMachines.forEach((m, i) => {
    worksheet.getCell(tableHeaderRow, 3 + i).value = m;
  });
  worksheet.getCell(tableHeaderRow, 3 + selectedMachines.length).value = 'Remarks';

  for (let c = 1; c <= totalCols; c++) {
    const cell = worksheet.getCell(tableHeaderRow, c);
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  }

  // Data rows
  let currentRow = tableHeaderRow + 1;
  SHIFT_ROWS.forEach((row) => {
    if (row.section === 'separator') return;
    
    const isManpower = row.section === 'manpower';
    const isMerged = row.section === 'merged';
    const isDynamicBreakdown = row.section === 'breakdown_dynamic';
    
    if (isDynamicBreakdown) {
      const bStart = currentRow;
      selectedMachines.forEach((m, i) => {
        worksheet.getCell(currentRow, 2).value = m;
        worksheet.getCell(currentRow, 2).font = { bold: true, color: { argb: 'FF3F51B5' } };
        worksheet.getCell(currentRow, 2).alignment = { horizontal: 'center' };

        worksheet.mergeCells(currentRow, 3, currentRow, 3 + selectedMachines.length);
        const cell = worksheet.getCell(currentRow, 3);
        cell.value = entries[`${row.key}_${m}`] || '';
        cell.alignment = { horizontal: 'left', italic: true };
        
        for (let c = 1; c <= totalCols; c++) {
          worksheet.getCell(currentRow, c).border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        }
        currentRow++;
      });
      
      worksheet.mergeCells(bStart, 1, currentRow - 1, 1);
      const bCell = worksheet.getCell(bStart, 1);
      bCell.value = 'Machine Breakdown(Min) with reason';
      bCell.font = { bold: true };
      bCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      bCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9F9' } };
      return;
    }

    worksheet.getCell(currentRow, 1).value = row.label;
    worksheet.getCell(currentRow, 1).font = { bold: true };
    worksheet.getCell(currentRow, 2).value = row.uom;
    worksheet.getCell(currentRow, 2).font = { bold: true };
    worksheet.getCell(currentRow, 2).alignment = { horizontal: 'center' };

    if (isManpower || isMerged) {
      worksheet.mergeCells(currentRow, 3, currentRow, 3 + selectedMachines.length - 1);
      const cell = worksheet.getCell(currentRow, 3);
      cell.value = entries[`${row.key}_common`] || '';
      cell.alignment = { horizontal: 'center' };
      cell.font = { bold: true, italic: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9F9' } };
    } else {
      selectedMachines.forEach((m, i) => {
        const cell = worksheet.getCell(currentRow, 3 + i);
        cell.value = entries[`${row.key}_${m}`] || '';
        cell.alignment = { horizontal: 'center' };
      });
    }

    worksheet.getCell(currentRow, 3 + selectedMachines.length).value = entries[`${row.key}_remarks`] || '';

    for (let c = 1; c <= totalCols; c++) {
      worksheet.getCell(currentRow, c).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
    
    currentRow++;
  });

  // --- Signature Section ---
  currentRow += 2;
  const sigRow = currentRow;

  worksheet.mergeCells(sigRow, 1, sigRow, 2);
  const checkerSigCell = worksheet.getCell(sigRow, 1);
  if (doc.checkedBy) {
    checkerSigCell.value = `Digitally Signed by ${doc.checkedBy.name}\n${format(new Date(doc.checkedAt), 'dd.MM.yy HH:mm')}`;
    checkerSigCell.font = { italic: true, size: 8, color: { argb: 'FF008000' }, bold: true };
  } else {
    checkerSigCell.value = '[PENDING CHECKED BY]';
    checkerSigCell.font = { italic: true, size: 8, color: { argb: 'FF808080' } };
  }
  checkerSigCell.alignment = { horizontal: 'center', wrapText: true };

  worksheet.mergeCells(sigRow, totalCols - 1, sigRow, totalCols);
  const verifierSigCell = worksheet.getCell(sigRow, totalCols - 1);
  if (doc.verifiedBy) {
    verifierSigCell.value = `Digitally Verified by ${doc.verifiedBy.name}\n${format(new Date(doc.verifiedAt), 'dd.MM.yy HH:mm')}`;
    verifierSigCell.font = { italic: true, size: 8, color: { argb: 'FF008000' }, bold: true };
  } else {
    verifierSigCell.value = '[PENDING VERIFIED BY]';
    verifierSigCell.font = { italic: true, size: 8, color: { argb: 'FF808080' } };
  }
  verifierSigCell.alignment = { horizontal: 'center', wrapText: true };

  currentRow++;
  worksheet.mergeCells(currentRow, 1, currentRow, 2);
  worksheet.getCell(currentRow, 1).border = { bottom: { style: 'medium' } };
  
  worksheet.mergeCells(currentRow, totalCols - 1, currentRow, totalCols);
  worksheet.getCell(currentRow, totalCols - 1).border = { bottom: { style: 'medium' } };
  
  currentRow++;
  worksheet.mergeCells(currentRow, 1, currentRow, 2);
  worksheet.getCell(currentRow, 1).value = 'Signature Shift Incharge';
  worksheet.getCell(currentRow, 1).font = { bold: true };
  worksheet.getCell(currentRow, 1).alignment = { horizontal: 'center' };
  
  worksheet.mergeCells(currentRow, totalCols - 1, currentRow, totalCols);
  worksheet.getCell(currentRow, totalCols - 1).value = 'Signature Production Manager';
  worksheet.getCell(currentRow, totalCols - 1).font = { bold: true };
  worksheet.getCell(currentRow, totalCols - 1).alignment = { horizontal: 'center' };

  // Generate buffer and save
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Shift_Report_${doc.location}_${header.date}.xlsx`);
};

export const exportGSMRecordToExcel = async (doc) => {
  const dataStr = typeof doc.data === 'string' ? doc.data : JSON.stringify(doc.data);
  const docData = JSON.parse(dataStr);
  const header = docData; 
  const rows = docData.rows || [];
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('GSM Record');

  const COLUMNS = [
    { key: 'rollNo', label: 'ROLL NO', width: 12 },
    { key: 'vendor', label: 'VENDOR', width: 25 },
    { key: 'declaredNetWt', label: 'DECLARED NETWT (Kg)', width: 15 },
    { key: 'vendorDeclaredLength', label: 'VENDOR DECLARED LENGTH(m)', width: 15 },
    { key: 'noOfPouchesVendorData', label: 'NO OF POUCHES VENDOR DATA', width: 15 },
    { key: 'wtRecordedAtUnit', label: 'WT RECORDED (Kg) AT UNIT', width: 15 },
    { key: 'rollDiameterAtUnit', label: 'ROLL DIAMETER AT UNIT (mm)', width: 15 },
    { key: 'eyemarkCountedAtUnit', label: 'EYEMARK COUNTED AT UNIT', width: 15 },
    { key: 'noOfUnprintedPouches', label: 'NO OF UNPRINTED POUCHES', width: 15 },
    { key: 'operatorSignature', label: 'Operator signature', width: 20 },
    { key: 'remarks', label: 'REMARKS', width: 25 },
  ];

  worksheet.columns = COLUMNS.map(c => ({ width: c.width }));
  const totalCols = COLUMNS.length;

  const applyHeaderStyle = (cell, isBold = true, size = 11) => {
    cell.font = { bold: isBold, size: size };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  };

  // --- Header ---
  worksheet.mergeCells(1, 1, 1, 8);
  worksheet.getCell(1, 1).value = 'GOGOI PRIVATE LIMITED';
  applyHeaderStyle(worksheet.getCell(1, 1), true, 14);

  worksheet.getCell(1, 9).value = 'Issue/ Rev. No.';
  applyHeaderStyle(worksheet.getCell(1, 9));
  worksheet.mergeCells(1, 10, 1, 11);
  worksheet.getCell(1, 10).value = '01/00';
  applyHeaderStyle(worksheet.getCell(1, 10));

  worksheet.mergeCells(2, 1, 2, 8);
  worksheet.getCell(2, 1).value = 'LAMINATE RECORD FOR GSM VERIFICATION';
  applyHeaderStyle(worksheet.getCell(2, 1), true, 12);

  worksheet.getCell(2, 9).value = 'Effective date';
  applyHeaderStyle(worksheet.getCell(2, 9));
  worksheet.mergeCells(2, 10, 2, 11);
  worksheet.getCell(2, 10).value = '01.01.2026';
  applyHeaderStyle(worksheet.getCell(2, 10));

  worksheet.mergeCells(3, 1, 3, 8);
  worksheet.getCell(3, 1).value = 'Format No. : 5.Format';
  applyHeaderStyle(worksheet.getCell(3, 1));

  worksheet.getCell(3, 9).value = 'Page No.';
  applyHeaderStyle(worksheet.getCell(3, 9));
  worksheet.mergeCells(3, 10, 3, 11);
  worksheet.getCell(3, 10).value = '1 of 1';
  applyHeaderStyle(worksheet.getCell(3, 10));

  // --- Sub-header ---
  const subRow = 4;
  worksheet.mergeCells(subRow, 1, subRow, 2);
  worksheet.getCell(subRow, 1).value = `Date: ${header.date ? format(new Date(header.date), 'dd.MM.yyyy') : ''}`;
  applyHeaderStyle(worksheet.getCell(subRow, 1));

  worksheet.mergeCells(subRow, 3, subRow, 5);
  worksheet.getCell(subRow, 3).value = `Shift: ${header.shift || ''}`;
  applyHeaderStyle(worksheet.getCell(subRow, 3));

  worksheet.mergeCells(subRow, 6, subRow, 8);
  worksheet.getCell(subRow, 6).value = `SKU: ${header.sku || ''}`;
  applyHeaderStyle(worksheet.getCell(subRow, 6));

  worksheet.mergeCells(subRow, 9, subRow, 11);
  worksheet.getCell(subRow, 9).value = `REWINDER NO: ${header.rewinderNo || ''}`;
  applyHeaderStyle(worksheet.getCell(subRow, 9));

  // --- Table Header ---
  const tableHeaderRow = 5;
  COLUMNS.forEach((col, i) => {
    const cell = worksheet.getCell(tableHeaderRow, i + 1);
    cell.value = col.label;
    applyHeaderStyle(cell, true, 9);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
  });

  // --- Data Rows ---
  let currentRow = tableHeaderRow + 1;
  rows.forEach((row, rowIdx) => {
    COLUMNS.forEach((col, colIdx) => {
      const cell = worksheet.getCell(currentRow, colIdx + 1);
      cell.value = row[col.key] || '';
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.font = { size: 9 };
    });
    currentRow++;
  });

  // --- Signatures ---
  currentRow += 2;
  const sigRow = currentRow;
  
  // Signature Labels
  worksheet.mergeCells(sigRow, 1, sigRow, 4);
  worksheet.getCell(sigRow, 1).value = 'Signature ( Production Shift Incharge)';
  applyHeaderStyle(worksheet.getCell(sigRow, 1), true, 10);
  
  worksheet.mergeCells(sigRow, 8, sigRow, 11);
  worksheet.getCell(sigRow, 8).value = 'Signature ( Quality Control)';
  applyHeaderStyle(worksheet.getCell(sigRow, 8), true, 10);

  // Digital Signs
  const digitalRow = sigRow + 1;
  worksheet.mergeCells(digitalRow, 1, digitalRow, 4);
  const creatorCell = worksheet.getCell(digitalRow, 1);
  if (doc.checkedBy) {
    creatorCell.value = `Digitally Signed by ${doc.checkedBy.name}\n${format(new Date(doc.checkedAt), 'dd.MM.yy HH:mm')}`;
    creatorCell.font = { italic: true, size: 8, color: { argb: 'FF008000' }, bold: true };
  } else {
    creatorCell.value = '[PENDING AUTHORIZATION]';
    creatorCell.font = { italic: true, size: 8, color: { argb: 'FF808080' } };
  }
  creatorCell.alignment = { horizontal: 'center', wrapText: true };

  worksheet.mergeCells(digitalRow, 8, digitalRow, 11);
  const verifierCell = worksheet.getCell(digitalRow, 8);
  if (doc.verifiedBy) {
    verifierCell.value = `Digitally Verified by ${doc.verifiedBy.name}\n${format(new Date(doc.verifiedAt), 'dd.MM.yy HH:mm')}`;
    verifierCell.font = { italic: true, size: 8, color: { argb: 'FF008000' }, bold: true };
  } else {
    verifierCell.value = '[PENDING VERIFICATION]';
    verifierCell.font = { italic: true, size: 8, color: { argb: 'FF808080' } };
  }
  verifierCell.alignment = { horizontal: 'center', wrapText: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `GSM_Record_${doc.location}_${header.date}.xlsx`);
};

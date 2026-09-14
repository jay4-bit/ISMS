import type ExcelJSType from 'exceljs';

export interface ExcelColumnDefinition {
  header: string;
  key: string;
  width?: number;
}

/**
 * Downloads an ExcelJS workbook instance directly in the browser via Blob & URL.createObjectURL
 */
export async function downloadWorkbookInBrowser(workbook: ExcelJSType.Workbook, filename: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 300);
}

/**
 * Exports JSON data into a beautifully formatted Excel file and downloads it in the browser.
 */
export async function exportJsonToExcel(options: {
  filename: string;
  sheetName?: string;
  columns?: ExcelColumnDefinition[];
  data: Record<string, any>[];
}): Promise<void> {
  const { filename, sheetName = 'Sheet1', columns, data } = options;
  const ExcelJS = (await import('exceljs')).default || (await import('exceljs'));
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  let finalColumns: ExcelColumnDefinition[] = [];

  if (columns && columns.length > 0) {
    finalColumns = columns;
  } else if (data.length > 0) {
    finalColumns = Object.keys(data[0]).map((key) => ({
      header: key,
      key: key,
      width: Math.max(key.length + 4, 15),
    }));
  }

  worksheet.columns = finalColumns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width || Math.max(col.header.length + 4, 15),
  }));

  // Style the header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' }, // Modern royal blue
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 26;

  // Add data rows if any
  if (data.length > 0) {
    data.forEach((item) => {
      const row = worksheet.addRow(item);
      row.alignment = { vertical: 'middle' };
    });
  }

  await downloadWorkbookInBrowser(workbook, filename);
}

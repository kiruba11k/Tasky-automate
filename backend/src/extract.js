import Papa from 'papaparse';
import readXlsx from 'read-excel-file/node';

/** Parses an uploaded CSV/XLSX buffer into { columns, rows }. */
export async function parseTable(buffer, filename) {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.xlsx')) {
    const rows = await readXlsx(buffer);
    const [header = [], ...body] = rows;
    const columns = header.map((h) => String(h ?? '').trim());
    return {
      columns,
      rows: body.map((r) => Object.fromEntries(columns.map((c, i) => [c, r[i] instanceof Date ? r[i].toISOString().slice(0, 10) : r[i] ?? '']))),
    };
  }
  if (lower.endsWith('.csv') || lower.endsWith('.txt')) {
    const parsed = Papa.parse(buffer.toString('utf8').replace(/^﻿/, ''), { header: true, skipEmptyLines: true });
    return { columns: (parsed.meta.fields || []).map((c) => c.trim()), rows: parsed.data };
  }
  throw new Error('Unsupported file type. Please upload a .csv or .xlsx file.');
}

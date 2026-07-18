function excelEscape(value: string | number | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function estimateColumnWidths(headers: string[], rows: (string | number | undefined)[][]) {
  return headers.map((header, index) => {
    const maxLength = rows.reduce((max, row) => {
      const valueLength = String(row[index] ?? '').replace(/\s+/g, ' ').length;
      return Math.max(max, valueLength);
    }, header.length);
    const clampedChars = Math.max(10, Math.min(36, maxLength + 2));
    return clampedChars * 9;
  });
}

export function downloadStyledExcel({
  title,
  filename,
  headers,
  rows,
  note,
}: {
  title: string;
  filename: string;
  headers: string[];
  rows: (string | number | undefined)[][];
  note?: string;
}) {
  const widths = estimateColumnWidths(headers, rows);
  const colgroup = widths.map(width => `<col style="width:${width}px" />`).join('');
  const head = headers.map(header => `<th>${excelEscape(header)}</th>`).join('');
  const body = rows
    .map(row => `<tr>${row.map(cell => `<td>${excelEscape(cell)}</td>`).join('')}</tr>`)
    .join('');
  const exportedAt = new Date().toLocaleString('zh-CN');

  const html = `\ufeff
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: "PingFang SC", "Microsoft YaHei", Arial, sans-serif; padding: 18px; color: #0f172a; }
        .report-title { font-size: 20px; font-weight: 700; margin: 0 0 6px; color: #0f172a; }
        .report-meta { font-size: 12px; color: #64748b; margin: 0 0 14px; }
        .report-note { font-size: 12px; color: #475569; margin: 0 0 14px; }
        table { border-collapse: collapse; width: auto; min-width: 100%; table-layout: fixed; }
        th, td { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 12px; vertical-align: top; word-break: break-word; }
        th { background: #dbeafe; color: #0f172a; font-weight: 700; text-align: left; }
        tr:nth-child(even) td { background: #f8fafc; }
        tr:hover td { background: #eff6ff; }
      </style>
    </head>
    <body>
      <div class="report-title">${excelEscape(title)}</div>
      <div class="report-meta">导出时间：${excelEscape(exportedAt)}</div>
      ${note ? `<div class="report-note">${excelEscape(note)}</div>` : ''}
      <table>
        <colgroup>${colgroup}</colgroup>
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </body>
  </html>`;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

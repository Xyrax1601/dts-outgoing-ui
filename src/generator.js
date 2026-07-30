// Document Generator & Export/Import Utilities for DTS

/**
 * Builds printable HTML format matching Document Generate.png layout
 * Header: Forwarded Documents — Selected (or All)
 * Table: DTS Tracking No. | From/Office | Document Details | Received By (Box) | To/Office | Date
 */
export function buildPrintableHtml(documents, title = 'Forwarded Documents — Selected', options = {}) {
  const { maxRows = null, layoutMode = 'portrait' } = options;

  let targetDocs = documents;
  let isCapped = false;
  if (maxRows && maxRows > 0 && documents.length > maxRows) {
    targetDocs = documents.slice(0, maxRows);
    isCapped = true;
  }

  const count = targetDocs.length;
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const rowsHtml = targetDocs.map(doc => {
    const formattedDetails = (doc.details || '').replace(/\n/g, '<br>');
    return `
      <tr>
        <td class="col-dts">${escapeHtml(doc.trackingNo || 'NONE')}</td>
        <td class="col-from">${escapeHtml(doc.fromOffice || '')}</td>
        <td class="col-details">${formattedDetails}</td>
        <td class="col-received">
          <div class="signature-box">
            ${doc.receivedBy ? `<div class="receiver-name">${escapeHtml(doc.receivedBy)}</div>` : ''}
            <div class="signature-label">Receiver Signature / Date</div>
          </div>
        </td>
        <td class="col-to">${escapeHtml(doc.toOffice || '')}</td>
        <td class="col-date">${escapeHtml(doc.date || '')}</td>
      </tr>
    `;
  }).join('');

  const estimatedPages = count <= 15 ? 1 : (count <= 32 ? 2 : Math.ceil(count / 16));

  return `
    <div class="print-document-container print-layout-${layoutMode}">
      <div class="print-document-header">
        <div>
          <h2 class="print-document-title">${escapeHtml(title)}</h2>
          ${isCapped ? `<div class="print-cap-notice">⚡ Paper-Saver Active: Showing top ${count} items (strict ${estimatedPages} page limit)</div>` : ''}
        </div>
        <div class="print-document-meta">
          <strong>Total: ${count} Document(s)</strong> | Date: ${dateStr}<br>
          <span class="est-pages-badge">📄 Est. Paper: ${estimatedPages} Page${estimatedPages > 1 ? 's' : ''}</span>
        </div>
      </div>
      <table class="print-table">
        <thead>
          <tr>
            <th class="col-dts">DTS Tracking No.</th>
            <th class="col-from">From/Office</th>
            <th class="col-details">Document Details</th>
            <th class="col-received">Received By</th>
            <th class="col-to">To/Office</th>
            <th class="col-date">Date</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml.length ? rowsHtml : `<tr><td colspan="6" style="text-align:center; padding: 10px;">No documents selected for generation.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Export selected or all documents to CSV file
 */
export function exportToCSV(documents, filename = 'dts_documents.csv') {
  if (!documents || !documents.length) {
    alert('No data available to export.');
    return;
  }

  const headers = ['kind', 'dtsNo', 'fromOffice', 'details', 'receivedBy', 'toOffice', 'date'];
  const csvRows = [headers.join(',')];

  documents.forEach((doc) => {
    const row = [
      escapeCsvField(doc.type || 'forward'),
      escapeCsvField(doc.trackingNo || 'NONE'),
      escapeCsvField(doc.fromOffice || ''),
      escapeCsvField(doc.details || ''),
      escapeCsvField(doc.receivedBy || ''),
      escapeCsvField(doc.toOffice || ''),
      escapeCsvField(doc.date || '')
    ];
    csvRows.push(row.join(','));
  });

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * State-Machine CSV Parser
 * Disregards ID column completely and maps:
 * - DTS Tracking No. <- dtsNo
 * - From/Office <- fromOffice
 * - Document Details <- details
 * - Received By <- receivedBy
 * - To/Office <- toOffice
 * - Date <- date
 * - Kind/Type <- kind
 */
export function parseCSV(csvText) {
  if (!csvText || typeof csvText !== 'string') return [];

  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField);
      if (currentRow.some(cell => cell.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some(cell => cell.trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) return [];

  // Inspect Header Line
  const rawHeaders = rows[0].map(h => h.trim().toLowerCase());
  
  let kindIdx = rawHeaders.findIndex(h => h === 'kind' || h === 'type' || h === 'action');
  let dtsIdx = rawHeaders.findIndex(h => h === 'dtsno' || h === 'dtstrackingno' || h === 'dts tracking no.' || h === 'dts' || h.includes('tracking'));
  let fromIdx = rawHeaders.findIndex(h => h === 'fromoffice' || h === 'from/office' || h === 'from');
  let detailsIdx = rawHeaders.findIndex(h => h === 'details' || h === 'document details' || h === 'detail');
  let receivedIdx = rawHeaders.findIndex(h => h === 'receivedby' || h === 'received by' || h === 'received');
  let toIdx = rawHeaders.findIndex(h => h === 'tooffice' || h === 'to/office' || h === 'to');
  let dateIdx = rawHeaders.findIndex(h => h === 'date');

  // If 8 columns starting with id column, disregard id column (index 0)
  const isEightColWithId = rawHeaders.length >= 8 && rawHeaders[0] === 'id';

  if (isEightColWithId) {
    if (kindIdx === -1) kindIdx = 1;
    if (dtsIdx === -1) dtsIdx = 2;
    if (fromIdx === -1) fromIdx = 3;
    if (detailsIdx === -1) detailsIdx = 4;
    if (receivedIdx === -1) receivedIdx = 5;
    if (toIdx === -1) toIdx = 6;
    if (dateIdx === -1) dateIdx = 7;
  } else {
    // 7 column format fallback (without ID column)
    if (kindIdx === -1) kindIdx = 0;
    if (dtsIdx === -1) dtsIdx = 1;
    if (fromIdx === -1) fromIdx = 2;
    if (detailsIdx === -1) detailsIdx = 3;
    if (receivedIdx === -1) receivedIdx = 4;
    if (toIdx === -1) toIdx = 5;
    if (dateIdx === -1) dateIdx = 6;
  }

  const records = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0) continue;

    const rawDts = dtsIdx !== -1 && row[dtsIdx] !== undefined ? row[dtsIdx] : '';
    const rawFrom = fromIdx !== -1 && row[fromIdx] !== undefined ? row[fromIdx] : '';
    const rawDetails = detailsIdx !== -1 && row[detailsIdx] !== undefined ? row[detailsIdx] : '';
    const rawReceived = receivedIdx !== -1 && row[receivedIdx] !== undefined ? row[receivedIdx] : '';
    const rawTo = toIdx !== -1 && row[toIdx] !== undefined ? row[toIdx] : '';
    const rawDate = dateIdx !== -1 && row[dateIdx] !== undefined ? row[dateIdx] : '';
    const rawKind = kindIdx !== -1 && row[kindIdx] !== undefined ? row[kindIdx] : 'forward';

    const normTracking = (rawDts || '').trim() || 'NONE';

    records.push({
      id: 'dts-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
      trackingNo: normTracking,
      fromOffice: (rawFrom || '').trim(),
      details: (rawDetails || '').trim(),
      receivedBy: (rawReceived || '').trim(),
      toOffice: (rawTo || '').trim(),
      date: (rawDate || '').trim() || new Date().toISOString().split('T')[0],
      type: (rawKind || '').trim().toLowerCase() === 'receive' ? 'receive' : 'forward'
    });
  }

  return records;
}

function escapeCsvField(field) {
  if (field === null || field === undefined) return '""';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

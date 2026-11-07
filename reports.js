// Duty reports as PDF and Excel, made on the device. Nothing is sent anywhere.
const CrewReports = (() => {
  const COLUMNS = [
    ['S.No', (e, i) => i + 1],
    ['Date', (e) => e.dateShown],
    ['CLI', (e) => e.cliName],
    ['Subject', (e) => e.sub],
    ['Motorman', (e) => e.nameOfMotorman],
    ['Grade', (e) => e.grade],
    ['CMS-ID', (e) => e.cmsCode],
    ['VISION', (e) => e.spec],
    ['LCD', (e) => (typeof CrewLib !== 'undefined' ? CrewLib : require('./lib')).lcdShown(e.lcd ?? '')],
    ['Train', (e) => e.trainNo],
    ['Unit', (e) => e.unitNo],
    ['Line', (e) => e.line],
    ['From', (e) => e.fromStn],
    ['Dep', (e) => e.depTime],
    ['To', (e) => e.toStn],
    ['Arr', (e) => e.arrTime],
    ['Shift', (e) => e.dayNight],
    ['KMS', (e) => e.kms],
    ['TM Name', (e) => e.tmgrName],
    ['Deficiency', (e) => e.remarkDeficiency],
    ['Remarks', (e) => e.description],
  ];

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function shownDate(iso) {
    const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[3]}-${MONTHS[+m[2] - 1]}-${m[1]}` : String(iso ?? '');
  }

  /** Entries between two dates, oldest first. A CLI gets their own; an admin may pick one CLI or everyone. */
  function select(entries, { from, to, email, isAdmin, cli }) {
    return entries
      .filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.date) && e.date >= from && e.date <= to)
      .filter((e) => (isAdmin
        ? (!cli || e.userMail.toLowerCase() === cli.toLowerCase())
        : e.userMail.toLowerCase() === String(email).toLowerCase()))
      .sort((a, b) => a.date.localeCompare(b.date) || a.sortKey - b.sortKey);
  }

  function summarise(entries) {
    const subjects = {};
    let kms = 0;
    let deficiencies = 0;
    for (const e of entries) {
      subjects[e.sub || 'No subject'] = (subjects[e.sub || 'No subject'] ?? 0) + 1;
      kms += parseInt(e.kms, 10) || 0;
      if (e.deficiencyFound) deficiencies += 1;
    }
    return { count: entries.length, kms, deficiencies, subjects };
  }

  function table(entries) {
    const decorated = entries.map((e) => ({ ...e, dateShown: shownDate(e.date) }));
    return {
      head: COLUMNS.map(([name]) => name),
      body: decorated.map((e, i) => COLUMNS.map(([, read]) => {
        const value = read(e, i);
        return value === undefined || value === null ? '' : value;
      })),
    };
  }

  // ── Excel: a real .xlsx built by hand. Cells are plain text or numbers, so nothing can run as a formula. ──
  const encoder = new TextEncoder();
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  // A zip with no compression, which every spreadsheet program can read.
  function zip(files) {
    const parts = [];
    const central = [];
    let offset = 0;
    const header = (size) => new DataView(new ArrayBuffer(size));
    for (const [name, text] of files) {
      const nameBytes = encoder.encode(name);
      const data = encoder.encode(text);
      const crc = crc32(data);
      const local = header(30);
      local.setUint32(0, 0x04034B50, true);
      local.setUint16(4, 20, true);
      local.setUint16(6, 0x0800, true); // names are UTF-8
      local.setUint32(14, crc, true);
      local.setUint32(18, data.length, true);
      local.setUint32(22, data.length, true);
      local.setUint16(26, nameBytes.length, true);
      parts.push(new Uint8Array(local.buffer), nameBytes, data);

      const entry = header(46);
      entry.setUint32(0, 0x02014B50, true);
      entry.setUint16(4, 20, true);
      entry.setUint16(6, 20, true);
      entry.setUint16(8, 0x0800, true);
      entry.setUint32(16, crc, true);
      entry.setUint32(20, data.length, true);
      entry.setUint32(24, data.length, true);
      entry.setUint16(28, nameBytes.length, true);
      entry.setUint32(42, offset, true);
      central.push(new Uint8Array(entry.buffer), nameBytes);
      offset += 30 + nameBytes.length + data.length;
    }
    const centralSize = central.reduce((sum, b) => sum + b.length, 0);
    const end = header(22);
    end.setUint32(0, 0x06054B50, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, centralSize, true);
    end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  const xml = (value) => String(value)
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function columnName(index) {
    let name = '';
    for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
    return name;
  }

  function rowXml(rowNumber, cells, style = 0) {
    const inner = cells.map((value, i) => {
      const ref = `${columnName(i)}${rowNumber}`;
      if (value === '' || value === null || value === undefined) return '';
      if (typeof value === 'number') return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
      return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
    }).join('');
    return `<row r="${rowNumber}">${inner}</row>`;
  }

  function excelBlob({ title, lines, entries }) {
    const { head, body } = table(entries);
    const summary = summarise(entries);
    const rows = [rowXml(1, [title], 1)];
    let at = 2;
    for (const line of lines) rows.push(rowXml(at++, [line]));
    rows.push(rowXml(at++, [`Entries: ${summary.count}   KMS: ${summary.kms}   Deficiencies: ${summary.deficiencies}`]));
    at++;
    const headerRow = at;
    rows.push(rowXml(at++, head, 1));
    for (const line of body) {
      // S.No and KMS stay numbers so they can be added up in Excel.
      const kms = head.indexOf('KMS');
      const cells = line.map((v, i) => (i === kms && /^\d+(\.\d+)?$/.test(String(v)) ? Number(v) : v));
      rows.push(rowXml(at++, cells));
    }
    const lastColumn = columnName(head.length - 1);
    const widths = [6, 12, 20, 16, 24, 7, 11, 9, 12, 8, 8, 8, 7, 8, 7, 8, 8, 6, 20, 26, 26];
    const cols = widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');
    const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="${headerRow}" topLeftCell="A${headerRow + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols}</cols><sheetData>${rows.join('')}</sheetData><autoFilter ref="A${headerRow}:${lastColumn}${at - 1}"/></worksheet>`;
    return zip([
      ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
      ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
      ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Duty Report" sheetId="1" r:id="rId1"/></sheets></workbook>`],
      ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
      ['xl/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>`],
      ['xl/worksheets/sheet1.xml', sheet],
    ]);
  }

  // ── PDF ──────────────────────────────────────────────────────────────────────
  function pdfBlob({ title, lines, entries }) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4', compress: true });
    const { head, body } = table(entries);
    const summary = summarise(entries);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 30, 34);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    let y = 50;
    for (const line of [...lines, `Entries: ${summary.count}   KMS: ${summary.kms}   Deficiencies: ${summary.deficiencies}`]) {
      doc.text(line, 30, y);
      y += 12;
    }
    doc.autoTable({
      head: [head],
      body,
      startY: y + 2,
      margin: { left: 20, right: 20, bottom: 30 },
      styles: { fontSize: 6.5, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [0, 105, 107], textColor: 255 },
      alternateRowStyles: { fillColor: [238, 248, 248] },
      didDrawPage: () => {
        doc.setFontSize(7);
        doc.setTextColor(100);
        doc.text(`Crew Monitor · Page ${doc.internal.getNumberOfPages()}`, 20, doc.internal.pageSize.getHeight() - 14);
        doc.setTextColor(0);
      },
    });
    return doc.output('blob');
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  return { select, summarise, table, excelBlob, pdfBlob, download, shownDate };
})();

if (typeof module !== 'undefined') module.exports = CrewReports;

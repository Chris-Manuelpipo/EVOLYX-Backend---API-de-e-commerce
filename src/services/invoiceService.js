const PDFDocument = require('pdfkit');
const company = require('../config/company');
const HttpError = require('../utils/httpError');

const MARGIN = 52;
const GOLD = '#D4AF37';
const INK = '#18181B';
const MUTED = '#3F3F46';
const FAINT = '#71717A';
const LINE = '#D4D4D8';
const HEADER_BG = '#F4F4F5';
const FOOTER_H = 76;
const REGULAR = 'Helvetica';
const BOLD = 'Helvetica-Bold';
const FOOTER =
  "Document interne / émis après livraison. Paiement confirmé par l'équipe.";
const MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

function safeText(value) {
  if (value == null) return '';
  return String(value)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2026]/g, '...')
    .replace(/[\u00A0\u202F\u2007\u2009\u200A\u200B]/g, ' ')
    .replace(/[^\t\n\r\x20-\x7E\xA0-\xFF]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function groupInt(value) {
  const n = Math.round(Number(value) || 0);
  const sign = n < 0 ? '-' : '';
  const digits = String(Math.abs(n));
  return `${sign}${digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;
}

function money(value) {
  return `${groupInt(value)} FCFA`;
}

function zonedParts(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = {};
  for (const part of new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Douala',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(date)) {
    if (part.type !== 'literal') parts[part.type] = part.value;
  }
  return parts;
}

function formatDate(value) {
  const parts = zonedParts(value);
  if (!parts) return '-';
  const month = MONTHS[Number(parts.month) - 1] || parts.month;
  return `${parts.day} ${month} ${parts.year}`;
}

function statusLabel(status) {
  return status === 'delivered' ? 'Livrée' : safeText(status) || '-';
}

function contentWidth(doc) {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function pageBottom(doc) {
  return doc.page.height - FOOTER_H;
}

function hline(doc, x1, x2, y, color, width = 1) {
  doc.save();
  doc.strokeColor(color).lineWidth(width).moveTo(x1, y).lineTo(x2, y).stroke();
  doc.restore();
}

function columns(width) {
  const qty = 46;
  const unit = 110;
  const total = 110;
  return { product: width - qty - unit - total, qty, unit, total };
}

function productLines(item) {
  const name = safeText(item.product_name) || `Produit #${item.product_id}`;
  const extras = [item.color, item.size].map(safeText).filter(Boolean).join(' / ');
  return { name, extras };
}

function measureRow(doc, item, col) {
  const { name, extras } = productLines(item);
  const inner = col.product - 16;
  doc.font(REGULAR).fontSize(10);
  let height = doc.heightOfString(name, { width: inner });
  if (extras) height += 3 + doc.heightOfString(extras, { width: inner });
  return Math.max(28, Math.ceil(height) + 16);
}

function ensureSpace(doc, y, needed, onNewPage) {
  if (y + needed <= pageBottom(doc)) return y;
  doc.addPage();
  return onNewPage ? onNewPage(doc) : doc.page.margins.top;
}

function drawFooter(doc, page, pages) {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  const ruleY = doc.page.height - 48;
  const textY = ruleY + 10;
  const previousY = doc.y;

  hline(doc, left, left + width, ruleY, GOLD, 1);
  doc.font(REGULAR).fontSize(10).fillColor(FAINT);
  doc.text(FOOTER, left, textY, { width: width - 48, lineBreak: false });
  doc.text(`${page} / ${pages}`, left + width - 44, textY, {
    width: 44,
    align: 'right',
    lineBreak: false,
  });
  doc.y = previousY;
}

function drawBrand(doc, y) {
  const left = doc.page.margins.left;
  const width = contentWidth(doc) * 0.58;

  doc.font(BOLD).fontSize(18).fillColor(INK);
  doc.text(safeText(company.name) || 'EVOLYX', left, y, { width });

  let cursor = doc.y + 8;
  doc.font(REGULAR).fontSize(10).fillColor(MUTED);
  const lines = [
    safeText(company.city) || 'Yaoundé',
    safeText(company.email) || 'evolyxcmr@gmail.com',
    `WhatsApp ${safeText(company.phone) || '+237 6 54 80 49 07'}`,
  ];
  lines.forEach((line) => {
    doc.text(line, left, cursor, { width });
    cursor = doc.y + 2;
  });
  return cursor;
}

function drawTitle(doc, order, y) {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  const box = width * 0.4;
  const x = left + width - box;

  doc.font(BOLD).fontSize(16).fillColor(INK);
  doc.text('Facture', x, y, { width: box, align: 'right' });
  doc.font(REGULAR).fontSize(10).fillColor(MUTED);
  doc.text(`Commande n° ${safeText(order.id)}`, x, y + 26, {
    width: box,
    align: 'right',
  });
  doc.text(formatDate(order.created_at), x, y + 42, { width: box, align: 'right' });
  return y + 58;
}

function drawHeader(doc, order) {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  const y = doc.page.margins.top;
  const bottom = Math.max(drawBrand(doc, y), drawTitle(doc, order, y)) + 12;
  hline(doc, left, left + width, bottom, GOLD, 1);
  return bottom + 22;
}

function drawContinuedHeader(doc, order) {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  const y = doc.page.margins.top;

  doc.font(BOLD).fontSize(12).fillColor(INK);
  doc.text(safeText(company.name) || 'EVOLYX', left, y, {
    width: width * 0.45,
    lineBreak: false,
  });
  doc.font(REGULAR).fontSize(10).fillColor(MUTED);
  doc.text(`Facture  n° ${safeText(order.id)}`, left, y + 1, {
    width,
    align: 'right',
    lineBreak: false,
  });

  hline(doc, left, left + width, y + 24, GOLD, 1);
  return y + 40;
}

function drawMeta(doc, order, y) {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  const gap = 28;
  const col = (width - gap) / 2;
  const right = left + col + gap;

  doc.font(BOLD).fontSize(10).fillColor(FAINT);
  doc.text('CLIENT', left, y, { width: col, lineBreak: false });
  doc.text('DOCUMENT', right, y, { width: col, lineBreak: false });

  y += 16;
  const start = y;

  doc.font(BOLD).fontSize(11).fillColor(INK);
  doc.text(safeText(order.customer_name) || '-', left, y, { width: col });
  y = doc.y + 4;
  doc.font(REGULAR).fontSize(10).fillColor(MUTED);
  if (order.customer_phone) {
    doc.text(safeText(order.customer_phone), left, y, { width: col });
    y = doc.y + 2;
  }
  if (order.customer_address) {
    doc.text(safeText(order.customer_address), left, y, { width: col });
    y = doc.y;
  }
  const leftBottom = y;

  let metaY = start;
  [
    ['Statut', statusLabel(order.status)],
    ['Date', formatDate(order.created_at)],
  ].forEach(([label, value]) => {
    doc.font(REGULAR).fontSize(10).fillColor(FAINT);
    doc.text(label, right, metaY, { width: 72, lineBreak: false });
    doc.font(BOLD).fontSize(10).fillColor(INK);
    doc.text(value, right + 76, metaY, { width: col - 76 });
    metaY = Math.max(metaY + 16, doc.y);
  });

  return Math.max(leftBottom, metaY) + 22;
}

function drawTableHeader(doc, y, col) {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  const h = 28;

  doc.save();
  doc.rect(left, y, width, h).fill(HEADER_BG);
  doc.restore();

  const textY = y + 8;
  doc.font(BOLD).fontSize(10).fillColor(MUTED);
  doc.text('Produit', left + 8, textY, { width: col.product - 16, lineBreak: false });
  doc.text('Qté', left + col.product, textY, {
    width: col.qty - 8,
    align: 'right',
    lineBreak: false,
  });
  doc.text('PU', left + col.product + col.qty, textY, {
    width: col.unit - 8,
    align: 'right',
    lineBreak: false,
  });
  doc.text('Total', left + col.product + col.qty + col.unit, textY, {
    width: col.total - 8,
    align: 'right',
    lineBreak: false,
  });

  hline(doc, left, left + width, y + h, LINE, 1);
  return y + h;
}

function drawRow(doc, item, y, col) {
  const left = doc.page.margins.left;
  const { name, extras } = productLines(item);
  const inner = col.product - 16;
  const rowH = measureRow(doc, item, col);
  const textY = y + 8;

  doc.font(REGULAR).fontSize(10).fillColor(INK);
  const nameH = doc.heightOfString(name, { width: inner });
  doc.text(name, left + 8, textY, { width: inner });
  if (extras) {
    doc.fillColor(FAINT);
    doc.text(extras, left + 8, textY + nameH + 2, { width: inner });
  }

  doc.font(REGULAR).fontSize(10).fillColor(INK);
  doc.text(groupInt(item.quantity), left + col.product, textY, {
    width: col.qty - 8,
    align: 'right',
    lineBreak: false,
  });
  doc.text(groupInt(item.price), left + col.product + col.qty, textY, {
    width: col.unit - 8,
    align: 'right',
    lineBreak: false,
  });
  doc.text(
    groupInt(Number(item.price) * Number(item.quantity)),
    left + col.product + col.qty + col.unit,
    textY,
    { width: col.total - 8, align: 'right', lineBreak: false }
  );

  hline(doc, left, left + contentWidth(doc), y + rowH, LINE, 1);
  return y + rowH;
}

function drawItems(doc, order, startY) {
  const col = columns(contentWidth(doc));
  const items = order.items || [];
  const continueTable = (nextDoc) =>
    drawTableHeader(nextDoc, drawContinuedHeader(nextDoc, order), col);

  let y = ensureSpace(doc, startY, 60, (nextDoc) => drawContinuedHeader(nextDoc, order));
  y = drawTableHeader(doc, y, col);

  if (!items.length) {
    y = ensureSpace(doc, y, 32, continueTable);
    doc.font(REGULAR).fontSize(10).fillColor(FAINT);
    doc.text('Aucun article', doc.page.margins.left + 8, y + 10, {
      width: contentWidth(doc) - 16,
    });
    return y + 32;
  }

  items.forEach((item) => {
    const rowH = measureRow(doc, item, col);
    y = ensureSpace(doc, y, rowH + 2, continueTable);
    y = drawRow(doc, item, y, col);
  });

  return y + 18;
}

function drawTotals(doc, order, startY) {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  const box = 250;
  const x = left + width - box;
  const discount = Number(order.promo_discount) || 0;
  const total = Number(order.total_amount) || 0;
  const subtotal = total + discount;
  const hasPromo = Boolean(safeText(order.promo_code) || discount);

  let y = ensureSpace(doc, startY, hasPromo ? 90 : 64, (nextDoc) =>
    drawContinuedHeader(nextDoc, order)
  );

  const line = (label, value, { bold = false, size = 10 } = {}) => {
    doc.font(REGULAR).fontSize(size).fillColor(MUTED);
    doc.text(label, x, y, { width: 110, lineBreak: false });
    doc.font(bold ? BOLD : REGULAR)
      .fontSize(size)
      .fillColor(INK);
    doc.text(value, x + 110, y, { width: box - 110, align: 'right', lineBreak: false });
    y += size + 10;
  };

  line('Sous-total', money(subtotal));
  if (hasPromo) {
    const code = safeText(order.promo_code);
    line(code ? `Promo ${code}` : 'Promo', money(-discount));
  }

  y += 2;
  hline(doc, x, x + box, y, GOLD, 1);
  y += 10;
  line('Total', money(total), { bold: true, size: 14 });
  return y;
}

exports.buildPdf = function buildPdf(order) {
  if (!order || order.status !== 'delivered') {
    return Promise.reject(
      new HttpError('Facture disponible uniquement pour une commande livrée', 403)
    );
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: MARGIN, left: MARGIN, right: MARGIN, bottom: 0 },
      bufferPages: true,
      info: {
        Title: `Facture EVOLYX ${order.id}`,
        Author: safeText(company.name) || 'EVOLYX',
        Subject: 'Facture interne',
      },
    });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    let y = drawHeader(doc, order);
    y = drawMeta(doc, order, y);
    y = drawItems(doc, order, y);
    drawTotals(doc, order, y);

    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i += 1) {
      doc.switchToPage(range.start + i);
      drawFooter(doc, i + 1, range.count);
    }

    doc.end();
  });
};

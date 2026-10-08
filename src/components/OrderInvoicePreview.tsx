import React, { useMemo } from 'react';
import type { OrderRequest } from '../types';
import './AddOrderModal.css';
import './OrderInvoicePreview.css';

interface OrderInvoicePreviewProps {
  order: OrderRequest;
  partyName: string;
  invoiceNumber: string;
}

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const money = (value?: number | null) =>
  `₹ ${(Number(value) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const qty = (value?: number | null) => (Number(value) > 0 ? Number(value).toLocaleString('en-IN') : '-');

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const [y, m, d] = value.slice(0, 10).split('-');
  return d && m && y ? `${d}/${m}/${y}` : value;
};

// Plain invoice (no letterhead/logo). The same HTML drives the on-screen preview
// and the downloaded copy, so what the user sees is exactly what they get.
export const buildInvoiceHtml = ({ order, partyName, invoiceNumber }: OrderInvoicePreviewProps) => {
  const onlinePercent = Math.round((100 - (Number(order.offlineBillPercent) || 0)) * 100) / 100;
  const lines = order.products.filter((p) => p.productName || Number(p.totalAmount) > 0);

  const rows = lines.length
    ? lines
        .map((p) => {
          const isPc = p.quantityUnit ? p.quantityUnit === 'pc' : Number(p.quantityPc) > 0;
          return `<tr>
            <td class="name">${escapeHtml(p.productName || '-')}</td>
            <td>${isPc ? '-' : qty(p.quantityKg)}</td>
            <td>${isPc ? qty(p.quantityPc) : '-'}</td>
            <td>${Number(p.marketRate) || 0}${isPc ? ' /pc' : ''}</td>
            <td>${isPc ? '-' : Number(p.rateDifference) || 0}</td>
            <td class="amt">${money(p.totalAmount)}</td>
          </tr>`;
        })
        .join('')
    : '<tr><td colspan="6" class="empty">No items added yet</td></tr>';

  const summary: Array<[string, string, boolean?]> = [
    ['Items Total', money(order.productsTotal)],
    [`Official Bill (${onlinePercent}%)`, money(order.officialBillAmount)],
    ['GST (18%)', money(order.gst)],
    [`Offline Total (${Math.round((100 - onlinePercent) * 100) / 100}%)`, money(order.offlineTotal)],
  ];
  if (Number(order.transport) > 0) summary.push(['Transport', money(order.transport)]);
  summary.push(['Grand Total', money(order.grandTotal), true]);

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<title>Invoice ${escapeHtml(invoiceNumber)} - ${escapeHtml(partyName || 'Order')}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #1a365d; background: #fff; padding: 28px; }
  .wrap { max-width: 800px; margin: 0 auto; }
  .head { text-align: center; margin-bottom: 24px; }
  .title { font-size: 24px; font-weight: 700; letter-spacing: 2px; }
  .num { font-size: 13px; color: #4a5568; margin-top: 4px; }
  .info { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 22px; }
  .info .right { text-align: right; }
  .label { font-size: 10px; color: #718096; margin-bottom: 2px; }
  .value { font-size: 13px; font-weight: 600; margin-bottom: 8px; word-break: break-word; }
  .contact { font-size: 11px; margin-bottom: 3px; }
  .contact span { color: #718096; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  th { color: #2c5282; font-size: 11px; font-weight: 600; padding: 9px 6px; text-align: center; border-bottom: 2px solid #bee3f8; }
  th:first-child { text-align: left; } th:last-child { text-align: right; }
  td { padding: 10px 6px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: center; }
  td.name { text-align: left; font-weight: 500; }
  td.amt { text-align: right; font-weight: 500; white-space: nowrap; }
  td.empty { color: #a0aec0; padding: 18px; }
  .summary { margin-left: auto; width: min(320px, 100%); }
  .summary div { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; }
  .summary div span:last-child { font-weight: 600; white-space: nowrap; }
  .summary .grand { border-bottom: none; border-top: 2px solid #1a365d; margin-top: 4px; padding-top: 9px; font-size: 15px; font-weight: 700; }
  .note { margin-top: 20px; font-size: 11px; color: #4a5568; }
  .note b { color: #1a365d; }
  @page { size: A4; margin: 12mm; }
  @media print { body { padding: 0; } }
</style></head>
<body><div class="wrap">
  <div class="head">
    <div class="title">INVOICE</div>
    <div class="num">${escapeHtml(invoiceNumber)}</div>
  </div>
  <div class="info">
    <div>
      <div class="label">Customer Name</div>
      <div class="value">${escapeHtml(partyName || '-')}</div>
      <div class="contact"><span>Contact no :-</span> ${escapeHtml(order.customerMobileNo || '-')}</div>
      <div class="contact"><span>Email :-</span> ${escapeHtml(order.customerEmail || '-')}</div>
    </div>
    <div class="right">
      <div class="label">Date</div>
      <div class="value">${formatDate(order.orderDate)}</div>
      <div class="label">Payment Date</div>
      <div class="value">${formatDate(order.paymentDate)}</div>
    </div>
  </div>
  <table>
    <thead><tr><th>Product Name</th><th>Qty (KG)</th><th>Qty (PC)</th><th>Market Rate</th><th>Rate Diff</th><th>Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="summary">
    ${summary
      .map(([label, value, grand]) => `<div${grand ? ' class="grand"' : ''}><span>${escapeHtml(label)}</span><span>${value}</span></div>`)
      .join('')}
  </div>
  ${order.note?.trim() ? `<div class="note"><b>Note:</b> ${escapeHtml(order.note.trim())}</div>` : ''}
</div></body></html>`;
};

// Print the invoice through a hidden iframe; the browser's "Save as PDF" names the file from <title>
export const downloadInvoice = (props: OrderInvoicePreviewProps) => {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  if (!doc || !iframe.contentWindow) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(buildInvoiceHtml(props));
  doc.close();
  const win = iframe.contentWindow;
  setTimeout(() => {
    win.focus();
    win.print();
    setTimeout(() => iframe.remove(), 1000);
  }, 150);
};

const OrderInvoicePreview: React.FC<OrderInvoicePreviewProps> = (props) => {
  const html = useMemo(() => buildInvoiceHtml(props), [props.order, props.partyName, props.invoiceNumber]);

  return (
    <aside className="invoice-preview-panel" onClick={(e) => e.stopPropagation()}>
      <div className="invoice-preview-header">
        <div>
          <p className="invoice-preview-subtitle">Updates as you edit</p>
          <h3 className="invoice-preview-title">Invoice Preview</h3>
        </div>
        <button
          type="button"
          className="order-btn"
          data-variant="primary"
          onClick={() => downloadInvoice(props)}
        >
          Download PDF
        </button>
      </div>
      <div className="invoice-preview-paper">
        <iframe title="Invoice preview" srcDoc={html} className="invoice-preview-frame" />
      </div>
    </aside>
  );
};

export default OrderInvoicePreview;

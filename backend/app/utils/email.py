"""
Email utility — sends HTML receipts via SMTP.
Works with Gmail, Outlook, Yahoo and any SMTP provider.

To enable: add these to backend/.env
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USERNAME=your@gmail.com
  SMTP_PASSWORD=your-app-password    # Gmail: use App Password, not login password
  SMTP_FROM_NAME=My Business
  SMTP_FROM_EMAIL=your@gmail.com
"""
import asyncio
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from app.core.config import settings


def _build_receipt_html(sale: dict, items: list[dict], business_name: str) -> str:
    rows = ""
    for item in items:
        rows += f"""
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">{item['product_name']}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center">{item['quantity']}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right">${float(item['unit_price']):.2f}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600">${float(item['subtotal']):.2f}</td>
        </tr>"""

    discount_row = ""
    if float(sale.get("discount_amount", 0)) > 0:
        discount_row = f"""
        <tr>
          <td colspan="3" style="padding:6px 12px;text-align:right;color:#64748b">Discount</td>
          <td style="padding:6px 12px;text-align:right;color:#dc2626">-${float(sale['discount_amount']):.2f}</td>
        </tr>"""

    tax_row = ""
    if float(sale.get("tax_amount", 0)) > 0:
        tax_row = f"""
        <tr>
          <td colspan="3" style="padding:6px 12px;text-align:right;color:#64748b">Tax</td>
          <td style="padding:6px 12px;text-align:right">${float(sale['tax_amount']):.2f}</td>
        </tr>"""

    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

    <!-- Header -->
    <div style="background:#059669;padding:28px 32px">
      <div style="color:#ffffff;font-size:22px;font-weight:700">{business_name}</div>
      <div style="color:#a7f3d0;font-size:13px;margin-top:4px">Sales Receipt</div>
    </div>

    <!-- Invoice Info -->
    <div style="padding:24px 32px;border-bottom:1px solid #f1f5f9">
      <table style="width:100%;font-size:13px">
        <tr>
          <td style="color:#64748b">Invoice Number</td>
          <td style="font-weight:600;text-align:right">{sale.get('invoice_number','—')}</td>
        </tr>
        <tr>
          <td style="color:#64748b;padding-top:6px">Date</td>
          <td style="text-align:right;padding-top:6px">{str(sale.get('created_at',''))[:10]}</td>
        </tr>
        <tr>
          <td style="color:#64748b;padding-top:6px">Payment Method</td>
          <td style="text-align:right;padding-top:6px;text-transform:capitalize">{sale.get('payment_method','—')}</td>
        </tr>
      </table>
    </div>

    <!-- Items -->
    <div style="padding:24px 32px">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#f8fafc">
            <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:600;font-size:11px;text-transform:uppercase">Item</th>
            <th style="padding:8px 12px;text-align:center;color:#64748b;font-weight:600;font-size:11px;text-transform:uppercase">Qty</th>
            <th style="padding:8px 12px;text-align:right;color:#64748b;font-weight:600;font-size:11px;text-transform:uppercase">Price</th>
            <th style="padding:8px 12px;text-align:right;color:#64748b;font-weight:600;font-size:11px;text-transform:uppercase">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows}
          {discount_row}
          {tax_row}
          <tr>
            <td colspan="3" style="padding:12px 12px 4px;text-align:right;font-weight:700;font-size:15px">Total</td>
            <td style="padding:12px 12px 4px;text-align:right;font-weight:700;font-size:15px;color:#059669">${float(sale.get('total_amount', 0)):.2f}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:20px 32px;text-align:center">
      <p style="color:#94a3b8;font-size:12px;margin:0">Thank you for your purchase!</p>
      <p style="color:#cbd5e1;font-size:11px;margin:6px 0 0">This receipt was generated automatically by {business_name}.</p>
    </div>
  </div>
</body>
</html>"""


def _send_smtp(to_email: str, subject: str, html_body: str) -> None:
    """Blocking SMTP send — called in a thread executor."""
    if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        raise ValueError("SMTP credentials not configured. Add SMTP_USERNAME and SMTP_PASSWORD to backend/.env")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html"))

    context = ssl.create_default_context()
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.ehlo()
        server.starttls(context=context)
        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_USERNAME, to_email, msg.as_string())


async def send_receipt_email(
    to_email: str,
    sale: dict,
    items: list[dict],
    business_name: str,
) -> None:
    """Async wrapper — runs blocking SMTP in thread pool so it doesn't block FastAPI."""
    subject = f"Your Receipt — {sale.get('invoice_number', 'Purchase')}"
    html = _build_receipt_html(sale, items, business_name)
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _send_smtp, to_email, subject, html)

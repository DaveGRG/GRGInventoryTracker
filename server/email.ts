import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    console.log("Gmail credentials not configured - email notifications disabled");
    return null;
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  return transporter;
}

interface TransferNotificationData {
  items: { sku: string; quantity: number }[];
  fromLocation: string;
  toLocation: string;
  requestDate: string;
  requestedBy: string;
  notes?: string | null;
}

export async function sendTransferNotification(
  recipients: string[],
  data: TransferNotificationData
): Promise<boolean> {
  const mailer = getTransporter();
  if (!mailer || recipients.length === 0) return false;

  const itemRows = data.items
    .map((item) => `<tr><td style="padding:6px 12px;border:1px solid #ddd;font-family:monospace">${item.sku}</td><td style="padding:6px 12px;border:1px solid #ddd;text-align:center">${item.quantity}</td></tr>`)
    .join("");

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#5a8c1e;padding:16px 24px;border-radius:8px 8px 0 0">
        <h2 style="color:#fff;margin:0;font-size:18px">New Transfer Request</h2>
      </div>
      <div style="padding:20px 24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 8px 8px">
        <p style="margin:0 0 12px"><strong>From:</strong> ${data.fromLocation} → <strong>To:</strong> ${data.toLocation}</p>
        <p style="margin:0 0 12px"><strong>Date:</strong> ${data.requestDate}</p>
        <p style="margin:0 0 12px"><strong>Requested by:</strong> ${data.requestedBy}</p>
        ${data.notes ? `<p style="margin:0 0 12px"><strong>Notes:</strong> ${data.notes}</p>` : ""}
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <thead>
            <tr style="background:#f5f5f5">
              <th style="padding:8px 12px;border:1px solid #ddd;text-align:left">SKU</th>
              <th style="padding:8px 12px;border:1px solid #ddd;text-align:center">Qty</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
        <p style="margin:16px 0 0;font-size:12px;color:#888">— GRG Playscapes Inventory System</p>
      </div>
    </div>
  `;

  try {
    await mailer.sendMail({
      from: `"GRG Playscapes" <${process.env.GMAIL_USER}>`,
      to: recipients.join(", "),
      subject: `Transfer Request: ${data.fromLocation} → ${data.toLocation} (${data.items.length} item${data.items.length !== 1 ? "s" : ""})`,
      html,
    });
    console.log(`Transfer notification sent to ${recipients.length} recipient(s)`);
    return true;
  } catch (error) {
    console.error("Failed to send transfer notification:", error);
    return false;
  }
}

interface PurchaseOrderEmailData {
  poNumber: string;
  orderDate: string;
  vendorName: string;
  items: { sku: string; quantity: number; hub?: string | null }[];
  sentBy: string;
  notes?: string;
}

export async function sendPurchaseOrderEmail(
  vendorEmail: string,
  data: PurchaseOrderEmailData
): Promise<boolean> {
  const mailer = getTransporter();
  if (!mailer) return false;

  const itemRows = data.items
    .map((item) => `<tr><td style="padding:8px 12px;border:1px solid #ddd;font-family:monospace;font-size:14px">${item.sku}</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:center;font-size:14px">${item.quantity}</td></tr>`)
    .join("");

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#5a8c1e;padding:16px 24px;border-radius:8px 8px 0 0">
        <h2 style="color:#fff;margin:0;font-size:20px">Purchase Order</h2>
      </div>
      <div style="padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 8px 8px">
        <table style="margin-bottom:20px">
          <tr><td style="padding:4px 16px 4px 0;font-weight:bold;color:#555">PO Number:</td><td style="font-size:16px;font-weight:bold">${data.poNumber}</td></tr>
          <tr><td style="padding:4px 16px 4px 0;font-weight:bold;color:#555">Date:</td><td>${data.orderDate}</td></tr>
          <tr><td style="padding:4px 16px 4px 0;font-weight:bold;color:#555">Vendor:</td><td>${data.vendorName}</td></tr>
          <tr><td style="padding:4px 16px 4px 0;font-weight:bold;color:#555">Ordered By:</td><td>${data.sentBy}</td></tr>
        </table>
        ${data.notes ? `<p style="margin:0 0 16px;padding:8px 12px;background:#f9f9f9;border-radius:4px"><strong>Notes:</strong> ${data.notes}</p>` : ""}
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <thead>
            <tr style="background:#f5f5f5">
              <th style="padding:10px 12px;border:1px solid #ddd;text-align:left;font-size:14px">Item (SKU)</th>
              <th style="padding:10px 12px;border:1px solid #ddd;text-align:center;font-size:14px">Quantity</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
        <p style="margin:20px 0 0;font-size:12px;color:#888">— GRG Playscapes Inventory System</p>
      </div>
    </div>
  `;

  try {
    await mailer.sendMail({
      from: `"GRG Playscapes" <${process.env.GMAIL_USER}>`,
      replyTo: process.env.GMAIL_USER,
      to: vendorEmail,
      subject: `Purchase Order ${data.poNumber} - GRG Playscapes`,
      html,
    });
    console.log(`Purchase order ${data.poNumber} sent to ${vendorEmail}`);
    return true;
  } catch (error) {
    console.error("Failed to send purchase order email:", error);
    return false;
  }
}

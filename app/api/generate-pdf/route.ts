import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import path from "path";

/**
 * Pretty PDF generator (Unicode-safe) for Railway/Node runtime.
 * Branding: Kreator Akademija
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  title?: string;
  subtitle?: string;
  reportMarkdown?: string;
  reportText?: string;
  filename?: string;
  meta?: {
    channel?: string;
    videoTitle?: string;
    period?: string;
    createdAt?: string;
  };
};

function safeString(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  return fallback;
}

function nowISODate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeText(input: string): string {
  // Keep as-is; PDFKit + Unicode font handles Serbian chars.
  return input.replace(/\r\n/g, "\n");
}

function buildFilename(raw?: string) {
  const base = raw?.trim() || `youtube-report-${nowISODate()}.pdf`;
  return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
}

function loadFontPaths() {
  const regular = path.join(process.cwd(), "public", "fonts", "DejaVuSans.ttf");
  const bold = path.join(process.cwd(), "public", "fonts", "DejaVuSans-Bold.ttf");
  return { regular, bold };
}

// Very lightweight markdown-ish renderer (headings + bullets + spacing)
function renderReport(doc: PDFKit.PDFDocument, text: string, fonts: { regular: string; bold: string }) {
  const page = doc.page;
  const contentWidth = page.width - page.margins.left - page.margins.right;
  const left = page.margins.left;

  const lines = normalizeText(text).split("\n");

  let y = doc.y;

  const ensureSpace = (needed: number) => {
    const bottomLimit = page.height - page.margins.bottom - 48; // reserve for footer
    if (y + needed > bottomLimit) {
      doc.addPage();
      y = doc.y;
    }
  };

  const setBody = () => {
    doc.font(fonts.regular).fontSize(11).fillColor("#111827");
  };

  const setBold = () => {
    doc.font(fonts.bold).fontSize(11).fillColor("#111827");
  };

  setBody();

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, "  ").trimEnd();
    const trimmed = line.trim();

    // Blank line
    if (!trimmed) {
      y += 8;
      doc.y = y;
      continue;
    }

    // Headings
    const h1 = /^#\s+/.test(trimmed) ? trimmed.replace(/^#\s+/, "") : null;
    const h2 = /^##\s+/.test(trimmed) ? trimmed.replace(/^##\s+/, "") : null;
    const h3 = /^###\s+/.test(trimmed) ? trimmed.replace(/^###\s+/, "") : null;

    if (h1 || h2 || h3) {
      const txt = (h1 || h2 || h3) as string;
      const size = h1 ? 18 : h2 ? 14 : 12;
      ensureSpace(size + 14);
      doc.font(fonts.bold).fontSize(size).fillColor("#0f172a");
      doc.text(txt, left, y, { width: contentWidth });
      y = doc.y + 6;
      doc.y = y;
      setBody();
      continue;
    }

    // Section box for "PRIORITET"
    if (/^🟥|^🟨|^🟩|^🔴|^🟡|^🟢|^PRIORITET\s+\d+:/i.test(trimmed)) {
      ensureSpace(48);
      const boxY = y;
      const boxH = 32;
      doc.save();
      doc.roundedRect(left, boxY, contentWidth, boxH, 8).fill("#f8fafc");
      doc.restore();
      doc.font(fonts.bold).fontSize(12).fillColor("#111827");
      doc.text(trimmed, left + 12, boxY + 10, { width: contentWidth - 24 });
      y = boxY + boxH + 10;
      doc.y = y;
      setBody();
      continue;
    }

    // Bullets / numbered
    const isBullet = /^[-•]\s+/.test(trimmed);
    const isNumbered = /^\d+\.\s+/.test(trimmed);

    if (isBullet || isNumbered) {
      ensureSpace(16);
      const bulletText = trimmed;
      doc.font(fonts.regular).fontSize(11).fillColor("#111827");
      doc.text(bulletText, left + 10, y, {
        width: contentWidth - 10,
        lineGap: 3,
      });
      y = doc.y + 3;
      doc.y = y;
      continue;
    }

    // Emphasis lines like **Something**
    const strong = /^\*\*(.+)\*\*$/.exec(trimmed);
    if (strong) {
      ensureSpace(16);
      doc.font(fonts.bold).fontSize(11).fillColor("#0f172a");
      doc.text(strong[1], left, y, { width: contentWidth, lineGap: 3 });
      y = doc.y + 4;
      doc.y = y;
      setBody();
      continue;
    }

    // Normal paragraph
    ensureSpace(18);
    doc.font(fonts.regular).fontSize(11).fillColor("#111827");
    doc.text(trimmed, left, y, { width: contentWidth, lineGap: 3 });
    y = doc.y + 5;
    doc.y = y;
  }

  // Return cursor
  doc.y = y;
}

function addCoverPage(doc: PDFKit.PDFDocument, body: Body, fonts: { regular: string; bold: string }) {
  const page = doc.page;
  const left = page.margins.left;
  const width = page.width - page.margins.left - page.margins.right;

  // Background accents
  doc.save();
  doc.rect(0, 0, page.width, page.height).fill("#ffffff");
  doc.restore();

  // Top accent line
  doc.save();
  doc.rect(0, 0, page.width, 10).fill("#111827");
  doc.restore();

  const brand = "Kreator Akademija";
  const title = safeString(body.title, "Video Analyzer");
  const subtitle = safeString(body.subtitle, "Detaljni izveštaj");
  const createdAt = safeString(body?.meta?.createdAt, nowISODate());

  doc.font(fonts.bold).fontSize(12).fillColor("#111827");
  doc.text(brand, left, 60, { width, align: "left" });

  doc.moveDown(2);

  doc.font(fonts.bold).fontSize(28).fillColor("#0f172a");
  doc.text(title, left, 120, { width, align: "left" });

  doc.font(fonts.regular).fontSize(14).fillColor("#334155");
  doc.text(subtitle, left, 165, { width, align: "left" });

  // Info box
  const boxY = 230;
  const boxH = 120;
  doc.save();
  doc.roundedRect(left, boxY, width, boxH, 12).fill("#f8fafc");
  doc.restore();

  const infoLines = [
    ["Datum", createdAt],
    ["Kanal", safeString(body?.meta?.channel, "—")],
    ["Video", safeString(body?.meta?.videoTitle, "—")],
    ["Period analize", safeString(body?.meta?.period, "—")],
  ];

  let y = boxY + 20;
  for (const [k, v] of infoLines) {
    doc.font(fonts.bold).fontSize(10).fillColor("#0f172a");
    doc.text(`${k}:`, left + 18, y, { width: 120 });
    doc.font(fonts.regular).fontSize(10).fillColor("#334155");
    doc.text(v, left + 140, y, { width: width - 160 });
    y += 22;
  }

  // Footer note
  doc.font(fonts.regular).fontSize(10).fillColor("#64748b");
  doc.text("Generisano automatski. Koristi sopstvenu procenu za finalne odluke.", left, page.height - 90, {
    width,
  });
}

function addFooters(doc: PDFKit.PDFDocument, fonts: { regular: string; bold: string }) {
  const range = doc.bufferedPageRange(); // { start: 0, count: n }
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const page = doc.page;
    const left = page.margins.left;
    const width = page.width - page.margins.left - page.margins.right;

    const footerY = page.height - page.margins.bottom - 32;

    // separator
    doc.save();
    doc.moveTo(left, footerY).lineTo(left + width, footerY).strokeColor("#e5e7eb").lineWidth(1).stroke();
    doc.restore();

    doc.font(fonts.regular).fontSize(9).fillColor("#6b7280");
    doc.text("Kreator Akademija", left, footerY + 10, { width: width / 2, align: "left" });
    doc.text(`Strana ${i + 1} / ${range.count}`, left, footerY + 10, { width, align: "right" });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;

    const fonts = loadFontPaths();

    const report =
      safeString(body.reportMarkdown) ||
      safeString(body.reportText) ||
      safeString(body.subtitle) ||
      "";

    const title = safeString(body.title, "Video Analyzer");
    const filename = buildFilename(body.filename);

    // Build PDF
    const doc = new PDFDocument({
      size: "A4",
      margin: 56,
      bufferPages: true,
      info: {
        Title: title,
        Author: "Kreator Akademija",
        Subject: "YouTube Video Dijagnostika",
      },
    });

    // Important: set a Unicode font early
    doc.font(fonts.regular);

    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });

    // Cover
    addCoverPage(doc, body, fonts);

    // Content pages
    doc.addPage();
    doc.font(fonts.bold).fontSize(16).fillColor("#0f172a").text("Detailed Report", { align: "left" });
    doc.moveDown(0.75);
    doc.font(fonts.regular).fontSize(11).fillColor("#111827");

    renderReport(doc, report, fonts);

    // Footers
    addFooters(doc, fonts);

    doc.end();

    const pdf = await done;

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("PDF generation error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "PDF generation failed" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";

export const runtime = "nodejs";

type Body = {
  content?: string;
  filename?: string;
};

function makePdfBuffer(title: string, content: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: "A4" });

    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text(title, { align: "center" });
    doc.moveDown(1);

    doc.fontSize(12).text(content || "", {
      width: 500,
      lineGap: 6,
    });

    doc.end();
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const content = String(body?.content ?? "");
    const filename = (body?.filename?.trim() || "analysis").replace(/[^\w\-]+/g, "_");
    const title = "Video Analyzer – Detailed Report";

    const pdfBuffer = await makePdfBuffer(title, content);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("PDF generation error:", err);
    return NextResponse.json(
      { error: "PDF generation failed" },
      { status: 500 }
    );
  }
}

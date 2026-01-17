import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';

export const runtime = 'nodejs';

interface RequestBody {
  content: string;
  title: string;
}

// Convert markdown-like content to clean text
function cleanContent(content: string): string {
  return content
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markers
    .replace(/\*(.*?)\*/g, '$1')     // Remove italic markers
    .replace(/#{1,6}\s/g, '')        // Remove heading markers
    .replace(/---/g, '─'.repeat(50)) // Convert hr to line
    .replace(/\n{3,}/g, '\n\n');     // Reduce multiple newlines
}

// Parse content into sections
function parseContent(content: string): { type: 'heading' | 'subheading' | 'text' | 'line' | 'table'; text: string }[] {
  const lines = content.split('\n');
  const parsed: { type: 'heading' | 'subheading' | 'text' | 'line' | 'table'; text: string }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (!trimmed) {
      continue;
    }
    
    if (trimmed.startsWith('# ')) {
      parsed.push({ type: 'heading', text: trimmed.replace(/^#\s+/, '').replace(/\*\*/g, '') });
    } else if (trimmed.startsWith('## ')) {
      parsed.push({ type: 'subheading', text: trimmed.replace(/^##\s+/, '').replace(/\*\*/g, '') });
    } else if (trimmed.startsWith('---') || trimmed.match(/^─+$/)) {
      parsed.push({ type: 'line', text: '' });
    } else if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      parsed.push({ type: 'table', text: trimmed });
    } else {
      // Clean up the text
      const cleanedText = trimmed
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1');
      parsed.push({ type: 'text', text: cleanedText });
    }
  }

  return parsed;
}

export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json();
    const { content, title } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'No content provided' },
        { status: 400 }
      );
    }

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: title || 'YouTube Video Report',
        Author: 'Video Analyzer',
        Subject: 'YouTube Video Dijagnostika',
      },
    });

    // Collect PDF data
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    // Use built-in fonts
    const regularFont = 'Helvetica';
    const boldFont = 'Helvetica-Bold';

    // Header
    doc
      .fillColor('#6366f1')
      .fontSize(24)
      .font(boldFont)
      .text('📊 YouTube Video Dijagnostika', { align: 'center' });
    
    doc.moveDown(0.5);
    
    doc
      .fillColor('#71717a')
      .fontSize(10)
      .font(regularFont)
      .text(`Generisano: ${new Date().toLocaleDateString('sr-RS', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`, { align: 'center' });

    doc.moveDown(1);

    // Divider line
    doc
      .strokeColor('#e4e4e7')
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();

    doc.moveDown(1);

    // Parse and render content
    const parsed = parseContent(content);
    
    for (const item of parsed) {
      // Check if we need a new page
      if (doc.y > 750) {
        doc.addPage();
      }

      switch (item.type) {
        case 'heading':
          doc.moveDown(0.5);
          doc
            .fillColor('#18181b')
            .fontSize(16)
            .font(boldFont)
            .text(item.text);
          doc.moveDown(0.3);
          break;

        case 'subheading':
          doc.moveDown(0.3);
          doc
            .fillColor('#3f3f46')
            .fontSize(12)
            .font(boldFont)
            .text(item.text);
          doc.moveDown(0.2);
          break;

        case 'text':
          doc
            .fillColor('#52525b')
            .fontSize(10)
            .font(regularFont)
            .text(item.text, {
              align: 'left',
              lineGap: 2,
            });
          doc.moveDown(0.2);
          break;

        case 'line':
          doc.moveDown(0.3);
          doc
            .strokeColor('#e4e4e7')
            .lineWidth(0.5)
            .moveTo(50, doc.y)
            .lineTo(545, doc.y)
            .stroke();
          doc.moveDown(0.3);
          break;

        case 'table':
          // Simple table rendering
          const cells = item.text.split('|').filter(c => c.trim());
          const cellWidth = 490 / cells.length;
          const startX = 50;
          const startY = doc.y;

          cells.forEach((cell, index) => {
            doc
              .fillColor('#52525b')
              .fontSize(9)
              .font(regularFont)
              .text(cell.trim(), startX + (index * cellWidth), startY, {
                width: cellWidth - 5,
                align: 'left',
              });
          });
          
          doc.y = startY + 15;
          doc.moveDown(0.1);
          break;
      }
    }

    // Footer
    doc.moveDown(2);
    doc
      .strokeColor('#e4e4e7')
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();
    
    doc.moveDown(0.5);
    doc
      .fillColor('#a1a1aa')
      .fontSize(8)
      .font(regularFont)
      .text('Generisano pomoću Video Analyzer | AI-Powered YouTube Analytics', { align: 'center' });

    // Finalize PDF
    doc.end();

    // Wait for PDF to be fully generated
    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });

    // Return PDF (NextResponse expects a web-compatible BodyInit)
    const pdfBytes = new Uint8Array(pdfBuffer);
    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="youtube-report-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

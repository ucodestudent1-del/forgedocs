import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { TemplateData } from './types';

/**
 * PDF Exporter - handles conversion of generated HTML to PDF
 */
export class PdfExporter {
  private static readonly PAGE_SIZE: [number, number] = [612, 792]; // Letter size
  private static readonly MARGIN = 50;
  private static readonly FONT_SIZE = 11;

  /**
   * Export HTML content as PDF
   */
  async export(html: string): Promise<Blob> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage(PdfExporter.PAGE_SIZE);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const maxWidth = page.getWidth() - 2 * PdfExporter.MARGIN;

    const textContent = this.extractTextFromHTML(html);
    let y = page.getHeight() - PdfExporter.MARGIN;
    const lines = this.wrapText(textContent, font, PdfExporter.FONT_SIZE, maxWidth);

    for (const line of lines) {
      if (y < PdfExporter.MARGIN) {
        const newPage = pdfDoc.addPage(PdfExporter.PAGE_SIZE);
        y = newPage.getHeight() - PdfExporter.MARGIN;
      }
      page.drawText(line, {
        x: PdfExporter.MARGIN,
        y,
        size: PdfExporter.FONT_SIZE,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });
      y -= PdfExporter.FONT_SIZE * 1.5;
    }

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  }

  /**
   * Extract plain text from HTML for PDF rendering
   */
  private extractTextFromHTML(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/g, '')
      .replace(/<\/h1>/g, '\n\n')
      .replace(/<\/h2>/g, '\n\n')
      .replace(/<\/p>/g, '\n')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }

  /**
   * Wrap text to fit within maxWidth
   */
  private wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
    const paragraphs = text.split('\n');
    const lines: string[] = [];

    for (const paragraph of paragraphs) {
      const words = paragraph.split(' ');
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const width = font.widthOfTextAtSize(testLine, fontSize);
        if (width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        lines.push(currentLine);
      }
    }

    return lines;
  }
}

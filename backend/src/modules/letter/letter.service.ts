import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// pdfkit is CommonJS (module.exports = PDFDocument); with esModuleInterop disabled the
// default import resolves to undefined at runtime, so require it directly.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument: any = require('pdfkit');

const BRANDS = ['Apollo', 'Redstone', 'Omnia', 'POP'];
const LETTER_TITLES: Record<string, string> = {
  Warning: 'ASB Behaviour Warning Letter',
  Legal: 'Legal Notice',
  Notice: 'Notice Under Section',
  'Right to Rent': 'Right to Rent Verification',
};

@Injectable()
export class LetterService {
  private letterDir: string;

  constructor(private prisma: PrismaService, private timeline: TimelineService) {
    this.letterDir = path.join(process.cwd(), 'uploads', 'letters');
    fs.mkdirSync(this.letterDir, { recursive: true });
  }

  private brandFor(orgName: string): string {
    const found = BRANDS.find((b) => b !== 'POP' && orgName?.includes(b));
    return found || 'POP';
  }

  async findAll(complaintId: string) {
    await this.prisma.complaint.findUnique({ where: { id: complaintId } });
    return this.prisma.complaintLetter.findMany({
      where: { complaintId },
      include: { generatedBy: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async generate(complaintId: string, letterType: string, userId: string) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id: complaintId },
      include: { property: true, assignedTo: true, organization: true },
    });
    if (!complaint) throw new NotFoundException('Complaint not found');

    const title = LETTER_TITLES[letterType] || 'Notice Letter';
    const brand = this.brandFor(complaint.organization?.name || '');
    const fileName = `ASB-${letterType.replace(/\s/g, '')}-${complaint.reference}-${Date.now()}.pdf`;
    const key = `${crypto.randomBytes(6).toString('hex')}.pdf`;
    const absolutePath = path.join(this.letterDir, key);

    const stream = fs.createWriteStream(absolutePath);
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(stream);

    doc.fontSize(10);
    doc.text(brand, { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(16).font('Helvetica-Bold');
    doc.text(title, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('Helvetica');
    doc.text(`To: ${complaint.tenantName}`);
    doc.text(`Property: ${complaint.property?.name || ''} ${complaint.property?.address || ''}`);
    doc.text(`Reference: ${complaint.reference}`);
    doc.text(`Category: ${complaint.category} | Severity: ${complaint.severity} | Risk: ${complaint.riskLevel}`);
    doc.text(`Date of Incident: ${new Date(complaint.incidentDate).toLocaleDateString()}`);
    doc.moveDown();
    doc.text('Dear Sir/Madam,');
    doc.moveDown();
    doc.text(
      `We are writing to formally advise you regarding the above-referenced anti-social behaviour report. ` +
        `The following incident has been recorded: ${complaint.description || 'N/A'}.`,
    );
    doc.moveDown();
    doc.text(
      'This conduct is in breach of your tenancy agreement and the relevant housing regulations. ' +
        'Further incidents will result in escalated action, including legal proceedings.',
    );
    doc.moveDown(3);
    doc.text('Yours faithfully,');
    doc.moveDown(2);
    doc.text(complaint.assignedTo ? `${complaint.assignedTo.firstName} ${complaint.assignedTo.lastName}` : 'Property Manager');
    doc.text(brand + ' Housing');
    doc.end();

    await new Promise<void>((resolve, reject) => {
      stream.on('finish', () => resolve());
      stream.on('error', reject);
    });

    const content = `${title}\nReference: ${complaint.reference}\nGenerated: ${new Date().toISOString()}`;

    const letter = await this.prisma.complaintLetter.create({
      data: {
        complaintId,
        letterType,
        content,
        pdfUrl: key,
        letterhead: brand,
        generatedById: userId,
      },
    });

    await this.timeline.create({
      complaintId,
      personId: userId,
      action: 'Letter Generated',
      details: `${title} (${letterType}) generated as ${fileName}`,
    });

    return { ...letter, absolutePath, fileName };
  }

  async markSent(complaintId: string, letterId: string, userId: string) {
    const letter = await this.prisma.complaintLetter.findUnique({ where: { id: letterId } });
    if (!letter) throw new NotFoundException('Letter not found');
    if (letter.complaintId !== complaintId) throw new ForbiddenException('Access denied');

    const updated = await this.prisma.complaintLetter.update({
      where: { id: letterId },
      data: { sentDate: new Date(), sentMethod: 'Posted' },
    });

    await this.timeline.create({
      complaintId,
      personId: userId,
      action: 'Letter Sent',
      details: `${updated.letterType} letter marked as sent`,
    });

    return updated;
  }

  getPath(letterId: string) {
    return path.join(this.letterDir, letterId);
  }

  async getFilePath(letterId: string) {
    const letter = await this.prisma.complaintLetter.findUnique({ where: { id: letterId } });
    if (!letter) throw new NotFoundException('Letter not found');
    const absolutePath = path.join(this.letterDir, letter.pdfUrl);
    if (!fs.existsSync(absolutePath)) throw new NotFoundException('Letter file missing on disk');
    return { absolutePath, fileName: `letter-${letter.letterType}.pdf` };
  }
}

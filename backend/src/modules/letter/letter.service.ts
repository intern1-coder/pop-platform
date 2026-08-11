import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { NotifyService } from '../notify/notify.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// pdfkit is CommonJS (module.exports = PDFDocument); with esModuleInterop disabled the
// default import resolves to undefined at runtime, so require it directly.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument: any = require('pdfkit');

import { ASB_LETTER_TYPES, generateLetterContent, AsbLetterType } from '../../asb/letter-templates';

const BRANDS = ['Apollo', 'Redstone', 'Omnia', 'POP'];
const LEGACY_TITLES: Record<string, string> = {
  Warning: 'ASB Behaviour Warning Letter',
  Legal: 'Legal Notice',
  Notice: 'Notice Under Section',
  'Right to Rent': 'Right to Rent Verification',
};

export interface GenerateOptions {
  mode?: 'generic' | 'named';
  tenantIds?: string[];
}

@Injectable()
export class LetterService {
  private letterDir: string;

  constructor(
    private prisma: PrismaService,
    private timeline: TimelineService,
    private notify: NotifyService,
  ) {
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

  private async loadComplaint(complaintId: string) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id: complaintId },
      include: { property: true, assignedTo: true, organization: true },
    });
    if (!complaint) throw new NotFoundException('Complaint not found');
    return complaint;
  }

  private propertyAddress(c: any): string {
    const addr = [
      c.addressLine1,
      c.addressLine2,
      c.city,
      c.postcode,
    ]
      .filter(Boolean)
      .join(', ');
    return addr || [c.property?.name, c.property?.address].filter(Boolean).join(', ');
  }

  private async writePdf(brand: string, title: string, lines: string[]): Promise<string> {
    const key = `${crypto.randomBytes(6).toString('hex')}.pdf`;
    const absolutePath = path.join(this.letterDir, key);
    const stream = fs.createWriteStream(absolutePath);
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(stream);

    doc.fontSize(10);
    doc.text(brand, { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text(title, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('Helvetica');

    for (const line of lines) {
      if (!line.trim()) {
        doc.moveDown(0.6);
        continue;
      }
      doc.text(line, { lineGap: 2 });
    }

    doc.end();
    await new Promise<void>((resolve, reject) => {
      stream.on('finish', () => resolve());
      stream.on('error', reject);
    });
    return key;
  }

  private async saveLetter(params: {
    complaintId: string;
    letterType: string;
    content: string;
    letterhead: string;
    generatedById: string;
    isGeneric?: boolean;
    tenantName?: string | null;
    pdfKey: string;
  }) {
    return this.prisma.complaintLetter.create({
      data: {
        complaintId: params.complaintId,
        letterType: params.letterType,
        content: params.content,
        pdfUrl: params.pdfKey,
        letterhead: params.letterhead,
        isGeneric: params.isGeneric ?? false,
        tenantName: params.tenantName ?? null,
        generatedById: params.generatedById,
      },
    });
  }

  async generate(complaintId: string, letterType: string, userId: string, options: GenerateOptions = {}) {
    const complaint = await this.loadComplaint(complaintId);
    const isAsb = ASB_LETTER_TYPES.includes(letterType as AsbLetterType);
    const brand = this.brandFor(complaint.organization?.name || '');
    const complaintsEmail = process.env.COMPLAINTS_EMAIL || 'complaints@pop.example.com';

    const created: any[] = [];

    if (isAsb) {
      const mode = options.mode || 'named';
      const isGeneric = mode === 'generic';

      if (letterType === 'notice_seeking_possession') {
        if (isGeneric) {
          throw new BadRequestException(
            'A Notice Seeking Possession must name the specific tenant(s) — select the responsible tenant(s) rather than the whole property.',
          );
        }
        if (!complaint.noticeGround) {
          throw new BadRequestException(
            'Select a Section 8 ground before generating a Notice Seeking Possession — the notice period depends on it and must never be guessed.',
          );
        }
      }

      const complaintForTemplate = {
        reference: complaint.reference,
        tenantName: complaint.tenantName,
        propertyAddress: this.propertyAddress(complaint),
        landlordName: complaint.landlordName,
        landlordAddress: complaint.landlordAddress,
        category: complaint.category,
        noticeGround: complaint.noticeGround,
        noticeServedDate: complaint.noticeServedDate,
      };

      if (isGeneric) {
        const content = generateLetterContent(letterType as AsbLetterType, complaintForTemplate, complaintsEmail, {
          generic: true,
        });
        const pdfKey = await this.writePdf(brand, letterType.replace(/_/g, ' '), content.split('\n'));
        const letter = await this.saveLetter({
          complaintId,
          letterType,
          content,
          letterhead: brand,
          generatedById: userId,
          isGeneric: true,
          pdfKey,
        });
        created.push({ ...letter, tenantName: 'The Occupiers', isGeneric: true });
      } else {
        let targets: any[];
        if (Array.isArray(options.tenantIds) && options.tenantIds.length) {
          targets = await this.prisma.complaintTenant.findMany({
            where: { complaintId, id: { in: options.tenantIds } },
          });
        } else {
          targets = [{ id: null, tenantName: complaint.tenantName }];
        }
        if (!targets.length) throw new BadRequestException('No matching tenants found for this case');

        for (const t of targets) {
          const content = generateLetterContent(letterType as AsbLetterType, complaintForTemplate, complaintsEmail, {
            addressee: t.tenantName,
          });
          const pdfKey = await this.writePdf(brand, letterType.replace(/_/g, ' '), content.split('\n'));
          const letter = await this.saveLetter({
            complaintId,
            letterType,
            content,
            letterhead: brand,
            generatedById: userId,
            isGeneric: false,
            tenantName: t.tenantName,
            pdfKey,
          });
          created.push(letter);
        }
      }

      await this.prisma.complaintAudit.create({
        data: {
          complaintId,
          action: isGeneric ? 'letter_generated_generic' : 'letter_generated',
          details: isGeneric
            ? `Generic "${letterType}" letter (whole property) generated by ${userId}`
            : `"${letterType}" letter generated for ${created.map((c) => c.tenantName || complaint.tenantName).join(', ')} by ${userId}`,
          userId,
        },
      });

      await this.timeline.create({
        complaintId,
        personId: userId,
        action: 'Letter Generated',
        details: `${letterType} letter${isGeneric ? ' (generic)' : ''} generated (${created.length})`,
      });

      return { letters: created };
    }

    // Legacy (non-ASB) letter types kept for backward compatibility.
    const title = LEGACY_TITLES[letterType] || 'Notice Letter';
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

  async markSent(
    complaintId: string,
    letterId: string,
    userId: string,
    data: { sentMethod?: string; certificateOfPostingDate?: string } = {},
  ) {
    const letter = await this.prisma.complaintLetter.findUnique({ where: { id: letterId } });
    if (!letter) throw new NotFoundException('Letter not found');
    if (letter.complaintId !== complaintId) throw new ForbiddenException('Access denied');

    const sentMethod = data.sentMethod || 'post';
    let certificateOfPostingDate: Date | null = null;

    if (sentMethod === 'email') {
      const complaint = await this.prisma.complaint.findUnique({ where: { id: complaintId } });
      if (!complaint?.tenantEmail) {
        throw new BadRequestException('No tenant email on record — choose Post or Hand Delivered');
      }
      await this.notify.sendEmail({
        to: complaint.tenantEmail,
        subject: `Important Notice — Ref: ${complaint.reference}`,
        bodyText: letter.content,
      });
    }

    if (sentMethod === 'post' && data.certificateOfPostingDate) {
      certificateOfPostingDate = new Date(data.certificateOfPostingDate);
    }

    const updated = await this.prisma.complaintLetter.update({
      where: { id: letterId },
      data: {
        sentDate: new Date(),
        sentMethod,
        certificateOfPostingDate,
      },
    });

    await this.prisma.complaintAudit.create({
      data: {
        complaintId,
        action: 'letter_sent',
        details: `Letter ${letterId} marked sent via ${sentMethod}`,
        userId,
      },
    });

    await this.timeline.create({
      complaintId,
      personId: userId,
      action: 'Letter Sent',
      details: `${updated.letterType} letter marked as sent (${sentMethod})`,
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

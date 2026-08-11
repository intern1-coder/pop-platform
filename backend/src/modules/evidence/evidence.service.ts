import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const MAX_SIZE = 100 * 1024 * 1024;

const ALLOWED_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/wav': 'wav',
  'audio/wave': 'wav',
  'audio/x-wav': 'wav',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

@Injectable()
export class EvidenceService {
  private uploadDir: string;

  constructor(private prisma: PrismaService, private timeline: TimelineService) {
    this.uploadDir = path.join(process.cwd(), 'uploads', 'evidence');
    fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  private async ensureComplaint(complaintId: string) {
    const complaint = await this.prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint) throw new NotFoundException('Complaint not found');
    return complaint;
  }

  async upload(complaintId: string, file: any, description: string, userId: string) {
    await this.ensureComplaint(complaintId);
    if (!file) throw new BadRequestException('No file uploaded');
    if (file.size > MAX_SIZE) throw new BadRequestException('File exceeds 100MB limit');

    const ext = ALLOWED_EXT[file.mimetype];
    if (!ext) throw new BadRequestException('File type not allowed');

    const storedName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
    const absolutePath = path.join(this.uploadDir, storedName);
    fs.writeFileSync(absolutePath, file.buffer);

    const evidence = await this.prisma.complaintEvidence.create({
      data: {
        complaintId,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        r2Key: storedName,
        description: description || null,
        uploadedById: userId,
      },
    });

    await this.timeline.create({
      complaintId,
      personId: userId,
      action: 'Evidence Uploaded',
      details: `File "${file.originalname}" attached to complaint`,
    });

    return evidence;
  }

  async findAll(complaintId: string) {
    await this.ensureComplaint(complaintId);
    return this.prisma.complaintEvidence.findMany({
      where: { complaintId },
      include: { uploadedBy: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async download(complaintId: string, evidenceId: string) {
    await this.ensureComplaint(complaintId);
    const evidence = await this.prisma.complaintEvidence.findFirst({
      where: { id: evidenceId, complaintId },
    });
    if (!evidence) throw new NotFoundException('Evidence not found');
    const absolutePath = path.join(this.uploadDir, evidence.r2Key);
    if (!fs.existsSync(absolutePath)) throw new NotFoundException('Evidence file missing on disk');
    return { ...evidence, absolutePath };
  }

  async delete(complaintId: string, evidenceId: string, userId: string) {
    await this.ensureComplaint(complaintId);
    const evidence = await this.prisma.complaintEvidence.findFirst({
      where: { id: evidenceId, complaintId },
    });
    if (!evidence) throw new NotFoundException('Evidence not found');

    const absolutePath = path.join(this.uploadDir, evidence.r2Key);
    if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);

    await this.prisma.complaintEvidence.delete({ where: { id: evidenceId } });
    await this.timeline.create({
      complaintId,
      personId: userId,
      action: 'Evidence Deleted',
      details: `File "${evidence.fileName}" removed`,
    });

    return { success: true };
  }

  // Guard helper: ensure caller can access this complaint
  async canAccess(complaintId: string, user: any) {
    const roles = user?.roles || [];
    const isStaff = roles.some((r: string) => ['Admin', 'PropertyManager'].includes(r));
    if (isStaff) return true;
    const complaint = await this.prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint) throw new ForbiddenException('Complaint not found');
    if (complaint.tenantEmail !== user.email) throw new ForbiddenException('Access denied');
    return true;
  }
}

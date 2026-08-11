import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Res,
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { EvidenceService } from './evidence.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

const MAX_SIZE = 100 * 1024 * 1024;

@Controller('complaints/:complaintId/evidence')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin', 'PropertyManager', 'Tenant')
export class EvidenceController {
  constructor(private readonly evidenceService: EvidenceService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_SIZE } }))
  async upload(
    @Param('complaintId') complaintId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_SIZE })],
      }),
    )
    file: any,
    @Body('description') description: string,
    @Request() req,
  ) {
    await this.evidenceService.canAccess(complaintId, req.user);
    return this.evidenceService.upload(complaintId, file, description, req.user.id);
  }

  @Get()
  async findAll(@Param('complaintId') complaintId: string, @Request() req) {
    await this.evidenceService.canAccess(complaintId, req.user);
    return this.evidenceService.findAll(complaintId);
  }

  @Get(':evidenceId/file')
  async downloadFile(
    @Param('complaintId') complaintId: string,
    @Param('evidenceId') evidenceId: string,
    @Request() req,
    @Res() res: Response,
  ) {
    await this.evidenceService.canAccess(complaintId, req.user);
    const evidence = await this.evidenceService.download(complaintId, evidenceId);
    res.download(evidence.absolutePath, evidence.fileName);
  }

  @Delete(':evidenceId')
  async delete(
    @Param('complaintId') complaintId: string,
    @Param('evidenceId') evidenceId: string,
    @Request() req,
  ) {
    await this.evidenceService.canAccess(complaintId, req.user);
    return this.evidenceService.delete(complaintId, evidenceId, req.user.id);
  }
}

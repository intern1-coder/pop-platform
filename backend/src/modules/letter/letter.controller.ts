import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Res,
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { LetterService } from './letter.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('complaints/:complaintId/letters')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin', 'PropertyManager')
export class LetterController {
  constructor(private readonly letterService: LetterService) {}

  @Post()
  async generate(@Param('complaintId') complaintId: string, @Body('letterType') letterType: string, @Request() req) {
    if (!letterType) throw new NotFoundException('LetterType is required');
    return this.letterService.generate(complaintId, letterType, req.user.id);
  }

  @Get()
  async findAll(@Param('complaintId') complaintId: string, @Request() req) {
    return this.letterService.findAll(complaintId);
  }

  @Get(':letterId/file')
  async downloadFile(@Param('letterId') letterId: string, @Res() res: Response) {
    const file = await this.letterService.getFilePath(letterId);
    return res.download(file.absolutePath, file.fileName);
  }

  @Put(':letterId/sent')
  async markSent(@Param('complaintId') complaintId: string, @Param('letterId') letterId: string, @Request() req) {
    return this.letterService.markSent(complaintId, letterId, req.user.id);
  }
}
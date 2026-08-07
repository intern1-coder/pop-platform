import { Module } from '@nestjs/common';
import { PropertyController } from './property.controller';
import { PropertyService } from './property.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [PrismaModule],
  controllers: [PropertyController],
  providers: [PropertyService, PrismaService],
  exports: [PropertyService],
})
export class PropertyModule {}
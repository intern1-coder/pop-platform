import { Module } from '@nestjs/common';
import { MetaController } from './meta.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [PrismaModule],
  controllers: [MetaController],
  providers: [PrismaService],
})
export class MetaModule {}

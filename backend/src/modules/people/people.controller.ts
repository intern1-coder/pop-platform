import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { PeopleService } from './people.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('people')
@UseGuards(JwtAuthGuard)
export class PeopleController {
  constructor(private readonly peopleService: PeopleService) {}

  @Post()
  create(@Body() dto: any, @Request() req) {
    return this.peopleService.create(dto, req.user.orgId);
  }

  @Get()
  findAll(@Request() req) {
    return this.peopleService.findAll(req.user.orgId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.peopleService.findOne(id);
  }
}
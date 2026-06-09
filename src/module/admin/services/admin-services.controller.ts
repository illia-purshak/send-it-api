import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '../../../common/guards/admin-jwt-auth.guard.js';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import { ADMIN_SERVICES_ROUTES } from '../../../constants/apiRoutes.js';
import {
  CreatePostalServiceSchema,
  UpdatePostalServiceSchema,
  type CreatePostalServiceDto,
  type UpdatePostalServiceDto,
} from '../../../validation/admin/admin-services.schema.js';
import { AdminServicesService } from './admin-services.service.js';

@ApiTags('Admin — Services')
@ApiBearerAuth('bearer')
@UseGuards(AdminJwtAuthGuard)
@Controller()
export class AdminServicesController {
  constructor(private readonly adminServicesService: AdminServicesService) {}

  @Get(ADMIN_SERVICES_ROUTES.BASE)
  @ApiOperation({ summary: 'List all postal services in the system' })
  @ApiOkResponse({ description: 'Services list' })
  @ApiUnauthorizedResponse()
  getAll() {
    return this.adminServicesService.getAll();
  }

  @Get(ADMIN_SERVICES_ROUTES.BY_ID)
  @ApiOperation({ summary: 'Get a single postal service' })
  @ApiOkResponse({ description: 'Service detail' })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.adminServicesService.getById(id);
  }

  @Post(ADMIN_SERVICES_ROUTES.BASE)
  @ApiOperation({ summary: 'Add a new postal operator to the system catalogue' })
  @ApiCreatedResponse({ description: 'Service created' })
  @ApiConflictResponse({ description: 'Name or slug already taken' })
  @ApiUnauthorizedResponse()
  create(
    @Body(new ZodValidationPipe(CreatePostalServiceSchema)) dto: CreatePostalServiceDto,
  ) {
    return this.adminServicesService.create(dto);
  }

  @Put(ADMIN_SERVICES_ROUTES.BY_ID)
  @ApiOperation({ summary: 'Update a postal service (name, logo, isActive)' })
  @ApiOkResponse({ description: 'Service updated' })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(UpdatePostalServiceSchema)) dto: UpdatePostalServiceDto,
  ) {
    return this.adminServicesService.update(id, dto);
  }

  @Delete(ADMIN_SERVICES_ROUTES.BY_ID)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a postal service (only if no active user connections)' })
  @ApiNoContentResponse({ description: 'Service deleted' })
  @ApiConflictResponse({ description: 'SERVICE_HAS_ACTIVE_CONNECTIONS' })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.adminServicesService.delete(id);
  }
}

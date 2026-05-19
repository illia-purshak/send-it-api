import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { AdminPlansService } from './admin-plans.service.js';
import { AdminJwtAuthGuard } from '../../../common/guards/admin-jwt-auth.guard.js';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import {
  AdminGetPlansQuerySchema,
  CreateAdminPlanSchema,
  UpdateAdminPlanSchema,
  type AdminGetPlansQueryDto,
  type CreateAdminPlanDto,
  type UpdateAdminPlanDto,
} from '../../../validation/subscription/subscription.schema.js';
import { ADMIN_PLAN_ROUTES } from '../../../constants/apiRoutes.js';

@ApiTags('Admin Plans')
@ApiBearerAuth('bearer')
@UseGuards(AdminJwtAuthGuard)
@Controller(ADMIN_PLAN_ROUTES.BASE)
export class AdminPlansController {
  constructor(private readonly adminPlansService: AdminPlansService) {}

  @Get()
  @ApiOkResponse({ description: 'Paginated list of subscription plans' })
  @ApiUnauthorizedResponse()
  getAll(
    @Query(new ZodValidationPipe(AdminGetPlansQuerySchema)) query: AdminGetPlansQueryDto,
  ) {
    return this.adminPlansService.getAll(query);
  }

  @Get(ADMIN_PLAN_ROUTES.BY_ID)
  @ApiOkResponse({ description: 'Plan details' })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.adminPlansService.getById(id);
  }

  @Post()
  @ApiCreatedResponse({ description: 'Plan created' })
  @ApiUnauthorizedResponse()
  @ApiBadRequestResponse()
  create(@Body(new ZodValidationPipe(CreateAdminPlanSchema)) dto: CreateAdminPlanDto) {
    return this.adminPlansService.create(dto);
  }

  @Put(ADMIN_PLAN_ROUTES.BY_ID)
  @ApiOkResponse({ description: 'Plan updated' })
  @ApiUnauthorizedResponse()
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(UpdateAdminPlanSchema)) dto: UpdateAdminPlanDto,
  ) {
    return this.adminPlansService.update(id, dto);
  }

  @Delete(ADMIN_PLAN_ROUTES.BY_ID)
  @HttpCode(200)
  @ApiOkResponse({ description: 'Plan deleted' })
  @ApiUnauthorizedResponse()
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.adminPlansService.remove(id);
  }
}

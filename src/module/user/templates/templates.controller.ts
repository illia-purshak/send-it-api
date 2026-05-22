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
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import { TEMPLATE_ROUTES } from '../../../constants/apiRoutes.js';
import type { JwtUser } from '../../../types/auth.types.js';
import {
  CreateTemplateSchema,
  ListTemplatesQuerySchema,
  UpdateTemplateSchema,
  type CreateTemplateDto,
  type ListTemplatesQueryDto,
  type UpdateTemplateDto,
} from '../../../validation/templates/template.schema.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { TemplatesService } from './templates.service.js';
import { FeatureGuard } from '../../../common/guards/feature.guard.js';
import { RequireFeature } from '../../../common/decorators/require-feature.decorator.js';

@ApiTags('Templates')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller()
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get(TEMPLATE_ROUTES.BASE)
  @ApiOperation({ summary: 'List templates with optional filters and search' })
  @ApiOkResponse({ description: 'Template list' })
  @ApiUnauthorizedResponse()
  getTemplates(
    @CurrentUser() user: JwtUser,
    @Query(new ZodValidationPipe(ListTemplatesQuerySchema)) query: ListTemplatesQueryDto,
  ) {
    return this.templatesService.getTemplates(user.id, query);
  }

  @Get(TEMPLATE_ROUTES.BY_ID)
  @ApiOperation({ summary: 'Get single template by ID' })
  @ApiOkResponse({ description: 'Template record' })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  getTemplateById(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.templatesService.getTemplateById(user.id, id);
  }

  @UseGuards(FeatureGuard)
  @RequireFeature('hasTemplates')
  @Post(TEMPLATE_ROUTES.BASE)
  @ApiOperation({ summary: 'Create a new template' })
  @ApiCreatedResponse({ description: 'Template created' })
  @ApiUnauthorizedResponse()
  @ApiBadRequestResponse()
  @ApiForbiddenResponse({ description: 'FEATURE_NOT_AVAILABLE — upgrade plan to access templates' })
  createTemplate(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(CreateTemplateSchema)) dto: CreateTemplateDto,
  ) {
    return this.templatesService.createTemplate(user.id, dto);
  }

  @UseGuards(FeatureGuard)
  @RequireFeature('hasTemplates')
  @Put(TEMPLATE_ROUTES.BY_ID)
  @ApiOperation({ summary: 'Update an existing template' })
  @ApiOkResponse({ description: 'Template updated' })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  updateTemplate(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(UpdateTemplateSchema)) dto: UpdateTemplateDto,
  ) {
    return this.templatesService.updateTemplate(user.id, id, dto);
  }

  @Delete(TEMPLATE_ROUTES.BY_ID)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a template' })
  @ApiNoContentResponse({ description: 'Template deleted' })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  deleteTemplate(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.templatesService.deleteTemplate(user.id, id);
  }

  @Post(TEMPLATE_ROUTES.INCREMENT_USAGE)
  @HttpCode(200)
  @ApiOperation({ summary: 'Increment template usage count by 1' })
  @ApiOkResponse({ description: 'Updated usage count' })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  incrementUsage(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.templatesService.incrementUsage(user.id, id);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Put,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { PostalConnectionsService } from './postal-connections.service.js';
import { NovaPostAuthService } from './nova-post/nova-post-auth.service.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import type { JwtUser } from '../../../types/auth.types.js';
import { POSTAL_ROUTES } from '../../../constants/apiRoutes.js';
import {
  ConnectOperatorQuerySchema,
  ConnectOperatorBodySchema,
  UpdateConnectionKeySchema,
  type ConnectOperatorQueryDto,
  type ConnectOperatorBodyDto,
  type UpdateConnectionKeyDto,
} from '../../../validation/postal-connections/connect-operator.schema.js';

@ApiTags('Postal Connections')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller()
export class PostalConnectionsController {
  constructor(
    private readonly postalConnectionsService: PostalConnectionsService,
    private readonly novaPostAuthService: NovaPostAuthService,
  ) {}

  @Get(POSTAL_ROUTES.BASE)
  @ApiOperation({ summary: 'List all postal connections for the current user' })
  @ApiOkResponse({ description: 'All connections for the current user (all statuses)' })
  @ApiUnauthorizedResponse()
  getAll(@CurrentUser() user: JwtUser) {
    return this.postalConnectionsService.getConnectionsForUser(user.id);
  }

  @Post(POSTAL_ROUTES.BASE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Connect a postal operator using an API key' })
  @ApiQuery({
    name: 'operator',
    enum: ['nova-post', 'ukrposhta', 'meest'],
    description: 'Postal operator slug',
    required: true,
  })
  @ApiBody({
    schema: { type: 'object', properties: { apiKey: { type: 'string' } }, required: ['apiKey'] },
  })
  @ApiCreatedResponse({ description: 'Connection created or updated successfully' })
  @ApiForbiddenResponse({ description: 'OPERATOR_LIMIT_REACHED — upgrade plan to add more operators' })
  @ApiNotFoundResponse({ description: 'OPERATOR_NOT_FOUND — unknown operator slug' })
  @ApiUnauthorizedResponse()
  async connect(
    @CurrentUser() user: JwtUser,
    @Query(new ZodValidationPipe(ConnectOperatorQuerySchema)) query: ConnectOperatorQueryDto,
    @Body(new ZodValidationPipe(ConnectOperatorBodySchema)) dto: ConnectOperatorBodyDto,
  ) {
    if (query.operator === 'nova-post') {
      await this.novaPostAuthService.connect(user.id, dto.apiKey);
      return { connected: true };
    }
    return this.postalConnectionsService.connectGeneric(user.id, query.operator, dto.apiKey);
  }

  @Get(POSTAL_ROUTES.BY_ID)
  @ApiOperation({ summary: 'Get a single postal connection by ID' })
  @ApiParam({ name: 'id', type: 'integer', description: 'Connection DB id' })
  @ApiOkResponse({ description: 'Connection record' })
  @ApiNotFoundResponse({ description: 'CONNECTION_NOT_FOUND' })
  @ApiUnauthorizedResponse()
  getById(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.postalConnectionsService.getConnectionById(user.id, id);
  }

  @Put(POSTAL_ROUTES.BY_ID)
  @ApiOperation({ summary: 'Update the API key of an existing connection' })
  @ApiParam({ name: 'id', type: 'integer', description: 'Connection DB id' })
  @ApiBody({
    schema: { type: 'object', properties: { apiKey: { type: 'string' } }, required: ['apiKey'] },
  })
  @ApiOkResponse({ description: 'Key updated, status reset to ACTIVE' })
  @ApiNotFoundResponse({ description: 'CONNECTION_NOT_FOUND' })
  @ApiUnauthorizedResponse()
  async updateKey(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(UpdateConnectionKeySchema)) dto: UpdateConnectionKeyDto,
  ) {
    await this.postalConnectionsService.updateConnectionKey(user.id, id, dto.apiKey);
    return { updated: true };
  }

  @Delete(POSTAL_ROUTES.BY_ID)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a postal connection' })
  @ApiParam({ name: 'id', type: 'integer', description: 'Connection DB id' })
  @ApiNoContentResponse({ description: 'Connection removed' })
  @ApiNotFoundResponse({ description: 'CONNECTION_NOT_FOUND' })
  @ApiUnauthorizedResponse()
  async remove(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.postalConnectionsService.deleteConnection(user.id, id);
  }
}

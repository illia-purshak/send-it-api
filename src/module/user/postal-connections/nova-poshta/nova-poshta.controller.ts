import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Put,
  Query,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard.js';
import { NovaPoshtaService } from './nova-poshta.service.js';
import { NovaPostApiClient } from '../nova-post/nova-post-api.client.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe.js';
import {
  NovaPoshtaKeySchema,
  type NovaPoshtaKeyDto,
} from '../../../../validation/postal-connections/nova-poshta.schema.js';
import {
  NovaPoshtaDivisionsQuerySchema,
  type NovaPoshtaDivisionsQueryDto,
} from '../../../../validation/postal-connections/nova-poshta-divisions.schema.js';
import type { JwtUser } from '../../../../types/auth.types.js';
import { POSTAL_ROUTES } from '../../../../constants/apiRoutes.js';
import { PostalConnectionStatus } from '../../../../../generated/prisma/enums.js';

@ApiTags('Postal Connections')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller(POSTAL_ROUTES.BASE)
export class NovaPoshtaController {
  constructor(
    private readonly novaPoshtaService: NovaPoshtaService,
    private readonly novaPostApiClient: NovaPostApiClient,
    private readonly prisma: PrismaService,
  ) {}

  @Post(POSTAL_ROUTES.NOVA_POSHTA)
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Nova Poshta connected successfully' })
  @ApiConflictResponse({ description: 'CONNECTION_ALREADY_EXISTS — use PUT to update' })
  @ApiForbiddenResponse({ description: 'OPERATOR_LIMIT_REACHED' })
  @ApiUnauthorizedResponse()
  async connect(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(NovaPoshtaKeySchema)) dto: NovaPoshtaKeyDto,
  ) {
    return this.novaPoshtaService.connect(user.id, dto.apiKey);
  }

  @Put(POSTAL_ROUTES.NOVA_POSHTA)
  @ApiOkResponse({ description: 'Key updated, status reset to ACTIVE' })
  @ApiNotFoundResponse({ description: 'CONNECTION_NOT_FOUND — use POST to connect first' })
  @ApiUnauthorizedResponse()
  async updateKey(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(NovaPoshtaKeySchema)) dto: NovaPoshtaKeyDto,
  ) {
    await this.novaPoshtaService.updateKey(user.id, dto.apiKey);
    return { updated: true };
  }

  @Delete(POSTAL_ROUTES.NOVA_POSHTA)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Connection removed' })
  @ApiNotFoundResponse({ description: 'CONNECTION_NOT_FOUND' })
  @ApiUnauthorizedResponse()
  async remove(@CurrentUser() user: JwtUser) {
    await this.novaPoshtaService.removeConnection(user.id);
  }

  @Get(POSTAL_ROUTES.NOVA_POSHTA_DIVISIONS)
  @ApiOkResponse({ description: 'Nova Poshta divisions list' })
  @ApiNotFoundResponse({ description: 'CONNECTION_NOT_FOUND' })
  @ApiUnprocessableEntityResponse({ description: 'CONNECTION_INVALID' })
  @ApiServiceUnavailableResponse({ description: 'OPERATOR_UNAVAILABLE' })
  @ApiUnauthorizedResponse()
  async getDivisions(
    @CurrentUser() user: JwtUser,
    @Query(new ZodValidationPipe(NovaPoshtaDivisionsQuerySchema))
    query: NovaPoshtaDivisionsQueryDto,
  ) {
    const service = await this.prisma.db.postalService.findUnique({
      where: { slug: 'nova-poshta' },
      select: { id: true },
    });
    if (!service) {
      throw new NotFoundException({
        code: 'CONNECTION_NOT_FOUND',
        message: 'No Nova Poshta connection found.',
      });
    }

    const connection = await this.prisma.db.userPostalConnection.findUnique({
      where: { userId_postalServiceId: { userId: user.id, postalServiceId: service.id } },
      select: { status: true, postalServiceId: true },
    });
    if (!connection) {
      throw new NotFoundException({
        code: 'CONNECTION_NOT_FOUND',
        message: 'No Nova Poshta connection found.',
      });
    }

    if (connection.status === PostalConnectionStatus.INVALID) {
      throw new UnprocessableEntityException({
        code: 'CONNECTION_INVALID',
        message: 'Your Nova Poshta connection is no longer valid. Please reconnect.',
      });
    }

    return this.novaPostApiClient.getDivisions(user.id, connection.postalServiceId, {
      countryCodes: query.countryCode ? [query.countryCode] : undefined,
      divisionCategories: query.divisionCategory ? [query.divisionCategory] : undefined,
      settlementIds: query.settlementId ? [query.settlementId] : undefined,
      limit: query.limit,
      page: query.page,
    });
  }
}

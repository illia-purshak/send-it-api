import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Query,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard.js';
import { NovaPostAuthService } from './nova-post-auth.service.js';
import { NovaPostApiClient } from './nova-post-api.client.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe.js';
import type { JwtUser } from '../../../../types/auth.types.js';
import {
  NovaPostRequestKeySchema,
  type NovaPostRequestKeyDto,
} from '../../../../validation/postal-connections/nova-post.schema.js';
import {
  NovaPoshtaDivisionsQuerySchema,
  type NovaPoshtaDivisionsQueryDto,
} from '../../../../validation/postal-connections/nova-poshta-divisions.schema.js';
import { POSTAL_ROUTES } from '../../../../constants/apiRoutes.js';
import { PostalConnectionStatus } from '../../../../../generated/prisma/enums.js';

@ApiTags('Postal Connections')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller()
export class NovaPostAuthController {
  constructor(
    private readonly novaPostAuthService: NovaPostAuthService,
    private readonly novaPostApiClient: NovaPostApiClient,
    private readonly prisma: PrismaService,
  ) {}

  @Post(POSTAL_ROUTES.NOVA_POST_REQUEST_KEY)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request a Nova Post API key via phone number (sandbox)',
    description:
      'Sends the user\'s phone number to Nova Post sandbox to retrieve an API key. ' +
      'Use the returned key with `POST /postal-connections?operator=nova-post`.',
  })
  @ApiOkResponse({ description: 'API key retrieved from Nova Post sandbox', schema: { type: 'object', properties: { apiKey: { type: 'string' } } } })
  @ApiBadRequestResponse({ description: 'Invalid phone number, not registered in EBC, or rate limited' })
  @ApiUnauthorizedResponse()
  async requestKey(
    @Body(new ZodValidationPipe(NovaPostRequestKeySchema)) dto: NovaPostRequestKeyDto,
  ) {
    return this.novaPostAuthService.requestApiKey(dto.phone);
  }

  @Get(POSTAL_ROUTES.NOVA_POST_DIVISIONS)
  @ApiOperation({
    summary: 'List Nova Post divisions (branches)',
    description: 'Returns a paginated list of Nova Post branches. Requires an active Nova Post connection.',
  })
  @ApiQuery({ name: 'countryCode', required: false, type: 'string', example: 'UA', description: 'ISO 3166-1 alpha-2 country code (default: UA)' })
  @ApiQuery({ name: 'divisionCategory', required: false, type: 'string', description: 'Division category filter' })
  @ApiQuery({ name: 'settlementId', required: false, type: 'string', description: 'Filter by settlement ID' })
  @ApiQuery({ name: 'page', required: false, type: 'integer', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: 'integer', example: 20, description: 'Max 100' })
  @ApiOkResponse({ description: 'Paginated list of Nova Post divisions' })
  @ApiNotFoundResponse({ description: 'CONNECTION_NOT_FOUND — Nova Post not connected' })
  @ApiUnprocessableEntityResponse({ description: 'CONNECTION_INVALID — API key is no longer valid' })
  @ApiServiceUnavailableResponse({ description: 'OPERATOR_UNAVAILABLE' })
  @ApiUnauthorizedResponse()
  async getDivisions(
    @CurrentUser() user: JwtUser,
    @Query(new ZodValidationPipe(NovaPoshtaDivisionsQuerySchema))
    query: NovaPoshtaDivisionsQueryDto,
  ) {
    const service = await this.prisma.db.postalService.findUnique({
      where: { slug: 'nova-post' },
      select: { id: true },
    });
    if (!service) {
      throw new NotFoundException({
        code: 'CONNECTION_NOT_FOUND',
        message: 'No Nova Post connection found.',
      });
    }

    const connection = await this.prisma.db.userPostalConnection.findUnique({
      where: { userId_postalServiceId: { userId: user.id, postalServiceId: service.id } },
      select: { status: true, postalServiceId: true },
    });
    if (!connection) {
      throw new NotFoundException({
        code: 'CONNECTION_NOT_FOUND',
        message: 'No Nova Post connection found.',
      });
    }

    if (connection.status === PostalConnectionStatus.INVALID) {
      throw new UnprocessableEntityException({
        code: 'CONNECTION_INVALID',
        message: 'Your Nova Post connection is no longer valid. Please reconnect.',
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

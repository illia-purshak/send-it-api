import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard.js';
import { NovaPostAuthService } from './nova-post-auth.service.js';
import { PostalConnectionsService } from '../postal-connections.service.js';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe.js';
import type { JwtUser } from '../../../../types/auth.types.js';
import {
  NovaPostRequestKeySchema,
  type NovaPostRequestKeyDto,
  NovaPostConnectSchema,
  type NovaPostConnectDto,
} from '../../../../validation/postal-connections/nova-post.schema.js';
import { POSTAL_ROUTES } from '../../../../constants/apiRoutes.js';

@ApiTags('Postal Connections')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller(POSTAL_ROUTES.BASE)
export class NovaPostAuthController {
  constructor(
    private readonly novaPostAuthService: NovaPostAuthService,
    private readonly postalConnectionsService: PostalConnectionsService,
  ) {}

  @Post(`${POSTAL_ROUTES.NOVA_POST_BASE}/${POSTAL_ROUTES.NOVA_POST_REQUEST_KEY}`)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'API key retrieved from Nova Post sandbox' })
  @ApiBadRequestResponse({ description: 'Invalid phone or phone not registered in EBC, or rate limited' })
  @ApiUnauthorizedResponse()
  async requestKey(
    @Body(new ZodValidationPipe(NovaPostRequestKeySchema)) dto: NovaPostRequestKeyDto,
  ) {
    return this.novaPostAuthService.requestApiKey(dto.phone);
  }

  @Post(`${POSTAL_ROUTES.NOVA_POST_BASE}/${POSTAL_ROUTES.NOVA_POST_CONNECT}`)
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Nova Post connected successfully' })
  @ApiBadRequestResponse({ description: 'Invalid API key' })
  @ApiForbiddenResponse({ description: 'Operator limit reached for current plan' })
  @ApiUnauthorizedResponse()
  async connect(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(NovaPostConnectSchema)) dto: NovaPostConnectDto,
  ) {
    await this.postalConnectionsService.checkOperatorLimit(user.id);
    await this.novaPostAuthService.connect(user.id, dto.apiKey);
    return { connected: true };
  }
}

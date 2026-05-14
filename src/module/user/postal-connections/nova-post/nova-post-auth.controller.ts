import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { NovaPostAuthService } from './nova-post-auth.service.js';
import { PostalConnectionsService } from '../postal-connections.service.js';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe.js';
import type { JwtUser } from '../../../../types/auth.types.js';
import {
  NovaPostConnectSchema,
  type NovaPostConnectDto,
} from '../../../../validation/postal-connections/nova-post.schema.js';
import { POSTAL_ROUTES } from '../../../../constants/apiRoutes.js';

@ApiTags('Postal Connections')
@ApiBearerAuth('bearer')
@Controller(POSTAL_ROUTES.BASE)
export class NovaPostAuthController {
  constructor(
    private readonly novaPostAuthService: NovaPostAuthService,
    private readonly postalConnectionsService: PostalConnectionsService,
  ) {}

  @Post(`${POSTAL_ROUTES.NOVA_POST_BASE}/${POSTAL_ROUTES.NOVA_POST_CONNECT}`)
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Nova Post connected successfully' })
  @ApiBadRequestResponse({ description: 'Invalid phone or phone not registered in EBC' })
  @ApiForbiddenResponse({ description: 'Operator limit reached for current plan' })
  @ApiUnauthorizedResponse()
  async connect(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(NovaPostConnectSchema)) dto: NovaPostConnectDto,
  ) {
    await this.postalConnectionsService.checkOperatorLimit(user.id);
    await this.novaPostAuthService.connectNovaPost(user.id, dto.phone);
    return { connected: true };
  }
}

import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { NovaPoshtaService } from './nova-poshta.service.js';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe.js';
import {
  NovaPoshtaKeySchema,
  type NovaPoshtaKeyDto,
} from '../../../../validation/postal-connections/nova-poshta.schema.js';
import type { JwtUser } from '../../../../types/auth.types.js';
import { POSTAL_ROUTES } from '../../../../constants/apiRoutes.js';

@ApiTags('Postal Connections')
@ApiBearerAuth('bearer')
@Controller(POSTAL_ROUTES.BASE)
export class NovaPoshtaController {
  constructor(private readonly novaPoshtaService: NovaPoshtaService) {}

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
    await this.novaPoshtaService.connect(user.id, dto.apiKey);
    return { connected: true };
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
}

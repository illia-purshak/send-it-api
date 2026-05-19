import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  Put,
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
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard.js';
import { UkrposhtaService } from './ukrposhta.service.js';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe.js';
import {
  UkrposhtaKeySchema,
  type UkrposhtaKeyDto,
} from '../../../../validation/postal-connections/ukrposhta.schema.js';
import type { JwtUser } from '../../../../types/auth.types.js';
import { POSTAL_ROUTES } from '../../../../constants/apiRoutes.js';

@ApiTags('Postal Connections')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller(POSTAL_ROUTES.BASE)
export class UkrposhtaController {
  constructor(private readonly ukrposhtaService: UkrposhtaService) {}

  @Post(POSTAL_ROUTES.UKRPOSHTA)
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Ukrposhta connected successfully' })
  @ApiConflictResponse({ description: 'CONNECTION_ALREADY_EXISTS — use PUT to update' })
  @ApiForbiddenResponse({ description: 'OPERATOR_LIMIT_REACHED' })
  @ApiUnauthorizedResponse()
  async connect(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(UkrposhtaKeySchema)) dto: UkrposhtaKeyDto,
  ) {
    return this.ukrposhtaService.connect(user.id, dto.apiKey);
  }

  @Put(POSTAL_ROUTES.UKRPOSHTA)
  @ApiOkResponse({ description: 'Key updated, status reset to ACTIVE' })
  @ApiNotFoundResponse({ description: 'CONNECTION_NOT_FOUND — use POST to connect first' })
  @ApiUnauthorizedResponse()
  async updateKey(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(UkrposhtaKeySchema)) dto: UkrposhtaKeyDto,
  ) {
    await this.ukrposhtaService.updateKey(user.id, dto.apiKey);
    return { updated: true };
  }

  @Delete(POSTAL_ROUTES.UKRPOSHTA)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Connection removed' })
  @ApiNotFoundResponse({ description: 'CONNECTION_NOT_FOUND' })
  @ApiUnauthorizedResponse()
  async remove(@CurrentUser() user: JwtUser) {
    await this.ukrposhtaService.removeConnection(user.id);
  }
}

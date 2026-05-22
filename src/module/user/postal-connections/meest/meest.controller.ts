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
import { MeestService } from './meest.service.js';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe.js';
import {
  MeestKeySchema,
  type MeestKeyDto,
} from '../../../../validation/postal-connections/meest.schema.js';
import type { JwtUser } from '../../../../types/auth.types.js';
import { POSTAL_ROUTES } from '../../../../constants/apiRoutes.js';

@ApiTags('Postal Connections')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller()
export class MeestController {
  constructor(private readonly meestService: MeestService) {}

  @Post(POSTAL_ROUTES.MIST)
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Mist connected successfully' })
  @ApiConflictResponse({ description: 'CONNECTION_ALREADY_EXISTS - use PUT to update' })
  @ApiForbiddenResponse({ description: 'OPERATOR_LIMIT_REACHED' })
  @ApiUnauthorizedResponse()
  async connect(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(MeestKeySchema)) dto: MeestKeyDto,
  ) {
    return this.meestService.connect(user.id, dto.apiKey);
  }

  @Post(POSTAL_ROUTES.MEEST)
  @HttpCode(HttpStatus.CREATED)
  async connectLegacy(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(MeestKeySchema)) dto: MeestKeyDto,
  ) {
    return this.meestService.connect(user.id, dto.apiKey);
  }

  @Put(POSTAL_ROUTES.MIST)
  @ApiOkResponse({ description: 'Key updated, status reset to ACTIVE' })
  @ApiNotFoundResponse({ description: 'CONNECTION_NOT_FOUND - use POST to connect first' })
  @ApiUnauthorizedResponse()
  async updateKey(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(MeestKeySchema)) dto: MeestKeyDto,
  ) {
    await this.meestService.updateKey(user.id, dto.apiKey);
    return { updated: true };
  }

  @Put(POSTAL_ROUTES.MEEST)
  async updateKeyLegacy(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(MeestKeySchema)) dto: MeestKeyDto,
  ) {
    await this.meestService.updateKey(user.id, dto.apiKey);
    return { updated: true };
  }

  @Delete(POSTAL_ROUTES.MIST)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Connection removed' })
  @ApiNotFoundResponse({ description: 'CONNECTION_NOT_FOUND' })
  @ApiUnauthorizedResponse()
  async remove(@CurrentUser() user: JwtUser) {
    await this.meestService.removeConnection(user.id);
  }

  @Delete(POSTAL_ROUTES.MEEST)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeLegacy(@CurrentUser() user: JwtUser) {
    await this.meestService.removeConnection(user.id);
  }
}

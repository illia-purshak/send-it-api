import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { BillingService } from './billing.service.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import {
  SaveCardSchema,
  BillingHistoryQuerySchema,
  type SaveCardDto,
  type BillingHistoryQueryDto,
} from '../../../validation/billing/billing.schema.js';
import type { JwtUser } from '../../../types/auth.types.js';
import { BILLING_ROUTES } from '../../../constants/apiRoutes.js';

@ApiTags('Billing')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller()
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get(BILLING_ROUTES.BASE)
  @ApiOkResponse({ description: 'Paginated billing history' })
  @ApiUnauthorizedResponse()
  getHistory(
    @CurrentUser() user: JwtUser,
    @Query(new ZodValidationPipe(BillingHistoryQuerySchema)) query: BillingHistoryQueryDto,
  ) {
    return this.billingService.getHistory(user.id, query.page, query.limit);
  }

  @Get(BILLING_ROUTES.CARD)
  @ApiOkResponse({ description: 'Saved masked card' })
  @ApiNotFoundResponse({ description: 'No card on file' })
  @ApiUnauthorizedResponse()
  getCard(@CurrentUser() user: JwtUser) {
    return this.billingService.getCard(user.id);
  }

  @Post(BILLING_ROUTES.CARD)
  @ApiCreatedResponse({ description: 'Mock card saved' })
  @ApiConflictResponse({ description: 'Card already exists - use PUT /billing/card to update' })
  @ApiUnauthorizedResponse()
  saveCard(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(SaveCardSchema)) dto: SaveCardDto,
  ) {
    return this.billingService.saveCard(
      user.id,
      dto.cardNumber,
      dto.lastFour,
      dto.expiryMonth,
      dto.expiryYear,
      dto.cardholderName,
    );
  }

  @Put(BILLING_ROUTES.CARD)
  @ApiOkResponse({ description: 'Card updated' })
  @ApiNotFoundResponse({ description: 'No card on file - use POST /billing/card to add one' })
  @ApiUnauthorizedResponse()
  updateCard(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(SaveCardSchema)) dto: SaveCardDto,
  ) {
    return this.billingService.updateCard(
      user.id,
      dto.cardNumber,
      dto.lastFour,
      dto.expiryMonth,
      dto.expiryYear,
      dto.cardholderName,
    );
  }

  @Delete(BILLING_ROUTES.CARD)
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Card removed' })
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  removeCard(@CurrentUser() user: JwtUser) {
    return this.billingService.removeCard(user.id);
  }
}

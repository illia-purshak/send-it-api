import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Param,
  ParseIntPipe,
  HttpCode,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
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
@Controller(BILLING_ROUTES.BASE)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get(BILLING_ROUTES.HISTORY)
  @ApiOkResponse({ description: 'Paginated billing history' })
  @ApiUnauthorizedResponse()
  getHistory(
    @CurrentUser() user: JwtUser,
    @Query(new ZodValidationPipe(BillingHistoryQuerySchema)) query: BillingHistoryQueryDto,
  ) {
    return this.billingService.getHistory(user.id, query.page, query.limit);
  }

  @Post(BILLING_ROUTES.CARD)
  @ApiCreatedResponse({ description: 'Mock card saved' })
  @ApiUnauthorizedResponse()
  saveCard(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(SaveCardSchema)) dto: SaveCardDto,
  ) {
    return this.billingService.saveCard(user.id, dto.lastFour, dto.expiryMonth, dto.expiryYear);
  }

  @Get(BILLING_ROUTES.CARD_BY_ID)
  @ApiOkResponse({ description: 'Card details (last 4 digits only)' })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  getCard(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) cardId: number,
  ) {
    return this.billingService.getCard(user.id, cardId);
  }

  @Delete(BILLING_ROUTES.CARD)
  @HttpCode(200)
  @ApiOkResponse({ description: 'Card removed' })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  removeCard(@CurrentUser() user: JwtUser) {
    return this.billingService.removeCard(user.id);
  }
}

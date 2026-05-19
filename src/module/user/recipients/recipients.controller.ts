import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import { RECIPIENT_ROUTES } from '../../../constants/apiRoutes.js';
import type { JwtUser } from '../../../types/auth.types.js';
import {
  CreateRecipientSchema,
  ListRecipientsQuerySchema,
  UpdateRecipientSchema,
  type CreateRecipientDto,
  type ListRecipientsQueryDto,
  type UpdateRecipientDto,
} from '../../../validation/recipients/recipient.schema.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { RecipientsService } from './recipients.service.js';
import { FeatureGuard } from '../../../common/guards/feature.guard.js';
import { RequireFeature } from '../../../common/decorators/require-feature.decorator.js';

@ApiTags('Recipients')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller(RECIPIENT_ROUTES.BASE)
export class RecipientsController {
  constructor(private readonly recipientsService: RecipientsService) {}

  @Get()
  @ApiOperation({ summary: 'List all recipients with optional filters' })
  @ApiOkResponse({ description: 'Recipient list' })
  @ApiUnauthorizedResponse()
  getRecipients(
    @CurrentUser() user: JwtUser,
    @Query(new ZodValidationPipe(ListRecipientsQuerySchema)) query: ListRecipientsQueryDto,
  ) {
    return this.recipientsService.getRecipients(user.id, query);
  }

  @Get(RECIPIENT_ROUTES.BY_ID)
  @ApiOperation({ summary: 'Get a single recipient by ID' })
  @ApiOkResponse({ description: 'Recipient record' })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  getRecipientById(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.recipientsService.getRecipientById(user.id, id);
  }

  @UseGuards(FeatureGuard)
  @RequireFeature('hasRecipients')
  @Post()
  @ApiOperation({ summary: 'Create a new recipient' })
  @ApiCreatedResponse({ description: 'Recipient created' })
  @ApiUnauthorizedResponse()
  @ApiBadRequestResponse()
  @ApiForbiddenResponse({ description: 'FEATURE_NOT_AVAILABLE — upgrade plan to access recipients' })
  createRecipient(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(CreateRecipientSchema)) dto: CreateRecipientDto,
  ) {
    return this.recipientsService.createRecipient(user.id, dto);
  }

  @Put(RECIPIENT_ROUTES.BY_ID)
  @ApiOperation({ summary: 'Update an existing recipient' })
  @ApiOkResponse({ description: 'Recipient updated' })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  updateRecipient(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(UpdateRecipientSchema)) dto: UpdateRecipientDto,
  ) {
    return this.recipientsService.updateRecipient(user.id, id, dto);
  }

  @Delete(RECIPIENT_ROUTES.BY_ID)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a recipient' })
  @ApiNoContentResponse({ description: 'Recipient deleted' })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  deleteRecipient(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.recipientsService.deleteRecipient(user.id, id);
  }
}

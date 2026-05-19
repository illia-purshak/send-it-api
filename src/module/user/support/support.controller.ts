import {
  Body,
  Controller,
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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import { SUPPORT_ROUTES } from '../../../constants/apiRoutes.js';
import type { JwtUser } from '../../../types/auth.types.js';
import {
  CreateTicketSchema,
  ListTicketsQuerySchema,
  PostMessageSchema,
  type CreateTicketDto,
  type ListTicketsQueryDto,
  type PostMessageDto,
} from '../../../validation/support/support.schema.js';
import { SupportService } from './support.service.js';

@ApiTags('Support')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller(SUPPORT_ROUTES.BASE)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get(SUPPORT_ROUTES.TICKETS)
  @ApiOperation({ summary: 'List support tickets for current user' })
  @ApiOkResponse({ description: 'Ticket list' })
  @ApiUnauthorizedResponse()
  getTickets(
    @CurrentUser() user: JwtUser,
    @Query(new ZodValidationPipe(ListTicketsQuerySchema)) query: ListTicketsQueryDto,
  ) {
    return this.supportService.getTickets(user.id, query);
  }

  @Post(SUPPORT_ROUTES.TICKETS)
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a new support ticket' })
  @ApiCreatedResponse({ description: 'Ticket created' })
  @ApiForbiddenResponse({ description: 'TICKET_LIMIT_REACHED' })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  createTicket(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(CreateTicketSchema)) dto: CreateTicketDto,
  ) {
    return this.supportService.createTicket(user.id, dto);
  }

  @Get(SUPPORT_ROUTES.TICKET_BY_ID)
  @ApiOperation({ summary: 'Get support ticket detail with all messages' })
  @ApiOkResponse({ description: 'Ticket detail' })
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  getTicketById(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: number) {
    return this.supportService.getTicketById(user.id, id);
  }

  @Put(SUPPORT_ROUTES.TICKET_MESSAGE)
  @ApiOperation({ summary: 'Send a message (reopens ticket if CLOSED)' })
  @ApiOkResponse({ description: 'Message created' })
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  postMessage(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(PostMessageSchema)) dto: PostMessageDto,
  ) {
    return this.supportService.postMessage(user.id, id, dto);
  }

  @Put(SUPPORT_ROUTES.TICKET_READ)
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark ticket as read up to now' })
  @ApiOkResponse({ description: 'Read status updated' })
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  markRead(@CurrentUser() user: JwtUser, @Param('id', ParseIntPipe) id: number) {
    return this.supportService.markRead(user.id, id);
  }
}

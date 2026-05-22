import {
  Body,
  Controller,
  Get,
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
import { AdminJwtAuthGuard } from '../../../common/guards/admin-jwt-auth.guard.js';
import { CurrentAdmin } from '../../../common/decorators/current-admin.decorator.js';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import { ADMIN_SUPPORT_ROUTES } from '../../../constants/apiRoutes.js';
import type { AdminJwtUser } from '../../../types/admin-auth.types.js';
import {
  AdminListTicketsQuerySchema,
  AdminListMyTicketsQuerySchema,
  AdminTicketActionSchema,
  AdminPostMessageSchema,
  type AdminListTicketsQueryDto,
  type AdminListMyTicketsQueryDto,
  type AdminTicketActionDto,
  type AdminPostMessageDto,
} from '../../../validation/admin/admin-support.schema.js';
import { AdminSupportService } from './admin-support.service.js';

@ApiTags('Admin — Support')
@ApiBearerAuth('bearer')
@UseGuards(AdminJwtAuthGuard)
@Controller()
export class AdminSupportController {
  constructor(private readonly adminSupportService: AdminSupportService) {}

  // Static route must come before dynamic tickets/:id
  @Get(ADMIN_SUPPORT_ROUTES.TICKETS_MY)
  @ApiOperation({ summary: 'List tickets assigned to current admin' })
  @ApiOkResponse({ description: 'My tickets list' })
  @ApiUnauthorizedResponse()
  getMyTickets(
    @CurrentAdmin() admin: AdminJwtUser,
    @Query(new ZodValidationPipe(AdminListMyTicketsQuerySchema)) query: AdminListMyTicketsQueryDto,
  ) {
    return this.adminSupportService.getMyTickets(admin.id, query);
  }

  @Get(ADMIN_SUPPORT_ROUTES.TICKETS)
  @ApiOperation({ summary: 'Paginated list of all support tickets' })
  @ApiOkResponse({ description: 'Tickets list' })
  @ApiUnauthorizedResponse()
  getTickets(
    @Query(new ZodValidationPipe(AdminListTicketsQuerySchema)) query: AdminListTicketsQueryDto,
  ) {
    return this.adminSupportService.getTickets(query);
  }

  @Get(ADMIN_SUPPORT_ROUTES.TICKET_BY_ID)
  @ApiOperation({ summary: 'Fetch full ticket with all messages' })
  @ApiOkResponse({ description: 'Ticket detail' })
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  getTicketById(@CurrentAdmin() admin: AdminJwtUser, @Param('id', ParseIntPipe) id: number) {
    return this.adminSupportService.getTicketById(admin.id, id);
  }

  @Put(ADMIN_SUPPORT_ROUTES.TICKET_BY_ID)
  @ApiOperation({ summary: 'Assign, leave, or close a ticket' })
  @ApiOkResponse({ description: 'Action performed' })
  @ApiForbiddenResponse({ description: 'Can only assign WAITING tickets | Cannot leave CLOSED | Already closed' })
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  performAction(
    @CurrentAdmin() admin: AdminJwtUser,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(AdminTicketActionSchema)) dto: AdminTicketActionDto,
  ) {
    return this.adminSupportService.performAction(admin.id, id, dto);
  }

  @Post(ADMIN_SUPPORT_ROUTES.TICKET_MESSAGE)
  @ApiOperation({ summary: 'Send a message in a support ticket (assigned admin only)' })
  @ApiCreatedResponse({ description: 'Message created' })
  @ApiForbiddenResponse({ description: 'TICKET_CLOSED | NOT_ASSIGNED' })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  postMessage(
    @CurrentAdmin() admin: AdminJwtUser,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(AdminPostMessageSchema)) dto: AdminPostMessageDto,
  ) {
    return this.adminSupportService.postMessage(admin.id, id, dto);
  }

  @Put(ADMIN_SUPPORT_ROUTES.TICKET_READ)
  @ApiOperation({ summary: 'Mark ticket as read up to now' })
  @ApiOkResponse({ description: 'Read status updated' })
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  markRead(@CurrentAdmin() admin: AdminJwtUser, @Param('id', ParseIntPipe) id: number) {
    return this.adminSupportService.markRead(admin.id, id);
  }
}

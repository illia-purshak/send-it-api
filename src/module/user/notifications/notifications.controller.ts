import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import { NOTIFICATION_ROUTES } from '../../../constants/apiRoutes.js';
import type { JwtUser } from '../../../types/auth.types.js';
import {
  BulkDeleteNotificationsQuerySchema,
  ListNotificationsQuerySchema,
  type BulkDeleteNotificationsQueryDto,
  type ListNotificationsQueryDto,
} from '../../../validation/notifications/notification.schema.js';
import { NotificationsService } from './notifications.service.js';

@ApiTags('Notifications')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get(NOTIFICATION_ROUTES.BASE)
  @ApiOperation({ summary: 'Fetch notifications for the current user' })
  @ApiOkResponse({ description: 'Notifications list' })
  @ApiUnauthorizedResponse()
  getNotifications(
    @CurrentUser() user: JwtUser,
    @Query(new ZodValidationPipe(ListNotificationsQuerySchema)) query: ListNotificationsQueryDto,
  ) {
    return this.notificationsService.getNotifications(user.id, query);
  }

  @Get(NOTIFICATION_ROUTES.UNREAD_COUNT)
  @ApiOperation({ summary: 'Get count of unread notifications (used for header badge)' })
  @ApiOkResponse({ description: 'Unread count' })
  @ApiUnauthorizedResponse()
  getUnreadCount(@CurrentUser() user: JwtUser) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Put(NOTIFICATION_ROUTES.BY_ID)
  @ApiOperation({ summary: 'Mark a single notification as read' })
  @ApiOkResponse({ description: 'Notification updated' })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  markAsRead(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notificationsService.markAsRead(user.id, id);
  }

  @Put(NOTIFICATION_ROUTES.BASE)
  @ApiOperation({ summary: 'Mark all unread notifications as read' })
  @ApiOkResponse({ description: 'Number of updated notifications' })
  @ApiUnauthorizedResponse()
  markAllAsRead(@CurrentUser() user: JwtUser) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Delete(NOTIFICATION_ROUTES.BY_ID)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a single notification' })
  @ApiNoContentResponse({ description: 'Notification deleted' })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  deleteOne(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notificationsService.deleteOne(user.id, id);
  }

  @Delete(NOTIFICATION_ROUTES.BASE)
  @HttpCode(204)
  @ApiOperation({ summary: 'Bulk delete notifications — all or read-only (filter=read)' })
  @ApiNoContentResponse({ description: 'Notifications deleted' })
  @ApiUnauthorizedResponse()
  deleteBulk(
    @CurrentUser() user: JwtUser,
    @Query(new ZodValidationPipe(BulkDeleteNotificationsQuerySchema)) query: BulkDeleteNotificationsQueryDto,
  ) {
    return this.notificationsService.deleteBulk(user.id, query);
  }
}

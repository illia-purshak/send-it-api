import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { PostalConnectionsService } from './postal-connections.service.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { JwtUser } from '../../../types/auth.types.js';
import { POSTAL_ROUTES } from '../../../constants/apiRoutes.js';

@ApiTags('Postal Connections')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller()
export class PostalConnectionsController {
  constructor(private readonly postalConnectionsService: PostalConnectionsService) {}

  @Get(POSTAL_ROUTES.BASE)
  @ApiOkResponse({ description: 'All connections for the current user (all statuses)' })
  @ApiUnauthorizedResponse()
  getAll(@CurrentUser() user: JwtUser) {
    return this.postalConnectionsService.getConnectionsForUser(user.id);
  }
}

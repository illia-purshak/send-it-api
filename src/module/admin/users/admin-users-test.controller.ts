import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator.js';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import { ADMIN_USERS_ROUTES } from '../../../constants/apiRoutes.js';
import {
  AdminTestListUsersQuerySchema,
  type AdminTestListUsersQueryDto,
} from '../../../validation/admin/admin-users.schema.js';
import { AdminUsersService } from './admin-users.service.js';

@ApiTags('Admin - Users Test')
@Controller(`${ADMIN_USERS_ROUTES.BASE}/test`)
export class AdminUsersTestController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Test endpoint for paginated users list without auth, filters, or sorting' })
  @ApiOkResponse({ description: 'User list' })
  getAllForTest(
    @Query(new ZodValidationPipe(AdminTestListUsersQuerySchema))
    query: AdminTestListUsersQueryDto,
  ) {
    return this.adminUsersService.getAllForTest(query);
  }
}

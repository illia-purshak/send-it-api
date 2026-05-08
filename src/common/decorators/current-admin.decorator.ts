import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AdminJwtUser } from '../../types/admin-auth.types.js';

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AdminJwtUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

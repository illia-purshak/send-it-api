import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service.js';

@Controller('admin/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
}

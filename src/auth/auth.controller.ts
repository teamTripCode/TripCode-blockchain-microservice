import { Controller, Post, Body, UseGuards, Request, Delete } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  async login(@Body() body: { publicKey: string }) {
    const { publicKey } = body;
    return await this.authService.validateUser(publicKey);
  }

  @Post('generate-api-key')
  @UseGuards(JwtAuthGuard)
  generateApiKey(
    @Request() req,
    @Body('description') description?: string,
    @Body('expiresAt') expiresAt?: Date,
    @Body('permissions') permissions?: string[],
  ) {
    const publicKey = req.user.publicKey;
    return this.authService.generateApiKey(publicKey, description, expiresAt, permissions);
  }

  @Delete('remove-api-key')
  @UseGuards(JwtAuthGuard)
  removeApiKey(@Request() req, @Body('apiKey') apiKey: string) {
    const publicKey = req.user.publicKey;
    return this.authService.removeApiKey(publicKey, apiKey);
  }

  @Post('deactivate-api-key')
  @UseGuards(JwtAuthGuard)
  deactivateApiKey(@Request() req, @Body('apiKey') apiKey: string) {
    const publicKey = req.user.publicKey;
    return this.authService.deactivateApiKey(publicKey, apiKey);
  }
}
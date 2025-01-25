import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private readonly authService: AuthService) {
        super();
    }

    canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();
        const apiKey = request.headers['x-api-key']; // Obtener la API Key del header

        // Si se proporciona una API Key, validarla
        if (apiKey) {
            const publicKey = this.authService.validateApiKey(apiKey);
            if (publicKey) {
                request.user = { publicKey };
                return true;
            }
            return false;
        }

        // Si no hay API Key, usar JWT
        return super.canActivate(context);
    }
}
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AccountService } from 'src/account/account.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly accountService: AccountService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.SECRET_KEY_TOKENS,
        });
    }

    async validate(payload: any) {
        console.log('Payload del token:', payload); // Depuración
        const user = await this.accountService.getAccount(payload.publicKey);
        if (!user) {
            console.error('Usuario no encontrado para la publicKey:', payload.publicKey); // Depuración
            throw new Error('Usuario no autorizado');
        }

        return { publicKey: payload.publicKey }
    }
}
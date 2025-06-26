import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from 'src/common/decorators/public.decorator';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();

    const rawToken = this.extractTokenFromHeader(request);

    if (!rawToken) {
      if (isPublic) return true;
      throw new UnauthorizedException('token not provided');
    }

    try {
      const token = this.jwtService.verify(rawToken, {
        secret: process.env.JWT_SECRET,
      });
      const user = await this.prisma.user.findUnique({
        where: { id: token.userId },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid Token');
      }
      const { password, ...userWithoutPassword } = user;
      request['user'] = userWithoutPassword;
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        throw new UnauthorizedException('token has expired');
      } else {
        throw new UnauthorizedException(err.message);
      }
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

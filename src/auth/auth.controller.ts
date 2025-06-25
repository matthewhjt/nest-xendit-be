import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ResponseUtil } from 'src/common/utils/response.util';
import { Public } from 'src/common/decorators/public.decorator';
import { LoginDTO } from './dto/login.dto';
import { RegisterDTO } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly responseUtil: ResponseUtil
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDTO) {
    const loginResponse = await this.authService.login(loginDto);
    return this.responseUtil.response(
      {
        message: 'Success Login',
        statusCode: 200,
      },
      {
        data: {
          accessToken: loginResponse.accessToken,
          refreshToken: loginResponse.refreshToken,
        },
      }
    );
  }

  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDTO) {
    await this.authService.register(registerDto);
    return this.responseUtil.response({
      message: 'User registered successfully',
      statusCode: 201,
    });
  }
}

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { ResponseUtil } from 'src/common/utils/response.util';
import { GetUser } from 'src/common/decorators/getUser.decorator';
import { User } from 'generated/prisma';
import { SubscribeDTO } from './dto/subscribe.dto';
import { InvoiceCallback } from 'xendit-node/invoice/models';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('payments')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly responseUtil: ResponseUtil
  ) {}

  @Public()
  @Get('packages')
  @HttpCode(HttpStatus.OK)
  async getSubscriptionPackages() {
    const packages = await this.paymentService.getSubscriptionPackages();
    return this.responseUtil.response(
      {
        message: 'Subscription Packages Retrieved Successfully',
        statusCode: 200,
      },
      {
        data: packages,
      }
    );
  }

  @Get('history')
  @HttpCode(HttpStatus.OK)
  async getSubscriptionHistory(@GetUser() user: User) {
    const history = await this.paymentService.getSubscriptionHistory(user.id);
    return this.responseUtil.response(
      {
        message: 'Subscription History Retrieved Successfully',
        statusCode: 200,
      },
      {
        data: history,
      }
    );
  }

  @Post('subscribe')
  async subscribePackage(
    @GetUser() user: User,
    @Body() subscribeDTO: SubscribeDTO
  ) {
    const invoice = await this.paymentService.subscribePackage(
      subscribeDTO,
      user.id
    );
    return this.responseUtil.response(
      {
        message: 'Subscription Package Invoice Created Successfully',
        statusCode: 201,
      },
      {
        data: invoice,
      }
    );
  }

  @Public()
  @Post('xendit/webhook')
  @HttpCode(HttpStatus.OK)
  async xenditWebhook(@Body() data: InvoiceCallback) {
    const response = await this.paymentService.handleInvoiceCallback(data);
    return this.responseUtil.response(
      {
        message: 'Xendit Webhook Processed Successfully',
        statusCode: 200,
      },
      {
        data: response,
      }
    );
  }
}

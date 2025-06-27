import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PAYMENT_LIST } from 'src/common/constants/payment-list';
import { PrismaService } from 'src/prisma/prisma.service';
import Xendit from 'xendit-node';
import { CreateInvoiceRequest } from 'xendit-node/invoice/models';
import { SubscribeDTO } from './dto/subscribe.dto';
import { randomUUID } from 'crypto';
import {
  PaymentStatus,
  SubscriptionStatus,
  PaymentMethod,
} from 'generated/prisma';

@Injectable()
export class PaymentService {
  private readonly xendit: Xendit;
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService
  ) {
    const secretKey = this.configService.get<string>('XENDIT_API_KEY');

    if (!secretKey) {
      throw new Error('XENDIT_API_KEY is required');
    }

    this.xendit = new Xendit({
      secretKey: secretKey,
    });
  }

  async getSubscriptionPackages() {
    const packages = await this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
    return packages;
  }

  async subscribePackage(data: SubscribeDTO, userId: string) {
    return await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const subscriptionPackage = await tx.subscriptionPlan.findUnique({
        where: { id: data.packageId },
      });

      if (!subscriptionPackage) {
        throw new NotFoundException('Subscription package not found');
      }

      if (!PAYMENT_LIST.includes(data.paymentMethod)) {
        throw new BadRequestException('Payment method not supported');
      }

      const paymentId = randomUUID();

      const invoiceData: CreateInvoiceRequest = {
        externalId: paymentId,
        amount: subscriptionPackage.price.toNumber(),
        currency: 'IDR',
        description: `Subscription to package ${subscriptionPackage.name}`,
        invoiceDuration: 60 * 60 * 24,
        payerEmail: user.email,
        paymentMethods: [data.paymentMethod],
        shouldSendEmail: true,
        reminderTime: 1,
        reminderTimeUnit: 'days',
        failureRedirectUrl: this.configService.get<string>(
          'XENDIT_FAILURE_REDIRECT_URL'
        ),
        successRedirectUrl: this.configService.get<string>(
          'XENDIT_SUCCESS_REDIRECT_URL'
        ),
      };

      try {
        const invoice = await this.xendit.Invoice.createInvoice({
          data: invoiceData,
        });

        await tx.payment.create({
          data: {
            id: paymentId,
            userId: user.id,
            planId: subscriptionPackage.id,
            xenditExternalId: invoice.externalId,
            xenditInvoiceId: null,
            amount: subscriptionPackage.price.toNumber(),
            paymentMethod: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            expiresAt: invoice.expiryDate ? new Date(invoice.expiryDate) : null,
            paymentUrl: invoice.invoiceUrl,
          },
        });

        return {
          invoiceId: invoice.id,
          externalId: invoice.externalId,
          status: invoice.status,
          amount: invoice.amount,
          currency: invoice.currency,
          paymentUrl: invoice.invoiceUrl,
          expiresAt: invoice.expiryDate ? new Date(invoice.expiryDate) : null,
        };
      } catch (error) {
        Logger.error('PaymentService subscribePackage error:', error);
        throw new Error(`Failed to create invoice: ${error.message}`);
      }
    });
  }

  async handleInvoiceCallback(callbackData: any) {
    return await this.prisma.$transaction(async (tx) => {
      Logger.log(
        'Processing invoice callback:',
        JSON.stringify(callbackData, null, 2)
      );

      const payment = await tx.payment.findUnique({
        where: {
          id: callbackData.external_id,
        },
        include: {
          user: true,
          subscriptionPlan: true,
        },
      });

      if (!payment) {
        Logger.error(
          `Payment not found for external_id: ${callbackData.externalId}`
        );
        throw new NotFoundException(
          `Payment not found for external_id: ${callbackData.externalId}`
        );
      }

      let updatedPayment;

      switch (callbackData.status) {
        case 'PAID':
        case 'SETTLED': {
          const updatedDate = new Date();
          updatedPayment = tx.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.PAID,
              updatedAt: updatedDate,
              paidAt: updatedDate,
              paymentMethod: callbackData.paymentMethod as PaymentMethod,
            },
          });

          const existingSubscription = await tx.subscription.findFirst({
            where: {
              userId: payment.userId,
              status: SubscriptionStatus.ACTIVE,
            },
            orderBy: { endDate: 'desc' },
          });

          let newStartDate = new Date();
          let newEndDate = new Date(
            newStartDate.getTime() +
              payment.subscriptionPlan.durationDays * 24 * 60 * 60 * 1000
          );

          if (existingSubscription) {
            newStartDate = existingSubscription.endDate;
            newEndDate = new Date(
              newStartDate.getTime() +
                payment.subscriptionPlan.durationDays * 24 * 60 * 60 * 1000
            );
          }

          const subscription = tx.subscription.create({
            data: {
              userId: payment.userId,
              startDate: newStartDate,
              endDate: newEndDate,
              planId: payment.subscriptionPlan.id,
              status: SubscriptionStatus.ACTIVE,
              paymentId: payment.id,
            },
          });

          Logger.log(
            `Payment ${payment.id} marked as PAID and subscription ${(await subscription).id} activated`
          );
          break;
        }

        case 'EXPIRED':
          updatedPayment = tx.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.EXPIRED,
              updatedAt: new Date(),
            },
          });
          Logger.log(`Payment ${payment.id} marked as EXPIRED`);
          break;

        default:
          updatedPayment = tx.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.PENDING,
              updatedAt: new Date(),
            },
          });
          Logger.log(
            `Payment ${payment.id} status updated to ${callbackData.status}`
          );
      }

      return updatedPayment;
    });
  }

  async getSubscriptionHistory(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const payments = await this.prisma.payment.findMany({
      where: { userId: user.id },
      include: {
        subscriptionPlan: true,
        subscription: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const mappedPayments = payments.map((payment) => ({
      ...payment,
      paymentUrl:
        payment.status === PaymentStatus.PAID ||
        payment.status === PaymentStatus.EXPIRED
          ? null
          : payment.paymentUrl,
    }));

    return mappedPayments;
  }
}

import { IsString, IsUUID } from 'class-validator';

export class SubscribeDTO {
  @IsUUID()
  packageId: string;

  @IsString()
  paymentMethod: string;
}

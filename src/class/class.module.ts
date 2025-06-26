import { Module } from '@nestjs/common';
import { ClassService } from './class.service';
import { ClassController } from './class.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  providers: [ClassService],
  controllers: [ClassController],
  imports: [AuthModule],
})
export class ClassModule {}

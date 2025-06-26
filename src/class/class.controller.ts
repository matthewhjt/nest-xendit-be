import { Controller, Get, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { ClassService } from './class.service';
import { ResponseUtil } from 'src/common/utils/response.util';
import { Public } from 'src/common/decorators/public.decorator';
import { GetUser } from 'src/common/decorators/getUser.decorator';
import { User } from 'generated/prisma';

@Controller('class')
export class ClassController {
  constructor(
    private readonly classService: ClassService,
    private readonly responseUtil: ResponseUtil
  ) {}

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  async getClasses() {
    const classes = await this.classService.getAllClasses();
    return this.responseUtil.response(
      {
        message: 'Class Data Retrieved Successfully',
        statusCode: 200,
      },
      {
        data: classes,
      }
    );
  }

  @Public()
  @Get(':classId')
  @HttpCode(HttpStatus.OK)
  async getClassDetails(
    @GetUser() user: User,
    @Param('classId') classId: string
  ) {
    const classDetails = await this.classService.getClassChaptersById(
      classId,
      user
    );
    return this.responseUtil.response(
      {
        message: 'Class Details Retrieved Successfully',
        statusCode: 200,
      },
      {
        data: classDetails,
      }
    );
  }
}

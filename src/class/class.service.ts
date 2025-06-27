import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from 'generated/prisma';
import { AuthService } from 'src/auth/auth.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ClassService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService
  ) {}

  async getAllClasses() {
    return this.prisma.class.findMany();
  }

  async getClassDetailsById(classId: string, user: User) {
    let isSubscribed = false;
    if (user) {
      isSubscribed = await this.authService.isSubscribed(user.id);
    }
    const classDetails = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        chapters: {
          include: {
            subchapters: true,
          },
        },
      },
    });

    if (!classDetails) {
      throw new NotFoundException(`Class with ID ${classId} not found`);
    }

    if (!isSubscribed) {
      return {
        ...classDetails,
        chapters: classDetails.chapters.map((chapter) => ({
          ...chapter,
          subchapters: chapter.subchapters.map((subchapter) => ({
            ...subchapter,
            content: subchapter.isFree ? subchapter.content : null,
          })),
        })),
      };
    }

    return classDetails;
  }

  async getClassChaptersById(classId: string, user: User) {
    let isSubscribed = false;
    if (user) {
      isSubscribed = await this.authService.isSubscribed(user.id);
    }

    const chapters = await this.prisma.chapter.findMany({
      where: { classId },
      include: {
        class: true,
        subchapters: true,
      },
    });

    if (!isSubscribed) {
      return chapters.map((chapter) => ({
        ...chapter,
        subchapters: chapter.subchapters.map((subchapter) => ({
          ...subchapter,
          content: subchapter.isFree ? subchapter.content : null,
        })),
      }));
    }

    return chapters;
  }
}

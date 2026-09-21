import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { AdminAuth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalAuth, Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import {
  CreateReviewDto,
  QueryAdminReviewsDto,
  QueryReviewsDto,
  UpdateReviewStatusDto,
} from './dto/review.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Approved reviews, optionally for one product' })
  findPublic(@Query() query: QueryReviewsDto) {
    return this.reviewsService.findPublic(query);
  }

  @AdminAuth()
  @ApiBearerAuth()
  @Get('admin/all')
  @ApiOperation({ summary: 'Moderation queue with every review status' })
  findAllForAdmin(@Query() query: QueryAdminReviewsDto) {
    return this.reviewsService.findAllForAdmin(query);
  }

  @Public()
  @OptionalAuth()
  @Post()
  @ApiOperation({ summary: 'Submit a review (enters the moderation queue)' })
  create(@Body() dto: CreateReviewDto, @CurrentUser() user?: AuthUser) {
    return this.reviewsService.create(dto, user?.id);
  }

  @AdminAuth()
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.STAFF)
  @ApiBearerAuth()
  @Patch(':id/status')
  @ApiOperation({ summary: 'Approve or reject a review' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateReviewStatusDto) {
    return this.reviewsService.updateStatus(id, dto.status);
  }

  @AdminAuth()
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a review' })
  remove(@Param('id') id: string) {
    return this.reviewsService.remove(id);
  }
}

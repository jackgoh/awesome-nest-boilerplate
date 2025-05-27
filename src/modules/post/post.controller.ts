import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { type PageDto } from '../../common/dto/page.dto';
import { RoleType } from '../../constants';
import { ApiPageOkResponse, Auth, AuthUser, UUIDParam } from '../../decorators';
import { UserEntity } from '../user/user.entity';
import { CreatePostDto } from './dtos/create-post.dto';
import { PostDto } from './dtos/post.dto';
import { PostPageOptionsDto } from './dtos/post-page-options.dto';
import { UpdatePostDto } from './dtos/update-post.dto';
import { PostNotFoundException } from './exceptions/post-not-found.exception';
import { PostService } from './post.service';

@Controller('posts')
@ApiTags('posts')
export class PostController {
  constructor(private postService: PostService) {}

  @Post()
  @Auth([RoleType.USER])
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: PostDto })
  async createPost(
    @Body() createPostDto: CreatePostDto,
    @AuthUser() user: UserEntity,
  ) {
    const postEntity = await this.postService.createPost(
      user.id,
      createPostDto,
    );

    return postEntity.toDto();
  }

  @Get()
  @Auth([RoleType.USER])
  @ApiPageOkResponse({ type: PostDto })
  async getPosts(
    @Query() postsPageOptionsDto: PostPageOptionsDto,
  ): Promise<PageDto<PostDto>> {
    return this.postService.paginate(postsPageOptionsDto);
  }

  @Get(':id')
  @Auth([])
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: PostDto })
  async getSinglePost(@UUIDParam('id') id: Uuid): Promise<PostDto> {
    const entity = await this.postService.findOneOrThrowException(
      {
        findData: {
          id,
        },
      },
      new PostNotFoundException(),
    );

    return entity.toDto();
  }

  @Put(':id')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiAcceptedResponse()
  async updatePost(
    @UUIDParam('id') id: Uuid,
    @Body() updatePostDto: UpdatePostDto,
  ): Promise<PostDto> {
    const foundPost = await this.postService.findOneOrThrowException(
      {
        findData: {
          id,
        },
      },
      new PostNotFoundException(),
    );

    const savedData = await this.postService.updatePost(
      foundPost,
      updatePostDto,
    );

    return savedData.toDto();
  }

  @Delete(':id')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiAcceptedResponse()
  async deletePost(@UUIDParam('id') id: Uuid): Promise<void> {
    await this.postService.findOneOrThrowException(
      {
        findData: {
          id,
        },
      },
      new PostNotFoundException(),
    );

    await this.postService.delete({ id });
  }
}

import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';

import { AbstractService } from '../../common/abstract.service';
import { assignDefined } from '../../common/utils';
import { CreatePostCommand } from './commands/create-post.command';
import { CreatePostDto } from './dtos/create-post.dto';
import { PostEntity } from './post.entity';

@Injectable()
export class PostService extends AbstractService<PostEntity> {
  constructor(
    @InjectRepository(PostEntity)
    private postRepository: Repository<PostEntity>,
    private commandBus: CommandBus,
  ) {
    super(postRepository);
  }

  @Transactional()
  createPost(userId: Uuid, createPostDto: CreatePostDto): Promise<PostEntity> {
    return this.commandBus.execute<CreatePostCommand, PostEntity>(
      new CreatePostCommand(userId, createPostDto),
    );
  }

  async updatePost(
    entity: PostEntity,
    updatePostDto: Partial<PostEntity>,
  ): Promise<PostEntity> {
    assignDefined(entity, updatePostDto);

    return this.postRepository.save(entity);
  }
}

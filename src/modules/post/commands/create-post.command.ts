import {
  CommandHandler,
  type ICommand,
  type ICommandHandler,
} from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { type CreatePostDto } from '../dtos/create-post.dto';
import { PostEntity } from '../post.entity';

export class CreatePostCommand implements ICommand {
  constructor(
    public readonly userId: Uuid,
    public readonly createPostDto: CreatePostDto,
  ) {}
}

@CommandHandler(CreatePostCommand)
export class CreatePostHandler implements ICommandHandler<
  CreatePostCommand,
  PostEntity
> {
  constructor(
    @InjectRepository(PostEntity)
    private postRepository: Repository<PostEntity>,
  ) {}

  async execute(command: CreatePostCommand) {
    const { userId, createPostDto } = command;
    const postEntity = this.postRepository.create({ userId, ...createPostDto });

    await this.postRepository.save(postEntity);

    return postEntity;
  }
}

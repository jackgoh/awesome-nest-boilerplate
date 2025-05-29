import { RoleType } from '@/constants';
import { Auth } from '@/decorators';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateTokenDto } from './dtos/create-token.dto';
import { TokenDto } from './dtos/token.dto';
import { UpdateTokenDto } from './dtos/update-token.dto';
import { TokenService } from './token.service';

@Controller('token')
@ApiTags('token')
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  @Post()
  @Auth([RoleType.ADMIN])
  async create(@Body() createTokenDto: CreateTokenDto): Promise<TokenDto> {
    const token = await this.tokenService.create(createTokenDto);

    return token.toDto();
  }

  @Get()
  @Auth([RoleType.USER, RoleType.ADMIN])
  findAll() {
    return this.tokenService.findAll();
  }

  @Patch(':id')
  @Auth([RoleType.ADMIN])
  async update(@Param('id') id: Uuid, @Body() updateTokenDto: UpdateTokenDto) {
    return await this.tokenService.update(id, updateTokenDto);
  }

  @Delete(':id')
  @Auth([RoleType.ADMIN])
  remove(@Param('id') id: Uuid) {
    return this.tokenService.remove(id);
  }
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({
    description: 'The name of the role',
    example: 'Administrator',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    description: 'A brief description of the role',
    example: 'Has full system access',
  })
  @IsString()
  @IsOptional()
  description?: string;
}

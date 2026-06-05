import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto, UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '@/decorator/customize';
import { UserRole } from '@/enum/user.enum';
import { JwtAuthGuard } from '@/auth/guard/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  findAll(
    @Query() query: string,
    @Query('current') current: string,
    @Query('pageSize') pageSize: string,
  ) {
    return this.usersService.findAll(query, +current, +pageSize);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Get('profile/me')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  getProfile(@Request() req) {
    const userId = req.user._id;
    return this.usersService.findOneById(userId);
  }

  @Patch('profile/me')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    const userId = req.user._id;
    return this.usersService.updateProfile(userId, dto);
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { Response } from 'express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { config } from '../../config';
import Authorization from '../../decorators/Authorization.decorator';
import { ChatMember } from '../../entities/ChatMember.entity';
import { User } from '../../entities/User.entity';
import AuthGuard from '../../guards/AuthGuard.guard';
import { EditUserDto } from '../../pipes/validation/EditUserDto.dto';
import { PasswordChangeDto } from '../../pipes/validation/PasswordChangeDto.dto';
import { PasswordResetConfirmDto } from '../../pipes/validation/PasswordResetConfirmDto.dto';
import { PasswordResetDto } from '../../pipes/validation/PasswordResetDto.dto';
import { RegisterUserDto } from '../../pipes/validation/RegisterUserDto.dto';
import { RegisterVerifyDto } from '../../pipes/validation/RegisterVerifyDto.dto';
import { TokenPayload } from '../Auth/Jwt/Jwt.interface';
import { JwtService } from '../Auth/Jwt/Jwt.service';
import { UserPreview } from './User.interface';
import { UserService } from './User.service';

const uploadConfig: MulterOptions = {
  fileFilter: (req: any, file: any, callback: any) => {
    let rejected: boolean = false;
    const contentLength: number = parseInt(req.headers['content-length'] || '');
    if (contentLength > config.avatarSize) {
      callback(new BadRequestException(`Maximum File Size Is ${config.avatarSize} Bytes`), false);
      rejected = true;
    }
    if (!file.originalname.endsWith(config.avatarType)) {
      callback(new BadRequestException('File Has To Be Of Type JPEG'), false);
      rejected = true;
    }
    if (!rejected) callback(null, true);
  },
  storage: diskStorage({
    destination: './data/avatar/user',
    filename: (req, file, callback) => {
      const payload: TokenPayload | undefined = JwtService.DecodeToken(
        req.headers.authorization || ''
      );
      if (!payload) callback(new BadRequestException('Invalid Token'), '');
      //this should never happen because the AuthGuard gets executed before the interceptor but safety first
      else {
        const filename: string = payload.user;
        const extension: string = path.parse(file.originalname).ext;
        callback(null, `${filename}${extension}`);
      }
    },
  }),
  limits: {
    fileSize: config.avatarSize,
  },
};

/**
 * User route to create, verify, modify and delete users
 */

@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  /**
   * Route to register new user
   *
   * @param user request body of type IPendingUser
   *
   * @returns Promise<void>
   */

  @Post('register')
  async register(@Body() user: RegisterUserDto): Promise<void> {
    try {
      await this.userService.handleRegister(user);
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Route to validate a registration token
   *
   * @param token registration token
   *
   * @returns Promise<boolean>
   */

  @Get('register/validate/:token')
  async validate(@Param('token') token: string): Promise<boolean> {
    try {
      return await this.userService.handleValidate(token);
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Route to verify a pending user
   *
   * @param body request body
   *
   * @returns Promise<void>
   */

  @Post('register/verify')
  async verify(@Body() body: RegisterVerifyDto): Promise<void> {
    try {
      await this.userService.handleVerify(body);
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Route to check whether a given tag exists
   *
   * @param tag tag to be checked
   *
   * @returns Promise<boolean>
   */

  @Get('check/tag/:tag')
  async checkTag(@Param('tag') tag: string): Promise<boolean> {
    return await this.userService.handleTagVerify(tag);
  }

  /**
   * Route to check whether a given mail address exists
   *
   * @param mail mail address to be checked
   *
   * @returns Promise<boolean>
   */

  @Get('check/mail/:mail')
  async checkMail(@Param('mail') mail: string): Promise<boolean> {
    return await this.userService.handleMailVerify(mail);
  }

  /**
   * Route to edit an user
   *
   * @param user request body of type IUser
   *
   * @param payload payload of the user jwt
   *
   * @returns Promise<void>
   */

  @Put('edit')
  @UseGuards(AuthGuard)
  async edit(@Body() user: EditUserDto, @Authorization() payload: TokenPayload): Promise<void> {
    try {
      await this.userService.handleEdit(user, payload);
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Route to change the password
   *
   * @param body request body
   *
   * @param payload payload of user jwt
   *
   * @returns Promise<void>
   */

  @Put('password/change')
  @UseGuards(AuthGuard)
  async passwordChange(
    @Body() body: PasswordChangeDto,
    @Authorization() payload: TokenPayload
  ): Promise<void> {
    try {
      await this.userService.handlePasswordChange(body, payload);
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Function to request a password reset
   *
   * @param body request body
   *
   * @returns Promise<void>
   */

  @Post('password/reset')
  async passwordReset(@Body() body: PasswordResetDto): Promise<void> {
    try {
      await this.userService.handlePasswordReset(body);
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Route to validate a password reset token
   *
   * @param token reset token to be validated
   *
   * @returns Promise<boolean>
   */

  @Get('password/reset/validate/:token')
  async passwordResetValidate(@Param('token') token: string): Promise<boolean> {
    return await this.userService.handlePasswordResetValidate(token);
  }

  /**
   * Route to confirm a password reset
   *
   * @param body request body
   *
   * @returns Promise<void>
   */

  @Post('password/reset/confirm')
  async passwordRestConfirm(@Body() body: PasswordResetConfirmDto): Promise<void> {
    try {
      await this.userService.handlePasswordResetConfirm(body);
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Route to delete an existing user
   *
   * @param payload payload of the user jwt
   *
   * @returns Promise<void>
   */

  @Delete('delete')
  @UseGuards(AuthGuard)
  async delete(@Authorization() payload: TokenPayload): Promise<void> {
    try {
      await this.userService.handleDelete(payload);
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Route to get the logged in user
   *
   * @param payload payload of the user jwt
   *
   * @returns Promise<IUser>
   */

  @Get('current')
  @UseGuards(AuthGuard)
  async getLoggedIn(
    @Authorization()
    payload: TokenPayload
  ): Promise<any> {
    try {
      const user: User = await this.userService.handleGet(payload.user);
      return {
        uuid: user.uuid,
        name: user.name,
        tag: user.tag,
        avatar: user.avatar,
        description: user.description,
        mail: user.mail,
        locale: user.locale,
        online: user.online,
        createdAt: user.createdAt,
        lastSeen: user.lastSeen,
        chats: user.chats.map((member: ChatMember) => member.chatUuid),
      };
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Route to get a preivew of an user by its uuid
   *
   * @param uuid uuid of User
   *
   * @returns Promise<UserPreview>
   */

  @Get(':uuid')
  async getPreview(
    @Param('uuid', new ParseUUIDPipe())
    uuid: string
  ): Promise<UserPreview> {
    try {
      const user: User = await this.userService.handleGet(uuid);
      return {
        uuid: user.uuid,
        name: user.name,
        tag: user.tag,
        description: user.description,
        avatar: user.avatar,
      };
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Route to get the avatar of an user by its uuid
   *
   * @param uuid uuid of the user
   *
   * @param response response of the request
   *
   * @returns Promise<any>
   */

  @Get(':uuid/avatar')
  async getAvatar(
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Res() response: Response
  ): Promise<any> {
    try {
      await this.userService.handleAvatarGet(uuid);
      response.sendFile(`${uuid}${config.avatarType}`, { root: './data/avatar/user' }, (err) => {
        if (err) new NotFoundException('Avatar Not Found');
      });
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Route to upload a new avatar picture
   *
   * @param file uploaded file
   *
   * @param payload payload of user jwt
   *
   * @returns Promise<void>
   */

  @Post('avatar/upload')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('avatar', uploadConfig))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Authorization() payload: TokenPayload
  ): Promise<void> {
    try {
      await this.userService.handleAvatarUpload(file, payload);
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Route to delete an avatar picture
   *
   * @param payload
   *
   * @returns Promise<void>
   */

  @Delete('avatar/delete')
  @UseGuards(AuthGuard)
  async deleteAvatar(@Authorization() payload: TokenPayload): Promise<void> {
    try {
      await this.userService.handleAvatarDelete(payload);
    } catch (exception) {
      throw exception;
    }
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import Authorization from '../../decorators/Authorization.decorator';
import { Chat } from '../../entities/Chat.entity';
import { ChatMember } from '../../entities/ChatMember.entity';
import { Message } from '../../entities/Message.entity';
import { User } from '../../entities/User.entity';
import AuthGuard from '../../guards/AuthGuard';
import { EditUser } from '../../pipes/validation/EditUser.pipe';
import { RegisterUserBody } from '../../pipes/validation/RegisterUserBody.pipe';
import { UserVerifyBody } from '../../pipes/validation/UserVerifyBody.pipe';
import { UserPreview } from './User.interface';
import { UserService } from './User.service';
import { diskStorage } from 'multer';
import * as path from 'path';
import { JwtService } from '../Auth/Jwt/Jwt.service';
import { config } from '../../config';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { Response } from 'express';
import { UserPasswordChange } from '../../pipes/validation/UserPasswordChange.pipe';
import { UserPasswordReset } from '../../pipes/validation/UserPasswordReset.pipe';
import { TokenPayload } from '../Auth/Jwt/Jwt.interface';
import { UserPasswordResetValidate } from '../../pipes/validation/UserPasswordResetValidate.pipe';
import { UserPasswordResetConfirm } from '../../pipes/validation/UserPasswordResetConfirm.pipe';
import { UserRegisterValidateBody } from '../../pipes/validation/UserRegisterValidateBody.pipe';

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
  async register(@Body() user: RegisterUserBody): Promise<void> {
    try {
      await this.userService.handleRegister(user);
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Route to validate a registration token
   *
   * @param body request body
   *
   * @returns Promise<boolean>
   */

  @Post('register/validate')
  async validate(@Body() body: UserRegisterValidateBody): Promise<boolean> {
    try {
      return await this.userService.handleValidate(body);
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
  async verify(@Body() body: UserVerifyBody): Promise<void> {
    try {
      await this.userService.handleVerify(body);
    } catch (exception) {
      throw exception;
    }
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

  @Post('edit')
  @UseGuards(AuthGuard)
  async edit(@Body() user: EditUser, @Authorization() payload: TokenPayload): Promise<void> {
    console.log(user);
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

  @Post('password/change')
  @UseGuards(AuthGuard)
  async passwordChange(
    @Body() body: UserPasswordChange,
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
  async passwordReset(@Body() body: UserPasswordReset): Promise<void> {
    try {
      await this.userService.handlePasswordReset(body);
    } catch (exception) {
      throw exception;
    }
  }

  /**
   * Route to validate a password reset token
   *
   * @param body request body
   *
   * @returns Promise<boolean>
   */

  @Post('password/reset/validate')
  async passwordResetValidate(@Body() body: UserPasswordResetValidate): Promise<boolean> {
    return await this.userService.handlePasswordResetValidate(body);
  }

  /**
   * Route to confirm a password reset
   *
   * @param body request body
   *
   * @returns Promise<void>
   */

  @Post('password/reset/confirm')
  async passwordRestConfirm(@Body() body: UserPasswordResetConfirm): Promise<void> {
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

  @Get('delete')
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
        chats: user.chats.map((member: ChatMember) => {
          const chat: Chat = member.chat;
          return {
            ...chat,
            members: chat.members.map((member: ChatMember) => {
              const user: User = member.user;
              return {
                role: member.role,
                joinedAt: member.joinedAt,
                user: {
                  uuid: user.uuid,
                  name: user.name,
                  tag: user.tag,
                  description: user.description,
                  locale: user.locale,
                  online: user.online,
                  createdAt: user.createdAt,
                  lastSeen: user.lastSeen,
                },
              };
            }),
            messages: chat.messages.map((message: Message) => {
              return {
                uuid: message.uuid,
                chat: message.chatUuid,
                createdAt: message.createdAt,
                editedAt: message.editedAt,
                edited: message.edited,
                text: message.text,
                pinned: message.pinned,
                user: message.userUuid,
              };
            }),
          };
        }),
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
        name: user.name,
        tag: user.tag,
        description: user.description,
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
   * @returns Promise<any>
   */

  @Get(':uuid/avatar')
  async getAvatar(
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Res() response: Response
  ): Promise<any> {
    response.sendFile(`${uuid}${config.avatarType}`, { root: './data/avatar/user' });
  }

  /**
   * Route to upload a new avatar picture
   *
   * @param file uploaded file
   *
   * @returns Promise<string>
   */

  @Post('avatar/upload')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('avatar', uploadConfig))
  async uploadAvatar(@UploadedFile() file: Express.Multer.File): Promise<string> {
    return file.filename;
  }
}

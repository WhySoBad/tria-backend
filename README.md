![backend_banner](https://user-images.githubusercontent.com/49595640/130368274-f91f047e-635f-44c7-ac6d-36e2559ad043.png)

# Backend

## Related Projects

- [tria-frontend](https://github.com/WhySoBad/tria-frontend)
- [tria-client](https://github.com/WhySoBad/tria-client)

## Usage

### Installation

```cmd
git clone https://github.com/WhySoBad/tria-backend.git
```

```cmd
cd tria-backend
```

```cmd
npm install
```

### Developer Mode

```cmd
npm run start:dev
```

API is available on [localhost at port 443](http://localhost:443)

### Build

```cmd
npm run start
```

API is available on [localhost at port 443](http://localhost:443)

## API

### Validate Auth Token

> Endpoint to validate an user auth token

> Authorization header required

```http
GET /auth/validate
```

#### Response

Boolean whether the token is valid or not

#### Errors

```http
400 No Token Provided
```

### Login

> Endpoint to log an user in using its credentials

```http
POST /auth/login
```

#### Body

```typescript
{
  username: string,
  password: string,
}
```

#### Response

User auth token as string

#### Errors

```http
404 User Not Found
```

```http
400 Invalid Credentials
```

### Create Private Chat

> Endpoint to create a new private chat with another user

> Authorization header required

```http
POST /chat/create/private
```

#### Body

```typescript
{
  user: string,
}
```

#### Response

Chat uuid as string

#### Errors

```http
404 User Not Found
```

```http
404 Participant Not Found
```

```http
400 Private Chat Already Exists
```

### Create Group Chat

> Endpoint to create a new group chat

> Authorization header required

```http
POST /chat/create/group
```

#### Body

```typescript
{
  name: string,
  tag: string,
  type: ChatType,
  description: string,
  members: Array<{ uuid: string; role: GroupRole; }>,
}
```

#### Response

Chat uuid as string

#### Errors

```http
404 User Not Found
```

```http
400 Group Tag Has To Be Unique
```

### Check Group Tag

> Endpoint to check whether a given group tag does already exist

```http
GET /chat/check/tag/[tag]
```

#### Response

Boolean whether the tag already exists or not

### Join Group

> Endpoint to join an existing group

> Authorization header required

```http
POST /chat/[uuid]/join
```

#### Response

Void

#### Errors

```http
404 Group Not Found
```

```http
400 Chat Has To Be Group
```

```http
403 User Is Banned
```

```http
400 User Is Already Joined
```

```http
404 User Not Found
```

### Leave Group

> Endpoint to leave an existing group

> Authorization header required

```http
POST /chat/[uuid]/leave
```

#### Response

Void

#### Errors

```http
404 Group Not Found
```

```http
400 Chat Has To Be Group
```

```http
404 User Not Found
```

```http
400 Owner Can't Leave The Group
```

### Delete Chat

> Endpoint to delete an existing chat

> Authorization header required

```http
DELETE /chat/[uuid]/delete
```

#### Response

Void

#### Errors

```http
404 Chat Not Found
```

```http
404 User Not Found
```

```http
401 Only Owner Can Delete A Group
```

### Ban Group Member

> Endpoint to ban a member in a group

> Admin role with ban permission or owner role required

> Authorization header required

```http
POST /chat/[uuid]/admin/ban
```

#### Body

```typescript
{
  uuid: string,
}
```

#### Response

Void

#### Errors

```http
404 Chat Not Found
```

```http
400 Chat Has To Be Group
```

```http
400 User Is Already Banned
```

```http
404 User Not Found
```

```http
401 Owner Can't Be Banned
```

### Unban Group Member

> Endpoint to unban a banned member in a group

> Admin role with unban permission or owner role required

> Authorization header required

```http
POST /chat/[uuid]/admin/unban
```

#### Body

```typescript
{
  uuid: string,
}
```

#### Response

Void

#### Errors

```http
404 Chat Not Found
```

```http
400 Chat Has To Be Group
```

```http
404 User Isn't Banned
```

```http
404 User Not Found
```

### Kick Group Member

> Endpoint to kick a member in a group

> Admin role with kick permission or owner role required

> Authorization header required

```http
POST /chat/[uuid]/admin/kick
```

#### Body

```typescript
{
  uuid: string,
}
```

#### Response

Void

#### Errors

```http
404 Chat Not Found
```

```http
400 Chat Has To Be Group
```

```http
404 User Not Found
```

```http
401 Owner Can't Be Kicked
```

### Get Group Preview

> Endpoint to get a preview of a chat

```http
GET /chat/[uuid]/preview
```

#### Response

```typescript
{
  uuid: string,
  type: ChatType,
  description: string,
  name: string,
  tag: string,
  size: number,
  online: number,
  avatar: string | null,
}
```

#### Errors

```http
404 Chat Not Found
```

```http
400 Can't Get Preview Of Private Group
```

```http
400 Can't Get Preview Of Private Chat
```

### Get Chat Messages

> Endpoint to get a specific amount of messages older than a given timestamp

> User has to be a member of the chat

> Authorization header required

```http
GET /chat/[uuid]/messages/get/[timestamp]/[amount]
```

#### Response

```typescript
{
  messages: Array<{
    uuid: string,
    sender: string,
    chat: string,
    createdAt: Date,
    editedAt: Date | null,
    edited: number,
    pinned: boolean,
    text: string,
  }>,
  log: Array<{
    user: string,
    chat: string,
    timestamp: Date,
    joined: boolean,
  }>,
  last: boolean,
}
```

#### Errors

```http
404 Chat Not Found
```

### Read Chat Messages

> Endpoint to mark messages after a given timestamp as read

> User has to be a member of the chat

> Authorization header required

```http
GET /chat/[uuid]/messages/read/[timestamp]
```

#### Response

Void

#### Errors

```http
400 Timestamp Can't Be In The Future
```

```http
404 User Not Found
```

```http
400 User Has Already Read Further
```

### Get Chat

> Endpoint to get all informations about a chat

> User has to be a member of the chat

> Authorization header required

```http
GET /chat/[uuid]
```

#### Response

```typescript
{
  uuid: string,
  type: ChatType,
  name: string | null,
  tag: string | null,
  description: string | null,
  createdAt: Date,
  lastRead: Date,
  members: Array<{
    joinedAt: Date,
    role: GroupRole,
    user: {
      uuid: string,
      createdAt: Date,
      lastSeen: Date,
      name: string,
      tag: string,
      description: string,
      avatar: string | null,
      locale: Locale,
      online: boolean,
    },
    promotedAt: Date, //only when member is admin
    permissions: Array<Permission>, //only when member is admin
  }>,
  messages: Array<{
    uuid: string,
    sender: string,
    chat: string,
    createdAt: Date,
    editedAt: Date | null,
    edited: number,
    pinned: boolean,
    text: string,
  }>,
  banned: Array<{
    bannedAt: Date,
    user: {
      uuid: string,
      createdAt: Date,
      name: string,
      tag: string,
      description: string,
      avatar: string | null,
    },
  }>,
  memberLog: Array<{
    user: string,
    chat: string,
    timestamp: Date,
    joined: boolean,
  }>,
}
```

#### Errors

```http
404 Chat Not Found
```

### Get Group Avatar

> Endpoint to get the avatar of a group

```http
GET /chat/[uuid]/avatar
```

#### Response

The avatar of the chat as a .jpeg file

#### Errors

```http
404 Avatar Not Found
```

### Upload Group Avatar

> Endpoint to upload an avatar for a group

> Admin role with chat edit permission or owner role required

> Authorization header required

```http
POST /chat/[uuid]/avatar/upload
```

#### Body

FormData with the name "avatar" and an avatar image in the .jpeg format

#### Response

Void

#### Errors

```http
400 Maximum File Size Is 100'000 Bytes
```

```http
400 File Has To Be Of Type JPEG
```

```http
400 Invalid File
```

```http
404 Chat Not Found
```

### Delete Group Avatar

> Endpoint to delete an avatar of a group

> Admin role with chat edit permission or owner role required

> Authorization header required

```http
DELETE /chat/[uuid]/avatar/delete
```

#### Response

Void

#### Errors

```http
404 Chat Not Found
```

```http
400 Chat Has To Be Of Type Group
```

```http
404 User Not Found
```

```http
404 Avatar Not Found
```

### Search Groups and User

> Endpoint to search new groups and user

> Authorization header required

```http
POST /search
```

#### Body

```typescript
{
  text: string,
  checkUser?: boolean,
  checkChat?: boolean,
  checkUuid?: boolean,
  checkTag?: boolean,
  checkName?: boolean,
}
```

#### Response

Array with UserPreview and ChatPreview objects

#### Errors

```http
404 User Not Found
```

### Register New User

> Endpoint to register a new user

```http
POST /user/register
```

#### Body

```typescript
{
  mail: string,
  password: string,
}
```

#### Response

Void

#### Errors

```http
400 Mail Has To Be Unique
```

### Validate Register Token

> Endpoint to validate whether a register token is valid or not

```http
GET /user/register/validate/[token]
```

#### Response

Boolean whether the token is valid or not

### Finish User Registration

> Endpoint to finish the registration of an user

```http
POST /user/register/verify
```

#### Body

```typescript
{
  token: string,
  name: string,
  tag: string,
  description: string,
  locale: Locale,
}
```

#### Response

Void

#### Errors

```http
400 Invalid Registration Token
```

```http
404 User Not Found
```

```http
400 Tag Has To Be Unique
```

### Check User Tag

> Endpoint to check whether a tag does already exist

```http
GET /user/check/tag/[tag]
```

#### Response

Boolean whether the tag does already exist or not

### Check User Mail

> Endpoint to check whether a mail is already used

```http
GET /user/check/mail/[mail]
```

#### Response

Boolean whether the mail is already used or not

### Edit User

> Endpoint to edit an user

> Authorization header required

```http
PUT /user/edit
```

#### Body

```typescript
{
  name?: string,
  tag?: string,
  description?: string,
  locale?: Locale,
}
```

#### Response

Void

#### Errors

```http
404 User Not Found
```

```http
400 Tag Has To Be Unique
```

### Change Password

> Endpoint to change the password using the old password

> Authorization header required

```http
PUT /user/password/change
```

#### Body

```typescript
{
  old: string,
  new: string,
}
```

#### Response

Void

#### Errors

```http
404 User Not Found
```

```http
400 Invalid Password
```

### Request Password Reset

> Endpoint to request a mail to reset the password

```http
POST /user/password/reset
```

#### Body

```typescript
{
  mail: string,
}
```

#### Response

Void

#### Errors

```http
404 Mail Not Found
```

```http
503 Failed To Send Mail
```

### Validate Password Reset Token

> Endpoint to validate whether a password reset token is valid

```http
GET /user/password/reset/validate/[token]
```

#### Response

Boolean whether a password reset token is valid or not

### Confirm Password Reset

> Endpoint to confirm a password reset and to set a new password

```http
POST /user/password/reset/confirm
```

#### Body

```typescript
{
  token: string,
  password: string,
}
```

#### Response

Void

#### Errors

```http
400 Invalid Reset Token
```

```http
404 User Not Found
```

### Delete User

> Endpoint to delete an user

> Authorization header required

```http
DELETE /user/delete
```

#### Response

Void

#### Errors

```http
404 User Not Found
```

### Get User Information

> Endpoint to get all information about an user

> Authorization header required

```http
GET /user/current
```

#### Response

```typescript
{
  uuid: string,
  name: string,
  tag: string,
  avatar: string | null,
  description: string,
  mail: string,
  locale: Locale,
  online: boolean,
  createdAt: Date,
  lastSeen: Date,
  chats: Array<string>,
}
```

#### Errors

```http
404 User Not Found
```

### Get User Preview

> Endpoint to get a preview of an user

```http
GET /user/[uuid]
```

#### Response

```typescript
{
  uuid: string,
  name: string,
  tag: string,
  avatar: string | null,
  description: string,
}
```

#### Errors

```http
404 User Not Found
```

### Get User Avatar

> Endpoint to get the avatar of an user

```http
GET /user/[uuid]/avatar
```

#### Response

The avatar of the chat as a .jpeg file

#### Errors

```http
404 Avatar Not Found
```

### Upload User Avatar

> Endpoint to upload an avatar for an user

> Authorization header required

```http
POST /user/avatar/upload
```

#### Body

FormData with the name "avatar" and an avatar image in the .jpeg format

#### Response

Void

#### Errors

```http
400 Maximum File Size Is 100'000 Bytes
```

```http
400 File Has To Be Of Type JPEG
```

```http
400 Invalid File
```

```http
404 User Not Found
```

### Delete User Avatar

> Endpoint to delete an avatar of an user

> Authorization header required

```http
DELETE /user/avatar/delete
```

#### Response

Void

#### Errors

```http
404 User Not Found
```

```http
404 Avatar Not Found
```

## License

© [WhySoBad](https://github.com/WhySoBad)

export interface UserPreview {
  uuid: string;
  name: string;
  tag: string;
  description: string;
}

export enum UserEvent {
  USER_EDIT = 'USER_EDIT',
  USER_DELETE = 'USER_DELETE',
}

export interface UserPreview {
  /**
   * Uuid of the user
   */

  uuid: string;

  /**
   * Name of the user
   */

  name: string;

  /**
   * Tag of the user
   */

  tag: string;

  /**
   * Description of the user
   */

  description: string;

  /**
   * Avatar of the user
   */

  avatar: string | null;
}

export enum UserEvent {
  USER_EDIT = 'USER_EDIT',
  USER_DELETE = 'USER_DELETE',
}

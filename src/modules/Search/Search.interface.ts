export type WeightedEntry<T extends object> = T & {
  /**
   * Boolean whether the entry starts with the queryed text
   */

  startsWith: boolean;

  /**
   * Weight of the entry to sort it intelligent
   */

  weight: number;

  /**
   * Percentage of matching characters
   */

  characters: number;
};

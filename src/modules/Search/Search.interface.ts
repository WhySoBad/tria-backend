export type WeightedEntry<T extends object> = T & {
  /**
   * Weight of the entry to sort it
   */

  weight: number;
};

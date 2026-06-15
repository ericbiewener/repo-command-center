declare module "fuzzy" {
  type MatchResult = { rendered: string; score: number } | null;

  type FilterResult<T> = {
    string: string;
    score: number;
    index: number;
    original: T;
  };

  type FilterOptions<T> = {
    pre?: string;
    post?: string;
    extract?: (item: T) => string;
    caseSensitive?: boolean;
  };

  const fuzzy: {
    test(pattern: string, str: string): boolean;
    match(pattern: string, str: string, opts?: FilterOptions<string>): MatchResult;
    simpleFilter(pattern: string, array: string[]): string[];
    filter<T>(pattern: string, arr: T[], opts?: FilterOptions<T>): FilterResult<T>[];
  };

  export = fuzzy;
}

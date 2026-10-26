export interface TransformOptions {
  filename?: string;
  code: Uint8Array;
  minify?: boolean;
  sourceMap?: boolean;
  inputSourceMap?: string;
  drafts?: {
    customMedia?: boolean;
  };
  nonStandard?: {
    deepSelectorCombinator?: boolean;
  };
  include?: number;
  exclude?: number;
  targets?: Record<string, number>;
  errorRecovery?: boolean;
}

export interface Warning {
  message: string;
  loc: {
    line: number;
    column: number;
  };
}

export interface TransformResult {
  code: Uint8Array;
  map: Uint8Array | null;
  warnings: Warning[];
}

export declare const Features: {
  readonly Nesting: number;
  readonly DirSelector: number;
  readonly MediaIntervalSyntax: number;
  readonly MediaRangeSyntax: number;
  readonly CustomMediaQueries: number;
  readonly LogicalProperties: number;
  readonly LightDark: number;
  readonly MediaQueries: number;
};

export declare function transform(options: TransformOptions): TransformResult;
export declare function browserslistToTargets(browserslist: string[]): Record<string, number>;
export default function init(input?: string | URL | Request): Promise<void>;

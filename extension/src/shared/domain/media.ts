declare const validatedMediaUrlBrand: unique symbol;

export type ValidatedMediaUrl = string & {
  readonly [validatedMediaUrlBrand]: true;
};

export interface MediaMetadata {
  readonly title?: string;
  readonly mimeType?: string;
  readonly sizeBytes?: number;
  readonly quality?: string;
  readonly thumbnailUrl?: ValidatedMediaUrl;
}

export interface DownloadOption {
  readonly id: string;
  readonly label: string;
  readonly url: ValidatedMediaUrl;
  readonly metadata?: MediaMetadata;
}

export type UnsupportedReason =
  'invalid-url' | 'unsupported-protocol' | 'unapproved-host' | 'no-provider' | 'not-direct-media';

export type ResolutionResult =
  | {
      readonly kind: 'ready';
      readonly providerId: string;
      readonly options: readonly [DownloadOption, ...DownloadOption[]];
      readonly metadata?: MediaMetadata;
    }
  | {
      readonly kind: 'unsupported';
      readonly reason: UnsupportedReason;
    }
  | {
      readonly kind: 'official-action';
      readonly providerId: string;
      readonly label: string;
      readonly url: ValidatedMediaUrl;
    };

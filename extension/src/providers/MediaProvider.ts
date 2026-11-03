import type { ResolutionResult, ValidatedMediaUrl } from '../shared/domain/media';

export interface MediaProvider {
  readonly id: string;
  canHandle(url: ValidatedMediaUrl): boolean;
  resolve(url: ValidatedMediaUrl): Promise<ResolutionResult>;
}

export class MediaFetchOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediaFetchOperationError';
  }
}

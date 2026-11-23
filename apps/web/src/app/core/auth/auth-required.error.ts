/** A missing local session is distinct from a network or configuration failure. */
export class AuthRequiredError extends Error {
  constructor() {
    super('Your session has expired. Please sign in again.');
    this.name = 'AuthRequiredError';
  }
}

import { describe, it, expect } from 'vitest';
import { PalabraClient } from '~/PalabraClient';

describe('PalabraClient', () => {
  it('should create a new PalabraClient', () => {
    const client = new PalabraClient({
      auth: {
        clientId: 'test',
        clientSecret: 'test',
      },
      translateFrom: 'en',
      translateTo: 'es',
      handleOriginalTrack: () => Promise.resolve(new MediaStreamTrack()),
    });
    expect(client).toBeDefined();
  });
});
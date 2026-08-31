/**
 * Security regression tests for the authentication boundary.
 *
 * A plain user id is public information in the client and must never be
 * sufficient to authenticate a request to the backend.
 */

import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockVerifyToken = jest.fn<
  (token: string, options: { secretKey: string }) => Promise<{ sub: string; sid?: string }>
>();
const mockGetUser = jest.fn<(userId: string) => Promise<{
  publicMetadata: { role?: string };
  emailAddresses: Array<{ emailAddress: string }>;
}>>();

jest.mock('@clerk/clerk-sdk-node', () => ({
  clerkClient: {
    verifyToken: mockVerifyToken,
    users: {
      getUser: mockGetUser,
    },
  },
}));

import config from '../../config/env';
import { requireAuth } from '../../middleware/clerkAuth';

const createApp = () => {
  const app = express();

  app.get('/protected', requireAuth, (req, res) => {
    res.json({ success: true, auth: req.auth });
  });

  return app;
};

describe('Clerk auth middleware', () => {
  const originalInternalAuthSharedSecret = config.internalAuthSharedSecret;

  beforeEach(() => {
    jest.clearAllMocks();
    config.internalAuthSharedSecret = '';
    mockGetUser.mockResolvedValue({
      publicMetadata: { role: 'teacher' },
      emailAddresses: [{ emailAddress: 'teacher@example.com' }],
    });
  });

  afterEach(() => {
    config.internalAuthSharedSecret = originalInternalAuthSharedSecret;
  });

  it('rejects a bare x-clerk-user-id header', async () => {
    await request(createApp())
      .get('/protected')
      .set('x-clerk-user-id', 'user_someone_else')
      .expect(401);

    expect(mockVerifyToken).not.toHaveBeenCalled();
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('authenticates a verified Clerk bearer token', async () => {
    mockVerifyToken.mockResolvedValue({ sub: 'user_verified', sid: 'sess_verified' });

    const response = await request(createApp())
      .get('/protected')
      .set('Authorization', 'Bearer signed-clerk-token')
      .expect(200);

    expect(mockVerifyToken).toHaveBeenCalledWith('signed-clerk-token', {
      secretKey: config.clerkSecretKey,
    });
    expect(response.body.auth).toMatchObject({
      userId: 'user_verified',
      sessionId: 'sess_verified',
      role: 'teacher',
      email: 'teacher@example.com',
    });
  });

  it('does not fall back to a user-id header after a bearer token fails', async () => {
    mockVerifyToken.mockRejectedValue(new Error('invalid token'));

    await request(createApp())
      .get('/protected')
      .set('Authorization', 'Bearer invalid-token')
      .set('x-clerk-user-id', 'user_someone_else')
      .expect(401);

    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('only accepts the internal bridge when its configured secret matches', async () => {
    config.internalAuthSharedSecret = 'test-internal-auth-secret';

    await request(createApp())
      .get('/protected')
      .set('x-internal-auth-user-id', 'user_internal')
      .set('x-internal-auth-secret', 'wrong-secret')
      .expect(401);

    const response = await request(createApp())
      .get('/protected')
      .set('x-internal-auth-user-id', 'user_internal')
      .set('x-internal-auth-secret', 'test-internal-auth-secret')
      .expect(200);

    expect(mockVerifyToken).not.toHaveBeenCalled();
    expect(response.body.auth).toMatchObject({
      userId: 'user_internal',
      sessionId: 'internal-auth-bridge',
      role: 'teacher',
    });
  });
});

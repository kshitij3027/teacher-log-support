/**
 * @jest-environment node
 */
import { describe, expect, it, beforeEach, jest } from '@jest/globals';

jest.mock('@/lib/supabase/server', () => {
  const client = {
    from: jest.fn(() => ({
      delete: jest.fn(() => ({
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({ data: null, error: null }),
      })),
    })),
    auth: {
      admin: {
        deleteUser: jest.fn().mockResolvedValue({ data: {}, error: null }),
      },
    },
  } as any;
  return {
    createClient: jest.fn(() => client),
  };
});

let deleteUserAccount: (userId: string) => Promise<any>;

describe('deleteUserAccount service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Import after mocks are set up
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ({ deleteUserAccount } = require('../account-deletion'));
  });

  it('returns success when profile and incidents are deleted and user is removed', async () => {
    const result = await deleteUserAccount('user-123');
    expect(result.success).toBe(true);
  });

  it('aggregates and returns errors when operations fail', async () => {
    const { createClient } = jest.requireMock('@/lib/supabase/server');
    const mock = createClient();

    // Simulate an error on profile deletion
    mock.from.mockReturnValueOnce({
      delete: () => ({ eq: () => ({ select: async () => ({ error: { message: 'profile error' } }) }) }),
    });

    const result = await deleteUserAccount('user-123');
    expect(result.success).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining(['profile error']));
  });
});



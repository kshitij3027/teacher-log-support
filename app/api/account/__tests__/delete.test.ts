import { NextRequest } from 'next/server';

// Import route under test (will fail until implemented in Task 6.11)
// eslint-disable-next-line import/no-unresolved
import { POST } from '../delete/route';

// Mocks
const mockGetUser = jest.fn();
const mockJson = jest.fn();
const mockCookiesSet = jest.fn();

jest.mock('../../../../lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

jest.mock('../../../../lib/services/account-deletion', () => ({
  deleteUserAccount: jest.fn(),
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => {
      mockJson(data, options);
      return {
        cookies: {
          set: mockCookiesSet,
        },
      } as any;
    }),
  },
  NextRequest: jest.fn(),
}));

describe('api account deletion tests', () => {
  let mockRequest: NextRequest;
  const { deleteUserAccount } = jest.requireMock('../../../../lib/services/account-deletion');

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {} as NextRequest;
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    await POST(mockRequest);

    expect(mockJson).toHaveBeenCalledWith({ error: 'Unauthorized' }, { status: 401 });
  });

  it('deletes account and clears auth cookies on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
    deleteUserAccount.mockResolvedValue({ success: true });

    await POST(mockRequest);

    expect(deleteUserAccount).toHaveBeenCalledWith('user-123');
    expect(mockCookiesSet).toHaveBeenCalledWith('sb-access-token', '', expect.any(Object));
    expect(mockCookiesSet).toHaveBeenCalledWith('sb-refresh-token', '', expect.any(Object));
    expect(mockJson).toHaveBeenCalledWith({ success: true }, undefined);
  });

  it('returns 500 with error information on failure', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
    deleteUserAccount.mockResolvedValue({ success: false, errors: ['failed to delete profile'] });

    await POST(mockRequest);

    expect(mockJson).toHaveBeenCalledWith(
      { error: 'Account deletion failed', details: ['failed to delete profile'] },
      { status: 500 }
    );
  });
});



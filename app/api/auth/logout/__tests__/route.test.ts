import { POST } from '../route';
import { NextRequest } from 'next/server';

// Mock the Supabase server client
const mockSignOut = jest.fn();

jest.mock('../../../../../lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signOut: mockSignOut,
    },
  })),
}));

// Mock NextResponse
const mockJson = jest.fn();
const mockCookiesSet = jest.fn();
const mockNextResponse = {
  json: mockJson,
  cookies: {
    set: mockCookiesSet,
  },
};

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => {
      mockJson(data, options);
      return mockNextResponse;
    }),
  },
  NextRequest: jest.fn(),
}));

describe('/api/auth/logout', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {} as NextRequest;
    mockSignOut.mockResolvedValue({ error: null });
    
    // Reset NextResponse mock
    mockJson.mockReturnValue(mockNextResponse);
  });

  test('should successfully logout user', async () => {
    const response = await POST(mockRequest);

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockJson).toHaveBeenCalledWith({ success: true }, undefined);
  });

  test('should clear auth cookies on successful logout', async () => {
    await POST(mockRequest);

    expect(mockCookiesSet).toHaveBeenCalledWith('sb-access-token', '', {
      maxAge: 0,
      path: '/',
      httpOnly: true,
      secure: false, // NODE_ENV is not 'production' in tests
      sameSite: 'lax'
    });

    expect(mockCookiesSet).toHaveBeenCalledWith('sb-refresh-token', '', {
      maxAge: 0,
      path: '/',
      httpOnly: true,
      secure: false, // NODE_ENV is not 'production' in tests
      sameSite: 'lax'
    });
  });

  test('should handle Supabase logout errors', async () => {
    const errorMessage = 'Supabase logout failed';
    mockSignOut.mockResolvedValue({ error: { message: errorMessage } });

    await POST(mockRequest);

    expect(mockJson).toHaveBeenCalledWith(
      { error: 'Failed to logout on server' },
      { status: 500 }
    );
  });

  test('should handle unexpected errors', async () => {
    mockSignOut.mockRejectedValue(new Error('Network error'));

    await POST(mockRequest);

    expect(mockJson).toHaveBeenCalledWith(
      { error: 'Internal server error during logout' },
      { status: 500 }
    );
  });

  test('should set secure cookies in production', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    await POST(mockRequest);

    expect(mockCookiesSet).toHaveBeenCalledWith('sb-access-token', '', {
      maxAge: 0,
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax'
    });

    expect(mockCookiesSet).toHaveBeenCalledWith('sb-refresh-token', '', {
      maxAge: 0,
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax'
    });

    process.env.NODE_ENV = originalEnv;
  });
});
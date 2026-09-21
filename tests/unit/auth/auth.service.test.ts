import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { AuthService } from "../../../src/api/v1/auth/auth.service";

const mockRepository = {
  findUserByPhone: vi.fn(),
  createUser: vi.fn(),
  createSession: vi.fn(),
  findValidSession: vi.fn(),
  revokeSession: vi.fn(),
};

const mockOtpService = {
  send: vi.fn(),
  verify: vi.fn(),
};

function createMockResponse() {
  return {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  } as any;
}

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();

    service = new AuthService(
      mockRepository as any,
      mockOtpService as any,
    );
  });

  it("delegates OTP sending to OtpService", async () => {
    mockOtpService.send.mockResolvedValue({
      expiresIn: 300,
    });

    const result =
      await service.sendOtp({
        phone: "09120000000",
      });

    expect(
      mockOtpService.send,
    ).toHaveBeenCalledWith(
      "09120000000",
    );

    expect(result).toEqual({
      expiresIn: 300,
    });
  });

  it("rejects invalid phone numbers", async () => {
    await expect(
      service.sendOtp({
        phone: "123",
      }),
    ).rejects.toThrow();
  });

  it("verifies OTP before authenticating", async () => {
    mockOtpService.verify.mockResolvedValue(
      undefined,
    );

    mockRepository.findUserByPhone.mockResolvedValue(
      {
        id: "user-1",
        phone: "09120000000",
        firstName: "Ali",
        lastName: "Test",
        status: "ACTIVE",
        roles: [
          {
            role: {
              name: "MEMBER",
            },
          },
        ],
      },
    );

    mockRepository.createSession.mockResolvedValue(
      {},
    );

    const res =
      createMockResponse();

    await service.verifyOtp(
      {
        phone: "09120000000",
        code: "123456",
      },
      res,
    );

    expect(
      mockOtpService.verify,
    ).toHaveBeenCalledBefore(
      mockRepository.findUserByPhone,
    );
  });

  it("does not create a new user for an existing phone", async () => {
    mockOtpService.verify.mockResolvedValue(
      undefined,
    );

    mockRepository.findUserByPhone.mockResolvedValue(
      {
        id: "user-1",
        phone: "09120000000",
        firstName: "Ali",
        lastName: "Test",
        status: "ACTIVE",
        roles: [
          {
            role: {
              name: "MEMBER",
            },
          },
        ],
      },
    );

    mockRepository.createSession.mockResolvedValue(
      {},
    );

    const res =
      createMockResponse();

    await service.verifyOtp(
      {
        phone: "09120000000",
        code: "123456",
      },
      res,
    );

    expect(
      mockRepository.createUser,
    ).not.toHaveBeenCalled();
  });

  it("requires profile data for a new user", async () => {
    mockOtpService.verify.mockResolvedValue(
      undefined,
    );

    mockRepository.findUserByPhone.mockResolvedValue(
      null,
    );

    const res =
      createMockResponse();

    await expect(
      service.verifyOtp(
        {
          phone: "09120000000",
          code: "123456",
        },
        res,
      ),
    ).rejects.toThrow(
      "Profile information is required for registration",
    );

    expect(
      mockRepository.createUser,
    ).not.toHaveBeenCalled();
  });

  it("creates a new user with profile information", async () => {
    mockOtpService.verify.mockResolvedValue(
      undefined,
    );

    mockRepository.findUserByPhone.mockResolvedValue(
      null,
    );

    mockRepository.createUser.mockResolvedValue(
      {
        id: "user-1",
        phone: "09120000000",
        firstName: "Ali",
        lastName: "Test",
        status: "ACTIVE",
        roles: [
          {
            role: {
              name: "MEMBER",
            },
          },
        ],
      },
    );

    mockRepository.createSession.mockResolvedValue(
      {},
    );

    const res =
      createMockResponse();

    const result =
      await service.verifyOtp(
        {
          phone: "09120000000",
          code: "123456",
          firstName: "Ali",
          lastName: "Test",
          nationalId: "0012345678",
          birthDate:
            "2008-01-01",
        },
        res,
      );

    expect(
      mockRepository.createUser,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: "09120000000",
        firstName: "Ali",
        lastName: "Test",
        nationalId: "0012345678",
      }),
    );

    expect(result.user.roles).toContain(
      "MEMBER",
    );
  });

  it("creates a session after successful authentication", async () => {
    mockOtpService.verify.mockResolvedValue(
      undefined,
    );

    mockRepository.findUserByPhone.mockResolvedValue(
      {
        id: "user-1",
        phone: "09120000000",
        firstName: "Ali",
        lastName: "Test",
        status: "ACTIVE",
        roles: [
          {
            role: {
              name: "MEMBER",
            },
          },
        ],
      },
    );

    mockRepository.createSession.mockResolvedValue(
      {},
    );

    const res =
      createMockResponse();

    await service.verifyOtp(
      {
        phone: "09120000000",
        code: "123456",
      },
      res,
    );

    expect(
      mockRepository.createSession,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
      }),
    );
  });

  it("sets an HTTP-only session cookie", async () => {
    mockOtpService.verify.mockResolvedValue(
      undefined,
    );

    mockRepository.findUserByPhone.mockResolvedValue(
      {
        id: "user-1",
        phone: "09120000000",
        firstName: "Ali",
        lastName: "Test",
        status: "ACTIVE",
        roles: [
          {
            role: {
              name: "MEMBER",
            },
          },
        ],
      },
    );

    mockRepository.createSession.mockResolvedValue(
      {},
    );

    const res =
      createMockResponse();

    await service.verifyOtp(
      {
        phone: "09120000000",
        code: "123456",
      },
      res,
    );

    expect(res.cookie).toHaveBeenCalledWith(
      "session",
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      }),
    );
  });

  it("revokes the session during logout", async () => {
    mockRepository.revokeSession.mockResolvedValue(
      {},
    );

    const res =
      createMockResponse();

    await service.logout(
      "session-token",
      res,
    );

    expect(
      mockRepository.revokeSession,
    ).toHaveBeenCalledWith(
      expect.any(String),
    );

    expect(
      res.clearCookie,
    ).toHaveBeenCalled();
  });

  it("rejects missing session", async () => {
    await expect(
      service.getCurrentUser(undefined),
    ).rejects.toThrow(
      "Unauthorized",
    );
  });

  it("rejects invalid session", async () => {
    mockRepository.findValidSession.mockResolvedValue(
      null,
    );

    await expect(
      service.getCurrentUser(
        "invalid-token",
      ),
    ).rejects.toThrow(
      "Unauthorized",
    );
  });

  it("returns authenticated user with roles", async () => {
    mockRepository.findValidSession.mockResolvedValue(
      {
        user: {
          id: "user-1",
          phone: "09120000000",
          firstName: "Ali",
          lastName: "Test",
          status: "ACTIVE",
          roles: [
            {
              role: {
                name: "MEMBER",
              },
            },
            {
              role: {
                name: "COACH",
              },
            },
          ],
        },
      },
    );

    const result =
      await service.getCurrentUser(
        "valid-token",
      );

    expect(result.roles).toEqual([
      "MEMBER",
      "COACH",
    ]);
  });
});
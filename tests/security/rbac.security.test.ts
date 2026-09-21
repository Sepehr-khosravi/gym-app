import {
  describe,
  expect,
  it,
} from "vitest";

import request from "supertest";

import app from "../../src/app";

describe("RBAC security", () => {
  it("does not allow unauthenticated access", async () => {
    const response =
      await request(app)
        .get(
          "/api/v1/admin/dashboard",
        );

    expect(response.status).toBe(
      401,
    );
  });

  it("does not allow MEMBER to access admin routes", async () => {
    /*
     * در اینجا session مربوط به MEMBER
     * را می‌سازیم و route را صدا می‌زنیم.
     */

    // expect(response.status).toBe(403);
  });

  it("allows ADMIN to access admin routes", async () => {
    /*
     * session مربوط به ADMIN
     */

    // expect(response.status).toBe(200);
  });
});
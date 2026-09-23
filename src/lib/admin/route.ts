import { NextResponse } from "next/server";
import { requireStaff, requireAdmin, guardErrorStatus } from "@/lib/auth/guard";
import type { Member } from "@/lib/models/Member";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Ctx = { member: Member; body: any; params: Record<string, string>; request: Request };
type Handler = (ctx: Ctx) => Promise<Response | Record<string, unknown>>;

/** Thrown by handlers for a 4xx with a member-facing message. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function wrap(guard: () => Promise<{ member: Member }>, handler: Handler) {
  return async (request: Request, ctx?: { params?: Promise<Record<string, string>> }) => {
    try {
      const { member } = await guard();
      let body: any = null;
      if (request.method !== "GET" && request.method !== "DELETE") {
        try {
          body = await request.json();
        } catch {
          body = {};
        }
      } else if (request.method === "DELETE") {
        try {
          body = await request.json();
        } catch {
          body = {};
        }
      }
      const params = ctx?.params ? await ctx.params : {};
      const result = await handler({ member, body, params, request });
      if (result instanceof Response) return result;
      return NextResponse.json(result);
    } catch (error) {
      const status = guardErrorStatus(error);
      if (status) return NextResponse.json({ error: status === 401 ? "Not signed in" : "Staff access required" }, { status });
      if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
      console.error(error);
      return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }
  };
}

/** Route handler for staff (exec + admin). */
export const staffRoute = (handler: Handler) => wrap(requireStaff, handler);
/** Route handler for admins only. */
export const adminRoute = (handler: Handler) => wrap(requireAdmin, handler);

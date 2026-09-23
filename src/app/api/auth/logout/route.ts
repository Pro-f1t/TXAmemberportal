import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ status: "signed_out" });
  response.cookies.delete("session");
  response.cookies.delete("user_role");
  return response;
}

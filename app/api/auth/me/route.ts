import { NextResponse } from "next/server";

import { currentRole } from "@/lib/auth";

export async function GET() {
  const role = await currentRole();

  return role
    ? NextResponse.json({
        role,
      })
    : NextResponse.json(
        {
          error: "Não autorizado",
        },
        {
          status: 401,
        },
      );
}
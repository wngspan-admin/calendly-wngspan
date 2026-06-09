import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { NextResponse } from "next/server";

import prisma from "@calcom/prisma";

async function getHandler() {
  await prisma.$queryRaw`SELECT 1`;
  return NextResponse.json({ ok: true });
}

export const GET = defaultResponderForAppDir(getHandler);

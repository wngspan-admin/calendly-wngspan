import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { nextJsOrgRewriteConfig } from "./getNextjsOrgRewriteConfig";

const isOrganizationsEnabled =
  process.env.ORGANIZATIONS_ENABLED === "1" || process.env.ORGANIZATIONS_ENABLED === "true";

// Pre-compile the org host regex from the shared config (same regex used in next.config.ts rewrites)
const orgHostRegex = nextJsOrgRewriteConfig.orgHostPath
  ? new RegExp(nextJsOrgRewriteConfig.orgHostPath)
  : null;

export function middleware(req: NextRequest) {
  if (!isOrganizationsEnabled || !orgHostRegex) {
    return NextResponse.next();
  }

  const host = req.headers.get("host") ?? "";
  const match = host.match(orgHostRegex);
  // The regex uses a named capture group "orgSlug" defined in getNextjsOrgRewriteConfig.ts
  const orgSlug = match?.groups?.orgSlug ?? null;

  if (!orgSlug) {
    return NextResponse.next();
  }

  // Inject org slug as a request header so SSR pages can read it without re-parsing the host
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-cal-org-slug", orgSlug);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // Run on all paths except static assets and Next.js internals
  matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico).*)"],
};

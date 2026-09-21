import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Next.js 16 proxy (replaces middleware.ts).
 * Protect product routes; keep marketing + auth + Stripe webhook public.
 */
const isProtected = createRouteMatcher([
  "/brief(.*)",
  "/rfo(.*)",
  "/settings(.*)",
  "/prompts(.*)",
  "/data-health(.*)",
  "/api/sync(.*)",
  "/api/rfo(.*)",
  "/api/auth/(harvest|qbo)/start(.*)",
  "/api/stripe/checkout(.*)",
  "/api/stripe/portal(.*)",
  "/api/jobs(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

import type { NextConfig } from "next";

/**
 * CI/build placeholders so `next build` succeeds without live Clerk keys.
 * Runtime on Vercel still needs real NEXT_PUBLIC_CLERK_* / CLERK_SECRET_KEY.
 */
if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY =
    "pk_test_build_placeholder_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
}
if (!process.env.CLERK_SECRET_KEY) {
  process.env.CLERK_SECRET_KEY =
    "sk_test_build_placeholder_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
}
if (!process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL) {
  process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL = "/sign-in";
}
if (!process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL) {
  process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL = "/sign-up";
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

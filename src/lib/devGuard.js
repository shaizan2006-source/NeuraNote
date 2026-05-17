export function isDevEnv() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_VERCEL_ENV !== "production"
  );
}

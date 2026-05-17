import { notFound } from "next/navigation";
import { isDevEnv } from "@/lib/devGuard";

export default function DevLayout({ children }) {
  if (!isDevEnv()) notFound();
  return children;
}

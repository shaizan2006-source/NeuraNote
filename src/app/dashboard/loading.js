import DashboardSkeleton from "@/components/shared/DashboardSkeleton";

// Tailored loader for the dashboard — mirrors the sidebar + bento layout so the route
// transition lands on the same shape the page renders.
export default function Loading() {
  return <DashboardSkeleton />;
}

export default function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-[#0D0D0D] text-white">
      {children}
    </div>
  );
}
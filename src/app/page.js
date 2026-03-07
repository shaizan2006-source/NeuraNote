export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold">Ask My Notes</h1>
      <p className="mt-4 text-lg">
        Upload notes and ask AI questions about them.
      </p>

      <a
        href="/login"
        className="mt-6 bg-black text-white px-6 py-3 rounded-lg"
      >
        Get Started
      </a>
    </div>
  );
}
export default function Dashboard() {
  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <button className="bg-blue-500 text-white px-4 py-2 mt-6 rounded">
        Upload Notes
      </button>

      <div className="mt-10">
        <h2 className="text-xl font-semibold">My Documents</h2>

        <ul className="mt-4">
          <li>Biology Chapter 1</li>
          <li>Physics Mechanics</li>
        </ul>
      </div>
    </div>
  );
}
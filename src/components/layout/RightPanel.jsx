export default function RightPanel() {
  return (
    <div className="w-80 border-l border-neutral-800 p-4 space-y-4">

      {/* Daily Plan */}
      <div className="bg-neutral-900 p-4 rounded-2xl">
        <h2 className="font-semibold mb-2">📅 Today’s Plan</h2>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>Revise Thermodynamics</li>
          <li>Practice 10 MCQs</li>
        </ul>
      </div>

      {/* Weak Topics */}
      <div className="bg-neutral-900 p-4 rounded-2xl">
        <h2 className="font-semibold mb-2">⚠ Weak Topics</h2>
        <p className="text-sm text-gray-400">Numericals, Graphs</p>
      </div>

    </div>
  );
}
export default function BrainCard() {
  return (
    <div className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 mb-4">
      
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">🧠 Your Brain</h2>
        <span className="text-xs text-green-400">● Active</span>
      </div>

      <p className="text-sm text-gray-400 mt-2">
        You're improving in Physics. Keep going.
      </p>

    </div>
  );
}
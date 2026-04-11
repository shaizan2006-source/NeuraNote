export default function AskInput() {
  return (
    <div className="flex gap-2 mt-4">
      <input
        className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-sm"
        placeholder="Ask anything about your PDFs..."
      />
      <button className="bg-purple-600 px-4 rounded-xl">
        Ask
      </button>
    </div>
  );
}
export default function Sidebar() {
  return (
    <div className="w-64 border-r border-neutral-800 p-4 flex flex-col">
      
      <h1 className="text-lg font-semibold mb-6">🧠 Second Brain</h1>

      {/* Upload Button */}
      <button className="bg-purple-600 hover:bg-purple-700 transition p-2 rounded-lg mb-4">
        + Upload PDF
      </button>

      {/* PDF List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        <p className="text-xs text-gray-400 mb-2">Your PDFs</p>

        <div className="p-2 rounded-lg hover:bg-neutral-800 cursor-pointer">
          Physics Notes
        </div>
      </div>

    </div>
  );
}
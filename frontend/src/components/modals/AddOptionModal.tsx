"use client";

interface AddOptionModalProps {
  isOpen: boolean;
  loading: boolean;
  optionLabel: string;
  onOptionLabelChange: (value: string) => void;
  onClose: () => void;
  onAdd: () => void;
}

export default function AddOptionModal({
  isOpen,
  loading,
  optionLabel,
  onOptionLabelChange,
  onClose,
  onAdd,
}: AddOptionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-black p-6 rounded-lg shadow-lg w-96 border border-white/10">
        <h3 className="text-xl font-medium mb-4">Add Vote Option</h3>
        <input
          type="text"
          placeholder="Option label.."
          value={optionLabel}
          onChange={(e) => onOptionLabelChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-white/10 rounded mb-4 focus:outline-none"
          disabled={loading}
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-white/10 rounded cursor-pointer hover:bg-white/10 disabled:opacity-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={onAdd}
            className="px-4 py-2 text-sm bg-white text-black rounded cursor-pointer hover:bg-white/80 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Adding..." : "Add Option"}
          </button>
        </div>
      </div>
    </div>
  );
}

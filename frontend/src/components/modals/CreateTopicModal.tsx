"use client";

interface CreateTopicModalProps {
  isOpen: boolean;
  loading: boolean;
  title: string;
  onTitleChange: (value: string) => void;
  onClose: () => void;
  onCreate: () => void;
}

export default function CreateTopicModal({
  isOpen,
  loading,
  title,
  onTitleChange,
  onClose,
  onCreate,
}: CreateTopicModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/5 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-black p-6 rounded-lg border border-white/10 w-96">
        <h3 className="text-xl font-medium mb-4">Create New Topic</h3>
        <input
          type="text"
          placeholder="Topic title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="w-full px-3 py-2 border border-white/10 rounded mb-4 focus:border-white/20"
          disabled={loading}
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-white/10 rounded cursor-pointer hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={onCreate}
            className="px-4 py-2 text-sm bg-white text-black rounded cursor-pointer hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

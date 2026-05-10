"use client";
import { createMemo, deleteMemo, type Memo } from "@/lib/api";

type Props = {
  memos: Memo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRefresh: () => void;
};

export default function MemoList({ memos, selectedId, onSelect, onRefresh }: Props) {
  async function handleCreate() {
    const memo = await createMemo("新しいメモ", "");
    onRefresh();
    onSelect(memo.id);
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm("このメモを削除しますか？")) return;
    await deleteMemo(id);
    onRefresh();
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="p-3 border-b">
        <button
          onClick={handleCreate}
          className="w-full bg-blue-600 text-white text-sm py-2 rounded-lg hover:bg-blue-700"
        >
          ＋ 新しいメモ
        </button>
      </div>
      <ul className="overflow-y-auto flex-1">
        {memos.length === 0 && (
          <li className="p-4 text-sm text-gray-400 text-center">メモがありません</li>
        )}
        {memos.map((memo) => (
          <li
            key={memo.id}
            onClick={() => onSelect(memo.id)}
            className={`p-3 border-b cursor-pointer hover:bg-gray-50 group ${
              memo.id === selectedId ? "bg-blue-50 border-l-2 border-l-blue-600" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-1">
              <span className="text-sm font-medium truncate flex-1">{memo.title}</span>
              <button
                onClick={(e) => handleDelete(e, memo.id)}
                className="text-gray-300 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100"
              >
                ✕
              </button>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {new Date(memo.updated_at).toLocaleDateString("ja-JP")}
            </div>
            {memo.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {memo.tags.map((tag) => (
                  <span key={tag.id} className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded">
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

"use client";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { updateMemo, type Memo, type Tag } from "@/lib/api";

type Props = {
  memo: Memo | null;
  tags: Tag[];
  onRefresh: () => void;
};

export default function MemoEditor({ memo, tags, onRefresh }: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (memo) {
      setTitle(memo.title);
      setBody(memo.body);
      setSelectedTagIds(memo.tags.map((t) => t.id));
    }
  }, [memo?.id]);

  async function handleSave() {
    if (!memo) return;
    setSaving(true);
    await updateMemo(memo.id, { title, body, tag_ids: selectedTagIds });
    onRefresh();
    setSaving(false);
  }

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }

  if (!memo) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <p>左のリストからメモを選択してください</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="text-xl font-bold border-b pb-2 focus:outline-none"
        placeholder="タイトル"
      />
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <button
            key={tag.id}
            onClick={() => toggleTag(tag.id)}
            className={`text-xs px-2 py-1 rounded-full border transition-colors ${
              selectedTagIds.includes(tag.id)
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
            }`}
          >
            {tag.name}
          </button>
        ))}
      </div>
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setMode("edit")}
          className={`text-sm pb-2 px-1 border-b-2 transition-colors ${
            mode === "edit" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"
          }`}
        >
          編集
        </button>
        <button
          onClick={() => setMode("preview")}
          className={`text-sm pb-2 px-1 border-b-2 transition-colors ${
            mode === "preview" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"
          }`}
        >
          プレビュー
        </button>
      </div>
      {mode === "edit" ? (
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="flex-1 resize-none focus:outline-none font-mono text-sm"
          placeholder="Markdown で書けます..."
        />
      ) : (
        <div className="flex-1 overflow-auto prose prose-sm max-w-none">
          <ReactMarkdown>{body}</ReactMarkdown>
        </div>
      )}
      <button
        onClick={handleSave}
        disabled={saving}
        className="self-end bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "保存中..." : "保存"}
      </button>
    </div>
  );
}

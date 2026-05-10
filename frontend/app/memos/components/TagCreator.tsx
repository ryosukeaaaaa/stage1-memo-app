"use client";
import { useState } from "react";
import { createTag } from "@/lib/api";

type Props = { onCreated: () => void };

export default function TagCreator({ onCreated }: Props) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    await createTag(name.trim());
    setName("");
    onCreated();
    setCreating(false);
  }

  return (
    <form onSubmit={handleCreate} className="flex gap-1">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="新しいタグ..."
        className="flex-1 border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <button
        type="submit"
        disabled={creating || !name.trim()}
        className="bg-gray-700 text-white text-xs px-2 py-1 rounded hover:bg-gray-800 disabled:opacity-50"
      >
        追加
      </button>
    </form>
  );
}

"use client";
import { useState, useEffect, useCallback } from "react";
import { getMemos, getTags, type Memo, type Tag } from "@/lib/api";
import MemoList from "./MemoList";
import MemoEditor from "./MemoEditor";
import SearchBar from "./SearchBar";
import TagSelector from "./TagSelector";
import TagCreator from "./TagCreator";

export default function MemoPane() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const loadMemos = useCallback(async () => {
    const data = await getMemos(searchQuery || undefined, selectedTag || undefined);
    setMemos(data);
  }, [searchQuery, selectedTag]);

  const loadTags = useCallback(async () => {
    const data = await getTags();
    setTags(data);
  }, []);

  useEffect(() => {
    loadMemos();
  }, [loadMemos]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const selectedMemo = memos.find((m) => m.id === selectedId) ?? null;

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="w-72 border-r flex flex-col bg-white">
        <div className="p-3 space-y-2 border-b">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
          <TagSelector tags={tags} selected={selectedTag} onSelect={setSelectedTag} />
          <TagCreator onCreated={loadTags} />
        </div>
        <MemoList
          memos={memos}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onRefresh={loadMemos}
        />
      </div>
      <div className="flex-1 overflow-auto">
        <MemoEditor
          memo={selectedMemo}
          tags={tags}
          onRefresh={() => { loadMemos(); loadTags(); }}
        />
      </div>
    </div>
  );
}

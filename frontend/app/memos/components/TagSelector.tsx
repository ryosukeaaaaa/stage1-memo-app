"use client";
import { type Tag } from "@/lib/api";

type Props = {
  tags: Tag[];
  selected: string | null;
  onSelect: (tag: string | null) => void;
};

export default function TagSelector({ tags, selected, onSelect }: Props) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      <button
        onClick={() => onSelect(null)}
        className={`text-xs px-2 py-1 rounded-full border transition-colors ${
          selected === null
            ? "bg-gray-800 text-white border-gray-800"
            : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"
        }`}
      >
        すべて
      </button>
      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => onSelect(selected === tag.name ? null : tag.name)}
          className={`text-xs px-2 py-1 rounded-full border transition-colors ${
            selected === tag.name
              ? "bg-gray-800 text-white border-gray-800"
              : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"
          }`}
        >
          {tag.name}
        </button>
      ))}
    </div>
  );
}

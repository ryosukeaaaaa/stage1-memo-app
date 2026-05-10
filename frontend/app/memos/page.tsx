"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, logout, type User } from "@/lib/api";
import MemoPane from "./components/MemoPane";

export default function MemosPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    getMe().then((u) => {
      if (!u) {
        router.replace("/auth/login");
      } else {
        setUser(u);
      }
    });
  }, [router]);

  async function handleLogout() {
    await logout();
    router.replace("/auth/login");
  }

  if (!user) return null;

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">メモアプリ</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user.email}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-red-500 hover:text-red-700"
          >
            ログアウト
          </button>
        </div>
      </header>
      <MemoPane />
    </div>
  );
}

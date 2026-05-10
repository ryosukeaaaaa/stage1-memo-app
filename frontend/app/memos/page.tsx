import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import MemoPane from "./components/MemoPane";

const API_URL = process.env.API_URL ?? "http://localhost:8000";

export default async function MemosPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token");
  if (!token) redirect("/auth/login");

  const res = await fetch(`${API_URL}/auth/me`, {
    headers: { Cookie: `access_token=${token.value}` },
    cache: "no-store",
  });
  if (!res.ok) redirect("/auth/login");
  const user = await res.json();

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">メモアプリ</h1>
        <span className="text-sm text-gray-500">{user.email}</span>
      </header>
      <MemoPane />
    </div>
  );
}

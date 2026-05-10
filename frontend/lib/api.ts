const API_URL = process.env.API_URL ?? "http://localhost:8000";

export type Memo = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
  tags: Tag[];
};

export type Tag = {
  id: string;
  name: string;
  created_at: string;
};

export type User = {
  id: string;
  email: string;
  created_at: string;
};

async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  return res;
}

export async function getMe(): Promise<User | null> {
  const res = await apiFetch("/auth/me");
  if (!res.ok) return null;
  return res.json();
}

export async function login(email: string, password: string): Promise<boolean> {
  const res = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return res.ok;
}

export async function logout(): Promise<void> {
  await apiFetch("/auth/logout", { method: "POST" });
}

export async function getMemos(q?: string, tag?: string): Promise<Memo[]> {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (tag) params.set("tag", tag);
  const res = await apiFetch(`/memos?${params}`);
  if (!res.ok) return [];
  return res.json();
}

export async function createMemo(title: string, body: string, tagIds: string[] = []): Promise<Memo> {
  const res = await apiFetch("/memos", {
    method: "POST",
    body: JSON.stringify({ title, body, tag_ids: tagIds }),
  });
  return res.json();
}

export async function updateMemo(id: string, fields: { title?: string; body?: string; tag_ids?: string[] }): Promise<Memo> {
  const res = await apiFetch(`/memos/${id}`, {
    method: "PATCH",
    body: JSON.stringify(fields),
  });
  return res.json();
}

export async function deleteMemo(id: string): Promise<void> {
  await apiFetch(`/memos/${id}`, { method: "DELETE" });
}

export async function getTags(): Promise<Tag[]> {
  const res = await apiFetch("/tags");
  if (!res.ok) return [];
  return res.json();
}

export async function createTag(name: string): Promise<Tag> {
  const res = await apiFetch("/tags", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return res.json();
}

export async function deleteTag(id: string): Promise<void> {
  await apiFetch(`/tags/${id}`, { method: "DELETE" });
}

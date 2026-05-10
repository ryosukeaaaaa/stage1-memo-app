# Stage 1 メモアプリ 設計ドキュメント

作成日: 2026-05-11

---

## 概要

Next.js + FastAPI + PostgreSQL を使ったメモアプリ。
フルスタック開発・設計力習得を目的とした学習プロジェクト（Stage 1）。
Vercel（フロントエンド）+ Railway（バックエンド・DB）にデプロイする。

---

## 要件

### ユーザー

- **シングルユーザー + JWT 認証あり**
- 自分専用のアプリだが、認証（ログイン）の設計・実装を学ぶために認証機能を持たせる

### 機能スコープ

- メモの作成・一覧・詳細・編集・削除
- メモのタイトル + 本文（Markdown）
- キーワード検索（タイトル・本文を PostgreSQL の ILIKE で検索。Stage 1 はシンプルな部分一致で十分）
- タグ機能（メモに複数タグを付与・タグで絞り込み）
- ユーザー登録・ログイン・ログアウト

### UI

- 2ペインレイアウト（左: メモ一覧、右: 詳細・編集）
- Markdown プレビュー表示（右ペイン内で「編集」「プレビュー」タブを切り替える）

---

## Section 1: システム全体像

```
ブラウザ
└── Next.js App Router（Vercel）
    ├── Server Components（初期 HTML 生成・認証チェック）
    └── Client Components（インタラクティブな操作）
         ↓ HTTP + httpOnly Cookie（JWT）
    FastAPI（Railway）
    ├── /auth/*  認証（ログイン・ログアウト・トークン検証）
    ├── /memos/* メモ CRUD・検索
    └── /tags/*  タグ管理
         ↓ SQL
    PostgreSQL（Railway）
    └── users / memos / tags / memo_tags
```

### 設計の意図

- Next.js と FastAPI は完全分離した独立サービス。責任が明確で、将来どちらかを差し替えやすい
- JWT は `httpOnly Cookie` で保持。JavaScript から読めないため XSS 攻撃でトークンを盗まれない
- Vercel / Railway を使うことでインフラの複雑さを隠し、アプリ設計に集中する（Stage 3 で AWS に移行時に差分が学習になる）

---

## Section 2: データモデル（ER 図）

### テーブル定義

```sql
-- ユーザー
users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
)

-- メモ
memos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(255) NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
)

-- タグ
tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, name)
)

-- メモ×タグ 中間テーブル
memo_tags (
  memo_id UUID NOT NULL REFERENCES memos(id) ON DELETE CASCADE,
  tag_id  UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (memo_id, tag_id)
)
```

### リレーション

- `users` 1 → 多 `memos`
- `users` 1 → 多 `tags`
- `memos` 多 ⇄ 多 `tags`（`memo_tags` で解消）

### 設計の意図

- **UUID を主キーに使う理由**: 連番より推測されにくく、将来的なマルチサーバー構成でも ID 衝突が起きない
- **memo_tags（中間テーブル）**: 多対多リレーションは直接繋げられないため、組み合わせを1行ずつ記録する中間テーブルで解消する
- **tags に user_id を持たせる**: タグはユーザーごとに独立させる（他ユーザーのタグが見えないようにする）
- **updated_at を memos だけに持たせる**: メモは本文を繰り返し編集するため更新日時が重要。タグは名前変更のみでシンプル

---

## Section 3: API 設計

### 認証エンドポイント

| メソッド | パス | 認証 | 説明 |
|---------|------|------|------|
| POST | `/auth/register` | 不要 | ユーザー登録 |
| POST | `/auth/login` | 不要 | ログイン（Cookie に JWT をセット） |
| POST | `/auth/logout` | 必要 | ログアウト（Cookie を削除） |
| GET | `/auth/me` | 必要 | 現在のログインユーザー情報取得 |

### メモエンドポイント（全て認証必要）

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/memos` | メモ一覧（`?q=検索語&tag=タグ名` でフィルタ可） |
| POST | `/memos` | メモ作成 |
| GET | `/memos/{id}` | メモ詳細 |
| PATCH | `/memos/{id}` | メモ更新（送ったフィールドだけ更新） |
| DELETE | `/memos/{id}` | メモ削除 |

### タグエンドポイント（全て認証必要）

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/tags` | タグ一覧 |
| POST | `/tags` | タグ作成 |
| DELETE | `/tags/{id}` | タグ削除 |

### 設計の意図

- **URL は名詞、HTTP メソッドが動詞**（RESTful 設計）: `/deleteMemo/1` ではなく `DELETE /memos/1`
- **PUT でなく PATCH**: 一部フィールドだけ更新できるようにする
- **検索はクエリパラメータ**: `GET /memos?q=キーワード` で絞り込み。別エンドポイントを増やさずシンプルに保つ

---

## Section 4: フロントエンド構成

### ディレクトリ構造

```
frontend/
└── app/
    ├── layout.tsx              # 全ページ共通（Server Component）
    ├── page.tsx                # ルート → /memos へリダイレクト
    ├── auth/
    │   └── login/
    │       └── page.tsx        # ログインフォーム
    └── memos/
        ├── page.tsx            # 2ペインメイン画面（Server Component）
        └── components/
            ├── MemoList.tsx    # 左ペイン: メモ一覧（Client Component）
            ├── MemoEditor.tsx  # 右ペイン: 編集・Markdownプレビュー（Client Component）
            ├── SearchBar.tsx   # 検索入力（Client Component）
            └── TagSelector.tsx # タグ絞り込み（Client Component）
└── lib/
    └── api.ts                  # FastAPI へのリクエスト関数
```

### Server / Client Component の使い分け

| 種別 | 用途 | 該当ファイル |
|------|------|------------|
| Server Component | 初期 HTML 生成・Cookie 読み取り・認証チェック | layout.tsx, memos/page.tsx |
| Client Component | クリック・入力・状態管理 | MemoList, MemoEditor, SearchBar, TagSelector |

### 状態管理

「左ペインで選んだメモを右ペインに表示する」ために、`selectedMemoId` を両ペインの共通親（`memos/page.tsx`）で管理する。これは React の **Lift State Up（状態を引き上げる）** パターン。

---

## Section 5: 認証フロー

### ① ログイン時

1. ブラウザが `POST /auth/login`（email + password）を送る
2. FastAPI がパスワードを検証し、JWT を生成
3. レスポンスの `Set-Cookie` ヘッダーに JWT をセット（`httpOnly; Secure; SameSite=Lax`）
4. ブラウザが Cookie を保存（JavaScript からは読めない）

### ② 通常リクエスト時

1. ブラウザが毎リクエストに Cookie（JWT）を自動添付
2. FastAPI が JWT を検証して `user_id` を取り出す
3. そのユーザーのデータだけを返す

### ③ 未認証アクセス時

1. Cookie なしでリクエスト
2. FastAPI が `401 Unauthorized` を返す
3. Next.js が `/auth/login` へリダイレクト

### httpOnly Cookie を選んだ理由

`localStorage` に JWT を保存した場合、XSS 攻撃（悪意のある JS の実行）でトークンを盗まれるリスクがある。`httpOnly Cookie` は JavaScript から読めないため、このリスクを排除できる。

---

## デプロイ構成

| サービス | プラットフォーム | 理由 |
|---------|--------------|------|
| Next.js | Vercel | Next.js の公式推奨・無料枠あり・デプロイが簡単 |
| FastAPI | Railway | Python アプリのホスティングが簡単・無料枠あり |
| PostgreSQL | Railway | FastAPI と同じプラットフォームで管理が楽 |

---

## 技術スタック

| レイヤー | 技術 | バージョン |
|---------|------|---------|
| フロントエンド | Next.js (App Router) | 15.x |
| バックエンド | FastAPI | 0.115.x |
| データベース | PostgreSQL | 16.x |
| ORM | SQLAlchemy + Alembic | 2.x |
| 認証 | python-jose (JWT) | 3.x |
| Markdown | react-markdown | 9.x |
| スタイリング | Tailwind CSS | 3.x |

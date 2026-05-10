# Stage 1 学習まとめ — Next.js + FastAPI + PostgreSQL メモアプリ

作成日: 2026-05-11

---

## 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [開発フロー全体像](#2-開発フロー全体像)
3. [使ったAIエージェント・スキル](#3-使ったaiエージェントスキル)
4. [設計フェーズ](#4-設計フェーズ)
5. [実装フェーズ — バックエンド](#5-実装フェーズ--バックエンド)
6. [実装フェーズ — フロントエンド](#6-実装フェーズ--フロントエンド)
7. [デプロイフェーズ](#7-デプロイフェーズ)
8. [踏んだバグと学び](#8-踏んだバグと学び)
9. [技術スタック一覧](#9-技術スタック一覧)
10. [次のステップ（Stage 2 に向けて）](#10-次のステップstage-2-に向けて)

---

## 1. プロジェクト概要

**何を作ったか:** JWT 認証付きのメモアプリ

**機能スコープ:**
- ユーザー登録・ログイン・ログアウト（JWT + httpOnly Cookie）
- メモの作成・一覧・編集・削除
- Markdown プレビュー（編集 ↔ プレビュー タブ切り替え）
- キーワード検索（PostgreSQL の ILIKE）
- タグ機能（複数タグの付与・タグで絞り込み）
- 2ペインレイアウト（左: 一覧、右: 編集・プレビュー）

**デプロイ先:**
- フロントエンド: https://stage1-memo-app.vercel.app（Vercel）
- バックエンド API: https://stage1-memo-app-production.up.railway.app（Railway）
- データベース: PostgreSQL（Railway）

---

## 2. 開発フロー全体像

```
要件定義
  ↓
設計（ER図 → API設計 → コンポーネント設計 → 認証フロー）
  ↓
設計ドキュメント作成（docs/superpowers/specs/）
  ↓
実装計画作成（docs/superpowers/plans/）
  ↓
サブエージェント方式で実装（Task 1〜14）
  ↓
デプロイ（Railway + Vercel）
  ↓
本番バグ修正
```

**ポイント:** いきなりコードを書かず、「要件 → 設計 → 計画 → 実装」の順番を守った。
設計を先に固めることで、実装中の迷いが減り、レビューの基準も明確になった。

---

## 3. 使ったAIエージェント・スキル

### Superpowers プラグインとは

Claude Code に追加できる「スキル集」。決まった作業（ブレインストーミング・計画作成・TDD実装・レビュー）を体系的に実行するための手順書をAIに読み込ませる仕組み。

### 使ったスキル一覧

| スキル名 | 役割 | 使ったタイミング |
|---------|------|--------------|
| `superpowers:brainstorming` | 要件・設計の選択肢を整理しながらドキュメント化 | 要件定義〜設計フェーズ |
| `superpowers:writing-plans` | 実装計画をタスク単位・TDDステップ付きで作成 | 設計完了後 |
| `superpowers:subagent-driven-development` | 計画をサブエージェントに1タスクずつ実装させる | 実装フェーズ全体 |
| `superpowers:test-driven-development` | テスト先書き → 実装の順番を徹底 | 各タスクの実装中 |

### サブエージェント方式とは

```
コントローラー（自分）
  ├── Task 1 → 実装サブエージェントに依頼
  │             ↓ 実装・テスト・コミット・セルフレビュー
  │         スペックレビューサブエージェント（仕様通りか確認）
  │             ↓
  │         コード品質レビューサブエージェント（品質確認）
  │             ↓ 承認
  ├── Task 2 → 同様に繰り返す
  └── ...
```

**なぜこの方式か:**
- 1つのAIセッションで全タスクを実行すると文脈が汚染され、精度が下がる
- タスクごとに新しいサブエージェントを起動することで、クリーンな文脈を保てる
- スペックレビュー（仕様漏れ・過剰実装チェック）→ コード品質レビューの2段階で品質を担保する

---

## 4. 設計フェーズ

### 4-1. システム全体像

```
ブラウザ
└── Next.js App Router（Vercel）
    ├── Server Components（初期HTML生成）
    └── Client Components（インタラクティブ操作）
         ↓ HTTP + httpOnly Cookie（JWT）
    FastAPI（Railway）
    ├── /auth/*  認証
    ├── /memos/* メモ CRUD
    └── /tags/*  タグ管理
         ↓ SQL
    PostgreSQL（Railway）
```

**設計判断:** Next.js と FastAPI を完全に分離した独立サービスにした。
→ 将来どちらかを差し替えやすく、責任が明確になる。

### 4-2. データモデル（ER図）

```sql
users (id UUID, email, password_hash, created_at)
memos (id UUID, user_id → users, title, body, created_at, updated_at)
tags  (id UUID, user_id → users, name, created_at)
memo_tags (memo_id → memos, tag_id → tags)  -- 多対多の中間テーブル
```

**設計判断:**
- **UUID を主キーに使う理由:** 連番より推測されにくい。将来のマルチサーバー構成でもID衝突が起きない
- **memo_tags（中間テーブル）:** 多対多リレーションは直接繋げられないため、組み合わせを1行ずつ記録する中間テーブルで解消する
- **tags に user_id を持たせる:** タグはユーザーごとに独立させる（他ユーザーのタグが見えないようにする）

### 4-3. API設計

| 原則 | 説明 | 例 |
|------|------|-----|
| URLは名詞、メソッドが動詞 | RESTful 設計 | `DELETE /memos/1`（`/deleteMemo/1` ではない） |
| PUT でなく PATCH | 一部フィールドだけ更新できる | タイトルだけ変えたいときに本文を送らなくて済む |
| 検索はクエリパラメータ | 別エンドポイントを増やさない | `GET /memos?q=キーワード&tag=メモ` |

### 4-4. 認証フロー

```
① ログイン時
   ブラウザ → POST /auth/login → FastAPI がパスワード検証
   FastAPI → Set-Cookie: access_token=JWT (httpOnly; Secure; SameSite=None)
   ブラウザが Cookie を保存（JavaScript からは読めない）

② 通常リクエスト時
   ブラウザが毎リクエストに Cookie を自動添付
   FastAPI が JWT を検証 → user_id を取り出す → そのユーザーのデータだけ返す

③ 未認証アクセス時
   Cookie なしでリクエスト → FastAPI が 401 → フロントが /auth/login にリダイレクト
```

**なぜ httpOnly Cookie か:**
`localStorage` に JWT を保存すると、XSS 攻撃（悪意のある JavaScript の実行）でトークンを盗まれるリスクがある。
`httpOnly Cookie` は JavaScript から読めないため、このリスクを排除できる。

---

## 5. 実装フェーズ — バックエンド

### ディレクトリ構成

```
backend/
├── app/
│   ├── main.py          # FastAPI エントリポイント・CORS 設定
│   ├── database.py      # SQLAlchemy セッション設定
│   ├── models.py        # User / Memo / Tag / MemoTag モデル
│   ├── schemas.py       # Pydantic スキーマ（リクエスト/レスポンス）
│   ├── auth/            # 認証（JWT・パスワードハッシュ）
│   ├── memos/           # メモ CRUD・検索
│   └── tags/            # タグ管理
├── alembic/             # DBマイグレーション
├── tests/               # pytest テスト（20件）
└── Procfile             # Railway デプロイ設定
```

### TDD（テスト駆動開発）の進め方

```
1. 失敗するテストを書く（Red）
2. テストが失敗することを確認する
3. テストを通過する最小限のコードを書く（Green）
4. テストが通ることを確認する
5. コードを整理する（Refactor）
6. コミット
```

**なぜテストを先に書くか:**
- 「何を作るか」が明確になる（設計の代わりにもなる）
- 実装後にテストを書くと、実装に引きずられたテストになりやすい
- リグレッション（過去の機能の壊れ）を自動で検出できる

### テストの仕組み（conftest.py）

```python
# テスト用に本番DBを使わず SQLite を使う
# テストごとにテーブルを作り直す（テスト間の干渉を防ぐ）
# FastAPI の dependency_overrides でテスト用DBに差し替える
```

**ポイント:** 本番DBに触れずに全テストを実行できる。CI/CD でも使える。

### Alembic マイグレーション

DBのスキーマ変更を「バージョン管理」する仕組み。

```bash
alembic upgrade head    # 最新バージョンまで適用
alembic downgrade -1    # 1つ前のバージョンに戻す
```

**Railway では Procfile にマイグレーションを組み込んだ:**
```
web: alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```
→ デプロイのたびに自動マイグレーション。マイグレーション済みの場合は即スキップして起動する。

---

## 6. 実装フェーズ — フロントエンド

### Next.js App Router のコンポーネント分類

| 種別 | 宣言方法 | 特徴 | 用途 |
|------|---------|------|------|
| Server Component | （デフォルト） | サーバーで実行。JSバンドル増えない | 静的な表示、データ取得 |
| Client Component | `"use client"` を先頭に書く | ブラウザで実行。useState / useEffect が使える | クリック・入力など操作 |

### 状態管理: Lift State Up パターン

```
MemosPage（親）: selectedMemoId を持つ
  ├── MemoList（子）: クリックしたら親に selectedMemoId を通知
  └── MemoEditor（子）: selectedMemoId を受け取り内容を表示・編集
```

「兄弟コンポーネント間でデータを共有したいときは、共通の親に状態を引き上げる」
→ React の最も基本的な状態管理パターン。

### useCallback による最適化

```typescript
// NG: 毎レンダリングで新しい関数が生成される → useEffect の依存配列に入れると無限ループ
const loadMemos = async () => { ... };

// OK: 依存配列が変わったときだけ関数を再生成する
const loadMemos = useCallback(async () => { ... }, [searchQuery, selectedTag]);
```

---

## 7. デプロイフェーズ

### Railway（バックエンド）

- GitHub リポジトリと連携し、`main` ブランチへの push で自動デプロイ
- PostgreSQL も同じプロジェクト内で管理（`DATABASE_URL` を環境変数で渡す）
- Shell が UI から見えない場合は Procfile でマイグレーションを自動実行する方式が確実

**必要な環境変数:**
```
DATABASE_URL=<Railway PostgreSQL の接続文字列>
SECRET_KEY=<ランダムな長い文字列（openssl rand -hex 32 で生成）>
ALLOWED_ORIGINS=https://<Vercel のドメイン>
```

### Vercel（フロントエンド）

- GitHub リポジトリと連携し、`main` ブランチへの push で自動デプロイ
- Root Directory を `frontend` に設定することが重要（モノレポ構成のため）

**必要な環境変数:**
```
API_URL=https://<Railway のドメイン>
```

---

## 8. 踏んだバグと学び

### バグ① Server Component でクロスドメイン Cookie が読めない

**現象:** ログインしても `/memos` に遷移できず、ログインページに戻され続ける

**原因:**
- Railway が `access_token` Cookie を `.railway.app` ドメインに発行する
- Vercel の Next.js サーバーに届くリクエストには `.railway.app` の Cookie が含まれない
- Server Component の `cookies().get("access_token")` が `undefined` を返す → リダイレクト

```
ローカル: localhost:3000 と localhost:8000 → 同一ホスト → Cookie が共有される
本番:     vercel.app   と railway.app     → 別ドメイン  → Cookie が共有されない ← ここが落とし穴
```

**修正:**
- `memos/page.tsx` を Server Component から Client Component に変更
- ページ表示後、クライアントサイドで `GET /auth/me` を呼んで認証チェック

**学び:** 「ローカルで動く = 本番で動く」ではない。特に認証・Cookie はドメインに強く依存する。

---

### バグ② SameSite=Lax ではクロスオリジンで Cookie が保存されない

**現象:** ログインボタンを押しても画面が切り替わらない

**原因:**
```
SameSite=Lax: 同一ドメイン or トップレベルナビゲーションのみ Cookie を送受信
→ Vercel（フロント）から Railway（バック）へのクロスオリジンリクエストでは Cookie が保存されない
```

**修正:**
```python
# 変更前
response.set_cookie(key="access_token", ..., samesite="lax", secure=False)

# 変更後
response.set_cookie(key="access_token", ..., samesite="none", secure=True)
```

**ルール:**
- `SameSite=None` は必ず `Secure=True`（HTTPS）とセットで使う
- ローカル開発（HTTP）では `SameSite=None; Secure=True` は効かないが、Railway/Vercel は HTTPS なので問題ない

---

### バグ③ `__pycache__` が Git にコミットされた

**原因:** `.gitignore` に `__pycache__/` を追加する前にコミットしてしまった

**修正:**
```bash
git rm -r --cached __pycache__   # Git の追跡から外す（ファイルは削除しない）
git commit -m "chore: remove pycache from tracking"
```

**学び:** `.gitignore` はプロジェクト開始時に設定する。

---

## 9. 技術スタック一覧

| レイヤー | 技術 | 役割 |
|---------|------|------|
| フロントエンド | Next.js 15 (App Router) | UI・ページルーティング |
| スタイリング | Tailwind CSS v4 | ユーティリティファーストCSS |
| Markdown | react-markdown | Markdown → HTML レンダリング |
| バックエンド | FastAPI 0.115 | REST API サーバー |
| ORM | SQLAlchemy 2 | Python ↔ DB のマッピング |
| マイグレーション | Alembic | DB スキーマのバージョン管理 |
| 認証 | python-jose (JWT) | トークン生成・検証 |
| パスワード | passlib[bcrypt] | パスワードのハッシュ化 |
| データベース | PostgreSQL 16 | 本番DB |
| テスト DB | SQLite | テスト専用（本番DBを汚さない） |
| テスト | pytest | バックエンド自動テスト（20件） |
| フロントデプロイ | Vercel | Next.js の公式推奨PaaS |
| バックデプロイ | Railway | Python アプリのホスティング |

---

## 10. 次のステップ（Stage 2 に向けて）

Stage 1 で「動くものを作る」体験ができた。Stage 2 では「より良い設計を考える力」を鍛える。

**Stage 2 で強化する設計力:**
- より複雑な要件定義と ER 図設計
- API バージョニング・エラーハンドリングの設計
- パフォーマンスを意識したインデックス設計
- 認証の改善（リフレッシュトークン・セッション管理）

**Stage 1 の設計で残った課題:**
- ユーザー登録ページがない（現状は API を直接叩いて登録）
- エラーハンドリングが最小限（API エラーをもっと丁寧に表示する）
- テストがバックエンドのみ（フロントエンドの E2E テストがない）
- パスワードリセット機能がない

これらは Stage 2 の設計演習として取り組むと良い題材になる。

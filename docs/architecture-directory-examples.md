# 設計思想別ディレクトリ構造の比較

作成日: 2026-05-12

同じ「メモアプリ」を題材に、設計思想ごとのディレクトリ構造を比較する。

---

## 目次

1. [今回のプロジェクト（機能ベース + 軽量レイヤー）](#1-今回のプロジェクト機能ベース--軽量レイヤー)
2. [レイヤードアーキテクチャ](#2-レイヤードアーキテクチャ)
3. [MVC パターン](#3-mvc-パターン)
4. [フィーチャースライス](#4-フィーチャースライス)
5. [クリーンアーキテクチャ](#5-クリーンアーキテクチャ)
6. [DDD（ドメイン駆動設計）](#6-dddドメイン駆動設計)
7. [モジュラーモノリス](#7-モジュラーモノリス)
8. [比較まとめ](#8-比較まとめ)

---

## 1. 今回のプロジェクト（機能ベース + 軽量レイヤー）

```
backend/app/
├── auth/
│   ├── router.py        ← エンドポイント（/auth/login など）
│   ├── service.py       ← ビジネスロジック（JWT生成・パスワード検証）
│   └── dependencies.py  ← 依存関係（get_current_user）
├── memos/
│   ├── router.py        ← エンドポイント（/memos など）
│   └── service.py       ← ビジネスロジック（ILIKE検索・タグ絞り込み）
├── tags/
│   ├── router.py
│   └── service.py
├── models.py            ← 全モデルをまとめて定義
├── schemas.py           ← 全スキーマをまとめて定義
└── main.py              ← FastAPI エントリポイント
```

**特徴:**
- 機能単位でフォルダを分ける（auth / memos / tags）
- 各フォルダの中だけで router → service の流れが完結する
- models と schemas は小規模なので1ファイルにまとめている

**向いている規模:** 個人〜小規模チーム、学習用途

---

## 2. レイヤードアーキテクチャ

```
backend/app/
├── routers/             ← 【プレゼンテーション層】全エンドポイントをここに
│   ├── auth.py
│   ├── memos.py
│   └── tags.py
├── services/            ← 【ビジネスロジック層】全ビジネスロジックをここに
│   ├── auth_service.py
│   ├── memo_service.py
│   └── tag_service.py
├── repositories/        ← 【データアクセス層】DB操作をここに隠す
│   ├── memo_repository.py
│   └── tag_repository.py
├── models/              ← DBモデル定義
│   ├── user.py
│   ├── memo.py
│   └── tag.py
├── schemas/             ← Pydanticスキーマ
│   ├── auth.py
│   ├── memo.py
│   └── tag.py
└── main.py
```

**特徴:**
- 「役割（層）」でフォルダを分ける
- 上の層は下の層だけを呼ぶ（routers → services → repositories → models）
- 同じ機能のファイルが複数のフォルダに散らばる

**「メモ検索を修正したい」ときの移動:**
```
routers/memos.py      ← まずここを開く
  ↓
services/memo_service.py  ← 次にここ
  ↓
repositories/memo_repository.py  ← さらにここ
```

**向いている規模:** 小〜中規模チーム、機能よりも層の責任を明確にしたい場合

---

## 3. MVC パターン

```
backend/app/
├── controllers/         ← リクエストを受けて Model を呼び、レスポンスを返す
│   ├── auth_controller.py
│   ├── memo_controller.py
│   └── tag_controller.py
├── models/              ← データ構造 + ビジネスロジックをここに持つ（Modelが肥大化しやすい）
│   ├── user.py          ← User モデル + ユーザー関連のロジック
│   ├── memo.py          ← Memo モデル + メモ関連のロジック
│   └── tag.py
├── views/               ← レスポンスの形を定義（APIの場合はスキーマに相当）
│   ├── auth_view.py
│   └── memo_view.py
└── main.py
```

**特徴:**
- Controller がリクエストの入り口。Model を呼んでデータを取得し、View に渡す
- Web の世界では「View = HTMLテンプレート」だったが、REST API では「View = JSONの形」になる
- Model にビジネスロジックが集まりやすい

**向いている規模:** 小〜中規模。Rails や Django に慣れている人に馴染みやすい

---

## 4. フィーチャースライス

```
backend/app/
├── features/
│   ├── register_user/       ← ユーザー登録という1機能
│   │   ├── handler.py       ← エンドポイント
│   │   ├── service.py       ← ビジネスロジック
│   │   ├── schema.py        ← このエンドポイント専用のスキーマ
│   │   └── test.py          ← このエンドポイントのテスト
│   ├── login/
│   │   ├── handler.py
│   │   ├── service.py
│   │   ├── schema.py
│   │   └── test.py
│   ├── create_memo/
│   │   ├── handler.py
│   │   ├── service.py
│   │   ├── schema.py
│   │   └── test.py
│   ├── list_memos/
│   ├── update_memo/
│   ├── delete_memo/
│   ├── search_memos/
│   ├── create_tag/
│   └── delete_tag/
└── shared/                  ← 複数の機能で使う共通コード
    ├── database.py
    ├── auth_middleware.py
    └── models.py
```

**特徴:**
- 1つの機能（エンドポイント）に必要なものが全部1フォルダに入っている
- 機能を削除したいとき → フォルダごと削除するだけ
- 機能を追加したいとき → フォルダを1つ作るだけ
- 機能間で共通のコードは `shared/` にまとめる

**「メモ検索を修正したい」ときの移動:**
```
features/search_memos/  ← このフォルダだけ開けば完結
```

**向いている規模:** 中〜大規模チーム、マイクロサービスへの移行を見据えている場合

---

## 5. クリーンアーキテクチャ

```
backend/
├── domain/                      ← 【中心】フレームワークに一切依存しない
│   ├── entities/
│   │   ├── memo.py              ← Memo クラス（純粋な Python。FastAPI も SQLAlchemy も import しない）
│   │   ├── user.py
│   │   └── tag.py
│   ├── repositories/            ← 「DBから取得する」という契約（インターフェース定義のみ）
│   │   └── memo_repository.py   ← def find_by_id(id) → Memo  ← 実装は書かない
│   └── use_cases/               ← ビジネスロジック（エンティティを操作する）
│       ├── create_memo.py
│       ├── search_memos.py
│       └── delete_memo.py
│
├── infrastructure/              ← 【外側】技術的な詳細の実装
│   ├── database/
│   │   ├── sqlalchemy_memo_repository.py  ← domain で定義した契約の実装
│   │   └── models.py                      ← SQLAlchemy モデル
│   └── auth/
│       └── jwt_service.py
│
├── interfaces/                  ← 【外側】外部との接続
│   ├── api/
│   │   ├── routers/
│   │   │   ├── memos.py
│   │   │   └── auth.py
│   │   └── schemas/
│   └── cli/                     ← 将来 CLI からも呼べる（domain が独立しているから）
│
└── main.py
```

**特徴:**
- `domain/` は FastAPI も SQLAlchemy も知らない。純粋な Python だけ
- DB を PostgreSQL から MongoDB に変えても `domain/` は一切変更しない
- `infrastructure/` がその差を吸収する（Adapter パターン）
- コード量は今回の2〜3倍になる

**「PostgreSQL を MongoDB に変えたい」ときの変更範囲:**
```
infrastructure/database/ だけ変更
domain/ は一切触らない  ← ビジネスロジックが守られている
```

**向いている規模:** 中〜大規模、長期運用、DBやフレームワークの差し替えを想定している場合

---

## 6. DDD（ドメイン駆動設計）

```
backend/
├── memo_context/                ← 「メモ」という境界づけられたコンテキスト
│   ├── domain/
│   │   ├── memo.py              ← Memo エンティティ（ビジネスルールをメソッドとして持つ）
│   │   │   # memo.update_title(title) → タイトルのバリデーションロジックが中にある
│   │   │   # memo.add_tag(tag)  → タグ追加のビジネスルールが中にある
│   │   ├── memo_repository.py   ← インターフェース定義
│   │   └── events.py            ← MemoCreated, MemoDeleted などのドメインイベント
│   ├── application/
│   │   ├── create_memo_usecase.py
│   │   └── search_memos_usecase.py
│   └── infrastructure/
│       └── postgres_memo_repository.py
│
├── auth_context/                ← 「認証」という境界づけられたコンテキスト
│   ├── domain/
│   │   ├── user.py
│   │   └── password.py          ← パスワードはドメインの概念として独立させる
│   ├── application/
│   └── infrastructure/
│
└── shared_kernel/               ← 複数のコンテキストで共有する概念
    └── value_objects/
        └── user_id.py           ← UserId という型（文字列ではなく専用の型にする）
```

**特徴:**
- ビジネスの言葉（メモ・タグ・ユーザー）がそのままクラス名・メソッド名になる
- エンティティ自身がビジネスルールを持つ（`memo.add_tag()` の中にバリデーションがある）
- 「境界づけられたコンテキスト」という概念で、ドメインを独立した塊に分割する

**「タグは50文字以内」というルールの置き場所:**
```
# DDD でない場合（サービス層でバリデーション）
def create_tag(name):
    if len(name) > 50:
        raise ValueError("タグは50文字以内")

# DDD の場合（タグエンティティ自身が知っている）
class Tag:
    def __init__(self, name):
        if len(name) > 50:
            raise ValueError("タグは50文字以内")
        self.name = name
```

**向いている規模:** 大規模・複雑なビジネスルールを持つシステム（EC・金融・物流）

---

## 7. モジュラーモノリス

```
backend/
├── modules/
│   ├── auth/                    ← 認証モジュール（外から内部実装が見えない）
│   │   ├── __init__.py          ← 公開するものだけここに書く（public API）
│   │   │   # from .service import register_user, login  ← これだけ外に見せる
│   │   ├── _router.py           ← アンダースコア = モジュール内部。外から呼ばない
│   │   ├── _service.py
│   │   ├── _models.py           ← 認証モジュール専用のDB定義
│   │   └── _repository.py
│   │
│   ├── memos/                   ← メモモジュール
│   │   ├── __init__.py          ← public API
│   │   ├── _router.py
│   │   ├── _service.py
│   │   ├── _models.py
│   │   └── _repository.py
│   │
│   └── tags/
│       ├── __init__.py
│       ├── _router.py
│       ├── _service.py
│       └── _models.py
│
└── main.py
```

**特徴:**
- 1つのアプリだが、モジュール間の「壁」が明確
- `auth` モジュールの内部（`_service.py`）を `memos` モジュールが直接 import できない
- 将来マイクロサービスに分割するとき、モジュール境界がそのままサービス境界になる

**マイクロサービスへの移行パス:**
```
現在: 1つのアプリの中に auth/ memos/ tags/ が共存
  ↓（トラフィック増加・チーム拡大）
将来: auth サービス・memos サービス・tags サービスを独立デプロイ
     モジュールの境界がそのままサービスの境界になる
```

**向いている規模:** 中〜大規模。「いつかマイクロサービスにするかも」という組織に最適

---

## 8. 比較まとめ

| 設計思想 | コード量 | 学習コスト | 向いている規模 | 代表的な使用場面 |
|---------|---------|-----------|--------------|--------------|
| 機能ベース（今回） | 少 | 低 | 個人〜小規模 | 学習・個人開発 |
| レイヤード | 普通 | 低〜中 | 小〜中規模 | 一般的なWebアプリ |
| MVC | 普通 | 低 | 小〜中規模 | Rails・Django 系 |
| フィーチャースライス | 多 | 中 | 中〜大規模 | マイクロサービス移行前 |
| クリーンアーキテクチャ | 多 | 高 | 中〜大規模 | 長期運用・DB差し替えあり |
| DDD | 多 | 非常に高 | 大規模 | 複雑なビジネスルール |
| モジュラーモノリス | 多 | 中〜高 | 中〜大規模 | 将来マイクロサービス化を見据えるとき |

### 選び方の指針

```
「動くものを早く作りたい」
  → 機能ベース / MVC

「チームで開発していて、担当範囲を明確にしたい」
  → レイヤード / フィーチャースライス

「将来大きくなりそう、でも今は1つのアプリでいい」
  → モジュラーモノリス

「DBやフレームワークをいつか変えるかもしれない」
  → クリーンアーキテクチャ

「ビジネスが複雑で、エンジニアと非エンジニアが同じ言葉で話したい」
  → DDD
```

### Stage ごとの対応

| Stage | 設計思想 | 理由 |
|-------|---------|------|
| Stage 1（今回） | 機能ベース + 軽量レイヤー | 全体像を掴むことが優先 |
| Stage 2 | レイヤード / クリーンアーキテクチャ入門 | 設計力を鍛える |
| Stage 3（AWS移行） | モジュラーモノリス | スケールを意識した設計 |
| Stage 5（Kubernetes） | マイクロサービス / DDD | 本格的な大規模設計 |

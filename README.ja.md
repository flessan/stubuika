# Stubuika

### Android アプリやゲームをデスクトップで実行するための実験的な互換レイヤーです。

Stubuika は Android のシステムイメージを起動せず、APK などの Android パッケージをデスクトップ上で読み込むことを目指しています。ARM32 / ARM64 のコード実行、Android API、グラフィックス、メディアの対応は開発中です。

[ダウンロード](https://github.com/flessan/stubuika/releases) · [ドキュメント](docs/README.md) · [互換性](docs/compatibility.md) · [ギャラリー](docs/gallery.md) · [English](README.md)

> [!NOTE]
> **Stubuika は [Lunaria](https://github.com/yui0/lunaria) を基盤とするフォークです。** Lunaria は [Yuichiro Nakada](https://github.com/yui0) によって開発された元プロジェクトであり、Stubuika のランタイム構造と主要な実装の多くは Lunaria から受け継いでいます。Stubuika はその成果を尊重しながら開発を継続する派生プロジェクトであり、ゼロから作られた独立実装ではありません。詳しくは[プロジェクトの由来とクレジット](docs/attribution.md)を参照してください。

## 対応パッケージ

- APK — Android アプリパッケージ
- APKM — APKMirror の ZIP ベース split APK バンドル
- XAPK / APKS — split APK や OBB を含むパッケージアーカイブ
- AAB — Android App Bundle

APKM の読み込み方法や制限は[パッケージ形式](docs/package-formats.md)を参照してください。

## スクリーンショット

<p align="center">
  <img src="shots/genshin-mondstadt-night.png" width="100%" alt="Stubuika 上で動作する Genshin Impact">
</p>

対応状況はアプリやバージョン、ABI、OS、GPU ドライバーによって異なります。画面が表示されることは、すべての機能が動作することを意味しません。

## はじめる

Linux / macOS のインストール、Windows 版、ソースからのビルド方法は[インストールと開発](docs/installation.md)を参照してください。実際の動作状況は[互換性一覧](docs/compatibility.md)にまとめています。

## ドキュメント

- [インストールと開発](docs/installation.md)
- [パッケージ形式と APKM](docs/package-formats.md)
- [互換性](docs/compatibility.md)
- [ギャラリー](docs/gallery.md)
- [キーボード操作とキャプチャ](docs/controls.md)
- [ランタイム構成](docs/architecture.md)
- [設定](docs/configuration.md)
- [トラブルシューティング](docs/troubleshooting.md)
- [クレジットとライセンス](docs/attribution.md)

## ライセンス

[MPL-2.0](LICENSE)。Lunaria およびサードパーティコンポーネントの著作権・ライセンス表記を維持しています。

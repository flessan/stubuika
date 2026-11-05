# Attribution and project lineage

## Built on Lunaria

Stubuika is a **downstream fork and continuation of [Lunaria](https://github.com/yui0/lunaria)**, originally created by **[Yuichiro Nakada](https://github.com/yui0)**.

The foundation of this project is Lunaria. Its runtime architecture, Android compatibility work, native loading path, and a substantial part of the implementation were built upstream. Stubuika does not claim those foundations as original work, and it is not a ground-up reimplementation.

This fork exists to continue development on top of that work, with an Android-focused project identity and downstream changes such as package workflow improvements, APKMirror APKM support, maintenance, and additional validation. Upstream remains the source of the core project lineage.

Thank you to Yuichiro Nakada and the Lunaria project for creating the foundation that makes Stubuika possible.

- Upstream project: [yui0/Lunaria](https://github.com/yui0/lunaria)
- Upstream author: [Yuichiro Nakada](https://github.com/yui0)
- Downstream project: [flessan/stubuika](https://github.com/flessan/stubuika)

## Licensing

Stubuika is distributed under the [Mozilla Public License 2.0](../LICENSE). Original Lunaria copyright and license notices are retained in the source tree. Third-party components keep their respective licenses and notices; see the accompanying LICENSE files and vendored component directories.

The inherited LUNARIA_* runtime environment-variable namespace is retained for compatibility. Its presence is part of the project's technical lineage, not a claim that Stubuika is the upstream project.

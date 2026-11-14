# Attribution and project lineage

## Built on Lunaria

Stubuika is a **downstream fork and continuation of [Lunaria](https://github.com/yui0/lunaria)**, originally created by **[Yuichiro Nakada](https://github.com/yui0)**.

The foundation of this project is Lunaria. Its runtime architecture, Android compatibility work, native loading path, and a substantial part of the implementation were built upstream. Stubuika does not claim those foundations as original work, and it is not a ground-up reimplementation.

This fork exists to continue development on top of that work, with an Android-focused project identity and downstream changes such as package workflow improvements, APKMirror APKM support, maintenance, and additional validation. Upstream remains the source of the core project lineage.

Thank you to Yuichiro Nakada and the Lunaria project for creating the foundation that makes Stubuika possible.

- Upstream project: [yui0/Lunaria](https://github.com/yui0/lunaria)
- Upstream author: [Yuichiro Nakada](https://github.com/yui0)
- Downstream project: [flessan/stubuika](https://github.com/flessan/stubuika)

## Upstream integration

Stubuika tracks Lunaria's `master` and carries its runtime work rather than
cherry-picking around it. The most recent synchronisation integrated upstream
`yui0/lunaria` through commit `1a39e40` ("hash-indexed maps, cached native
lookup") on top of the last common point, `712985f`.

What that means in practice:

- The runtime sources are Lunaria's. Of the files both trees share at that
  point, 163 were byte-identical to upstream before the integration and 92
  carried semantic upstream changes, all of which are now present. Only a
  small, enumerated set of files carries Stubuika-specific edits.
- The sixteen files that existed only upstream were added, including the
  dedicated media implementation (`luna_media_codec.c`, `luna_media_format.c`,
  `luna_native_codec.c`, `luna_aac_encoder.c` and their headers), the CA-bundle
  support in `luna_certs.c`, the asset read-ahead cache
  (`file_read_cache.h`), the raster worker pool (`luna_raster_jobs.h`) and the
  Dalvik `java.util.stream` and `ShortcutInfo` bindings.
- `src/luna-ui` moved to upstream's `b213a8a`, which the integrated runtime
  requires: the overlay now calls `luna_set_persistent_texture_prefix()`,
  `luna_has_texture()` and `luna_set_position()`, none of which exist in the
  previous revision.

Stubuika's own changes on top of that baseline remain: the CLI and terminal
dashboard, APKM container handling, the macOS interface-MTU lookup, the
`unsigned char` ctype casts, the EGL failure diagnostics in the launcher and
the guest EGL initialiser, and the `stubuika.conf` / `stubuika.exe` /
`Stubuika` identity. Where upstream changed a file that Stubuika had also
changed, the upstream implementation was taken and the Stubuika change
re-applied to it, not the other way around.

Identifying internal names are deliberately *not* rewritten: `lunaria_*`
functions, the `lunaria_*.c` host-platform sources, the `Llunaria/...` Java
class descriptors, the `com.lunaria.app` fallback guest package, the
`LUNARIA_*` environment namespace and the original copyright headers all stay
as upstream wrote them.

## Licensing

Stubuika is distributed under the [Mozilla Public License 2.0](../LICENSE). Original Lunaria copyright and license notices are retained in the source tree. Third-party components keep their respective licenses and notices; see the accompanying LICENSE files and vendored component directories.

The inherited LUNARIA_* runtime environment-variable namespace is retained for compatibility. Its presence is part of the project's technical lineage, not a claim that Stubuika is the upstream project.

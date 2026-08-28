# @windpress/lz-string

Internal UTF-16 compression package used by WindPress cache storage.

The implementation is the relevant TypeScript subset of the unreleased `lz-string` 2.0 source from
the original `pieroxy/lz-string` repository. It replaces the former `pkg-pr-new` dependency on the
WindPress fork while preserving the exact compressed representation already stored by WindPress.

The compatibility fixtures were generated with the previously installed WindPress fork at commit
`68d6fca`. Keep them unchanged when updating the upstream implementation.

The source remains licensed under the MIT license and retains its original copyright headers. The
full third-party notice ships from `licenses/lz-string-MIT.txt` at the repository root.

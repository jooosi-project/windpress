# syntax=docker/dockerfile:1

FROM rust:bookworm AS toolchain

RUN cargo install wasm-pack --locked
RUN rustup target add wasm32-unknown-unknown

FROM toolchain AS builder

WORKDIR /build

COPY Cargo.toml ./
COPY LICENSE ./LICENSE
COPY src/lib.rs ./src/lib.rs

RUN --mount=type=cache,id=windpress-oxide-cargo-registry,target=/usr/local/cargo/registry,sharing=locked \
    --mount=type=cache,id=windpress-oxide-cargo-git,target=/usr/local/cargo/git,sharing=locked \
    --mount=type=cache,id=windpress-oxide-target,target=/build/target,sharing=locked \
    --mount=type=cache,id=windpress-oxide-wasm-pack,target=/root/.cache/.wasm-pack,sharing=locked \
    wasm-pack build --target web --out-dir /output --release

FROM scratch AS artifact

COPY --from=builder /output/oxide_parser.js /
COPY --from=builder /output/oxide_parser.d.ts /
COPY --from=builder /output/oxide_parser_bg.wasm /
COPY --from=builder /output/oxide_parser_bg.wasm.d.ts /
COPY --from=builder /output/package.json /

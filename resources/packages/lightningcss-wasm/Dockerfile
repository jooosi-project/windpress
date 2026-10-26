# syntax=docker/dockerfile:1

FROM rust:bookworm AS toolchain

RUN apt-get update \
    && apt-get install -y --no-install-recommends binaryen ca-certificates git \
    && rm -rf /var/lib/apt/lists/*

FROM toolchain AS builder

WORKDIR /build
ARG LIGHTNINGCSS_TAG=v1.33.0

RUN git clone --depth 1 --branch "$LIGHTNINGCSS_TAG" https://github.com/parcel-bundler/lightningcss.git lightningcss
COPY patches/prune-unused-features.patch /build/prune-unused-features.patch

RUN cd /build/lightningcss \
    && rustup toolchain install "$(sed -n 's/^channel = "\(.*\)"/\1/p' rust-toolchain.toml)" \
        --profile minimal \
        --target wasm32-unknown-unknown

RUN cd /build/lightningcss \
    && patch -p1 < /build/prune-unused-features.patch

RUN --mount=type=cache,id=windpress-lightningcss-cargo-registry,target=/usr/local/cargo/registry,sharing=locked \
    --mount=type=cache,id=windpress-lightningcss-cargo-git,target=/usr/local/cargo/git,sharing=locked \
    --mount=type=cache,id=windpress-lightningcss-target,target=/build/lightningcss/target,sharing=locked \
    cd /build/lightningcss \
    && cargo build --package lightningcss_node --target wasm32-unknown-unknown --release \
    && mkdir -p /output \
    && wasm-opt /build/lightningcss/target/wasm32-unknown-unknown/release/lightningcss_node.wasm \
        -Oz \
        -o /output/lightningcss_node.wasm

FROM scratch AS artifact

COPY --from=builder /output/lightningcss_node.wasm /

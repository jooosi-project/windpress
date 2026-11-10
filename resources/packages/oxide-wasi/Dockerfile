# syntax=docker/dockerfile:1

FROM node:22-bookworm AS builder

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential ca-certificates curl git \
    && rm -rf /var/lib/apt/lists/*

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs -o /tmp/rustup.sh \
    && sh /tmp/rustup.sh -y --profile minimal \
    && rm /tmp/rustup.sh

ENV PATH="/root/.cargo/bin:$PATH" CARGO_TARGET_DIR=/build/tailwindcss/target

ARG TAILWINDCSS_REV=076119ee834f9adface9ceb88c61ca7f5a57e866

WORKDIR /build/tailwindcss

RUN mkdir -p /build/tailwindcss \
    && curl -fsSL "https://github.com/suasgn/tailwindcss/archive/$TAILWINDCSS_REV.tar.gz" -o /tmp/tailwindcss.tar.gz \
    && tar -xzf /tmp/tailwindcss.tar.gz --strip-components=1 -C /build/tailwindcss \
    && rm /tmp/tailwindcss.tar.gz

RUN corepack enable \
    && rustup target add wasm32-wasip1 wasm32-wasip1-threads

RUN --mount=type=cache,id=windpress-oxide-wasi-pnpm,target=/root/.local/share/pnpm/store,sharing=locked \
    pnpm install --filter @tailwindcss/oxide... --frozen-lockfile

RUN --mount=type=cache,id=windpress-oxide-wasi-cargo-registry,target=/root/.cargo/registry,sharing=locked \
    --mount=type=cache,id=windpress-oxide-wasi-cargo-git,target=/root/.cargo/git,sharing=locked \
    --mount=type=cache,id=windpress-oxide-wasi-target,target=/build/tailwindcss/target,sharing=locked \
    pnpm --filter @tailwindcss/oxide run build:wasm \
    && pnpm --filter @tailwindcss/oxide run build:browser \
    && mkdir -p /output \
    && cp crates/node/npm/wasm32-wasi/browser.mjs /output/browser.mjs \
    && cp crates/node/npm/wasm32-wasi/browser.d.mts /output/browser.d.mts \
    && cp crates/node/npm/wasm32-wasi/index.d.ts /output/index.d.ts \
    && cp crates/node/npm/wasm32-wasi/tailwindcss-oxide.browser.wasm /output/tailwindcss-oxide.browser.wasm

FROM scratch AS artifact

COPY --from=builder /output/browser.mjs /
COPY --from=builder /output/browser.d.mts /
COPY --from=builder /output/index.d.ts /
COPY --from=builder /output/tailwindcss-oxide.browser.wasm /

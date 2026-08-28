<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();

const homeLink = router.resolve({ name: "home" });
</script>

<template>
  <div class="min-h-full w-full">
    <div
      class="h-full flex justify-center border border-b-0 border-(--ui-border-muted) relative p-4 z-[1]"
    >
      <div class="h-full flex flex-col items-center justify-center text-center">
        <p class="text-base font-semibold text-(--ui-primary)">404</p>
        <h1 class="mt-2 text-4xl sm:text-5xl font-bold text-(--ui-text-highlighted) text-balance">
          {{ i18n.__("Page not found", "windpress") }}
        </h1>
        <p class="mt-4 text-lg text-(--ui-text-muted) text-balance">
          {{ i18n.__("Sorry, we couldn’t find the page you’re looking for.", "windpress") }}
        </p>
        <div class="mt-8 flex items-center justify-center gap-6">
          <UButton
            :to="homeLink"
            size="lg"
            color="primary"
            variant="solid"
            :label="i18n.__('Back to home', 'windpress')"
          />
        </div>
      </div>
    </div>
  </div>
</template>

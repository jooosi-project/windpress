<script setup lang="ts">
import { __ } from '@wordpress/i18n';
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import type * as monacoEditor from 'modern-monaco/editor-core';
import { loadDashboardMonaco } from '@/dashboard/monaco-editor';

type MonacoEditor = typeof monacoEditor;

const props = withDefaults(
  defineProps<{
    value: string;
    path: string;
    language: string;
    options?: monacoEditor.editor.IStandaloneEditorConstructionOptions;
    theme?: string;
  }>(),
  {
    options: () => ({}),
    theme: 'vs',
  },
);

const emit = defineEmits<{
  'update:value': [value: string];
  mount: [editor: monacoEditor.editor.IStandaloneCodeEditor, monaco: MonacoEditor];
  change: [value: string];
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const monacoRef = shallowRef<MonacoEditor | null>(null);
const editorRef = shallowRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);
const isLoading = ref(true);
const hasLoadError = ref(false);
let contentSubscription: monacoEditor.IDisposable | null = null;
let disposed = false;

function getOrCreateModel(
  monaco: MonacoEditor,
  path: string,
  value: string,
  language: string,
): monacoEditor.editor.ITextModel {
  const uri = monaco.Uri.parse(path);
  const model = monaco.editor.getModel(uri) ?? monaco.editor.createModel(value, language, uri);

  if (model.getValue() !== value) {
    model.setValue(value);
  }

  if (model.getLanguageId() !== language) {
    monaco.editor.setModelLanguage(model, language);
  }

  return model;
}

async function createEditor(): Promise<void> {
  try {
    const monaco = await loadDashboardMonaco();

    if (disposed || !containerRef.value) {
      return;
    }

    const model = getOrCreateModel(monaco, props.path, props.value, props.language);
    const editor = monaco.editor.create(containerRef.value, {
      ...props.options,
      model,
      theme: props.theme,
    });

    monacoRef.value = monaco;
    editorRef.value = editor;
    isLoading.value = false;
    contentSubscription = editor.onDidChangeModelContent(() => {
      const value = editor.getValue();
      emit('update:value', value);
      emit('change', value);
    });

    emit('mount', editor, monaco);
  } catch (error) {
    if (!disposed) {
      hasLoadError.value = true;
      console.error('Monaco initialization error:', error);
    }
  }
}

watch(
  [() => props.path, () => props.value, () => props.language],
  ([path, value, language], [previousPath, previousValue, previousLanguage]) => {
    const editor = editorRef.value;
    const monaco = monacoRef.value;

    if (!editor || !monaco) {
      return;
    }

    if (path !== previousPath) {
      editor.setModel(getOrCreateModel(monaco, path, value, language));
      return;
    }

    if (value !== previousValue && editor.getValue() !== value) {
      editor.setValue(value);
    }

    const model = editor.getModel();
    if (model && language !== previousLanguage && model.getLanguageId() !== language) {
      monaco.editor.setModelLanguage(model, language);
    }
  },
);

watch(
  () => props.options,
  (options) => editorRef.value?.updateOptions(options),
  { deep: true },
);

watch(
  () => props.theme,
  (theme) => monacoRef.value?.editor.setTheme(theme),
);

onMounted(() => {
  void createEditor();
});

onBeforeUnmount(() => {
  disposed = true;
  contentSubscription?.dispose();

  const editor = editorRef.value;
  if (editor) {
    const model = editor.getModel();
    editor.dispose();
    model?.dispose();
  }

  editorRef.value = null;
  monacoRef.value = null;
});
</script>

<template>
  <div class="relative h-full w-full">
    <div
      v-if="isLoading || hasLoadError"
      class="absolute inset-0 z-10 flex items-center justify-center text-muted"
      role="status"
      aria-live="polite"
    >
      {{
        hasLoadError
          ? __('Editor failed to load.', 'windpress')
          : __('Loading editor…', 'windpress')
      }}
    </div>
    <div ref="containerRef" class="h-full w-full" />
  </div>
</template>

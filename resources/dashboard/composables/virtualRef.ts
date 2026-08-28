import { customRef, ref } from "vue";
import { useStorage } from "@vueuse/core";
import { get, set } from "lodash-es";

export type VirtualRefOptions = {
  persist?: string;
};

export type VirtualRef = {
  state: ReturnType<typeof ref> | ReturnType<typeof useStorage>;
  getVirtualRef: (path: string, initialValue: any) => ReturnType<typeof customRef>;
};

export function createVirtualRef(initialState: any, options?: VirtualRefOptions): VirtualRef {
  const state = options?.persist ? useStorage(options.persist, initialState) : ref(initialState);

  const customRefs: Record<string, ReturnType<typeof customRef>> = {};

  function getVirtualRef(path: string, initialValue: any): ReturnType<typeof customRef> {
    if (!customRefs[path]) {
      customRefs[path] = customRef((track, trigger) => {
        return {
          get() {
            track();
            return get(state.value, path, initialValue);
          },
          set(value) {
            set(state.value, path, value);
            trigger();
          },
        };
      });
    }
    return customRefs[path];
  }

  return {
    state,
    getVirtualRef,
  };
}

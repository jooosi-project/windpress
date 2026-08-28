function objURL(workerUrl: string) {
  const js = `import ${JSON.stringify(new URL(workerUrl, import.meta.url))}`;
  const blob = new Blob([js], { type: "application/javascript" });
  const objURL = URL.createObjectURL(blob);

  return objURL;
}

export function WorkaroundWorker(workerUrl: string, options: { name?: string } = {}) {
  const url = objURL(workerUrl);

  const worker = new Worker(url, { type: "module", name: options?.name });
  worker.addEventListener("error", (e) => {
    URL.revokeObjectURL(url);
  });

  return worker;
}

export function WorkaroundSharedWorker(workerUrl: string, options: { name?: string } = {}) {
  const url = objURL(workerUrl);

  const worker = new SharedWorker(url, { type: "module", name: options?.name });
  worker.addEventListener("error", (e) => {
    URL.revokeObjectURL(url);
  });

  return worker;
}

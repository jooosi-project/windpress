import processTailwindFeatures from "tailwindcss3/src/processTailwindFeatures";

export default Object.assign(
  function (config, contents) {
    return {
      postcssPlugin: "tailwindcss",
      async Once(root, { result }) {
        await processTailwindFeatures(({ createContext }) => {
          return () => createContext(config, contents);
        })(root, result);
      },
    };
  },
  { postcss: true },
);

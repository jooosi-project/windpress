import * as csstree from "css-tree";

const links = document.querySelectorAll(
  'link[rel="stylesheet"][href*="wp-admin/load-styles.php"], link[rel="stylesheet"][href*="wp-admin/css/colors/"]',
);

// reverse the links to load the last one first
Array.from(links)
  .reverse()
  .forEach((link) => {
    if (link instanceof HTMLLinkElement) {
      fetch(link.href)
        .then((res) => res.text())
        .then((css) => {
          const style = document.createElement("style");
          style.textContent = dontTouchMe(css);
          document.head.prepend(style);
          link.remove();
        });
    }
  });

function dontTouchMe(css: string) {
  const ast = csstree.parse(css);

  csstree.walk(ast, {
    enter: (node, item, list) => {
      if (node.type === "Atrule" && node.name === "keyframes") {
        return csstree.walk.skip;
      }

      if (node.type === "SelectorList") {
        node.children.forEach((selector) => {
          // if not the following Pseudo classes are present, skip
          if (
            selector.children.some(
              (child) =>
                child.type === "PseudoClassSelector" &&
                ![
                  "visible",
                  "hover",
                  "focus",
                  "focus-visible",
                  "focus-within",
                  "target",
                  "read-write",
                  "active",
                  "visited",
                  "link",
                ].includes(child.name),
            )
          ) {
            return;
          }

          // add :not(#wpbody *)
          selector.children.push({
            type: "PseudoClassSelector",
            name: "not",
            children: [
              {
                type: "ClassSelector",
                name: "windpress-style",
              },
              {
                type: "Combinator",
                name: " ",
              },
              {
                type: "TypeSelector",
                name: "*",
              },
            ],
          });
        });
      }
    },
  });

  return csstree.generate(ast);
}

// document.body.classList.add('folded');

const wpbody = document.querySelector("#wpbody");
if (wpbody) {
  wpbody.classList.add("windpress-style");
}

// watch for changes in the body element and add the class windpress-style to windpress' element
const observer = new MutationObserver((mutationsList) => {
  for (const mutation of mutationsList) {
    if (mutation.type === "childList" && mutation.addedNodes.length) {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement && !node.closest("#wpbody") && node.dataset) {
          Object.keys(node.dataset).forEach((key) => {
            if (key.startsWith("reka") || key.startsWith("dismissable")) {
              node.classList.add("windpress-style");
            }
          });
        }
      });
    }
  }
});
observer.observe(document.body, { childList: true, subtree: false });

/**
 * Log message to console
 *
 * @param {string} msg The message to log
 * @param {Object} options The options
 * @param {'log'|'warn'|'error'|'info'} options.type The type of log
 * @param {string} options.module The module name
 */
export function logger() {
  let args = Array.from(arguments);
  let options = { type: "log", module: null };
  if (args.length > 1 && typeof args[args.length - 1] === "object") {
    let lastArg = args.pop();

    if (lastArg.hasOwnProperty("type") || lastArg.hasOwnProperty("module")) {
      options = { ...options, ...lastArg };
    } else {
      args.push(lastArg);
    }
  }

  args.unshift(
    `%cWindPress ⚡ ${options.module ? "[" + options.module + "]" : ""}`,
    "background: #5a5a5a; color: white; padding: 2px 3px; border-radius: 2px; font-size: 0.8em;",
  );

  console[options.type](...args);
}

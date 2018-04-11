const chokidar = require("chokidar");

function watch(globPath) {
  const watcher = chokidar.watch(globPath, { ignored: /node_modules/ });

  const eventMap = {
    create: "add",
    change: "change",
    delete: "unlink"
  };
  return {
    on(eventNames, fn) {
      eventNames
        .split(/\s+/)
        .forEach(
          name =>
            name &&
            eventMap[name.toLowerCase()] &&
            watcher.on(
              eventMap[name.toLowerCase()],
              fn.bind(null, name.toLowerCase())
            )
        );
      return this;
    },
    close() {
      watcher.close();
    }
  };
}

module.exports = watch;

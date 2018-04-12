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
        .filter(name => name)
        .map(name => name.toLowerCase())
        .forEach(
          name =>
            eventMap[name] && watcher.on(eventMap[name], fn.bind(null, name))
        );
      return this;
    },
    close() {
      watcher.close();
    }
  };
}

module.exports = watch;

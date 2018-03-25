var fs = require("fs");
var assert = require("assert");
var chokidar = require("chokidar");
var chalk = require("chalk");
var proxy = require("express-http-proxy");
var url = require("url");
var path = require("path");
var glob = require("glob");
var { existsSync, realpathSync } = fs;
var { join, resolve } = path;
var bodyParser = require("body-parser");

function getPaths(cwd) {
  const appDirectory = realpathSync(cwd);
  function resolveApp(relativePath) {
    return resolve(appDirectory, relativePath);
  }

  return {
    resolveApp,
    appDirectory
  };
}

const debug = require("debug")("roadhog:mock");

let error = null;
const paths = getPaths(process.cwd());
const configFile = paths.resolveApp(".roadhogrc.mock.js");
const mockDir = paths.resolveApp("./mock/");
function getConfig() {
  if (existsSync(configFile)) {
    // disable require cache
    Object.keys(require.cache).forEach(file => {
      if (file === configFile || file.indexOf(mockDir) > -1) {
        debug(`delete cache ${file}`);
        delete require.cache[file];
      }
    });
    let config = require(configFile);
    getEntry(`${mockDir}/*.js`).forEach(file => {
      Object.assign(config, require(file));
    });
    return config;
  } else {
    return {};
  }
}

console.log(getEntry(`${mockDir}/**/*.js`));

function getEntry(path) {
  return glob.sync(path);
}

function createMockHandler(method, path, value) {
  return function mockHandler(...args) {
    if (typeof value === "function") {
      value(...args);
    } else {
      args[1].json(value);
    }
  };
}

function createProxy(method, path, target) {
  return proxy(target, {
    filter(req) {
      return method ? req.method.toLowerCase() === method.toLowerCase() : true;
    },
    proxyReqPathResolver(req) {
      let matchPath = req.originalUrl;
      const matches = matchPath.match(path);
      if (matches.length > 1) {
        matchPath = matches[1];
      }
      return join(url.parse(target).path, matchPath).replace(/\\/g, "/");
    }
  });
}

function realApplyMock(devServer) {
  const config = getConfig();
  const { app } = devServer;

  devServer.use(bodyParser.json({ limit: "5mb", strict: false }));
  devServer.use(bodyParser.urlencoded({ extended: true, limit: "5mb" }));

  Object.keys(config).forEach(key => {
    const { method, path } = parseKey(key);
    const val = config[key];
    const typeVal = typeof val;
    assert(!!app[method], `method of ${key} is not valid`);
    assert(
      ["function", "object", "string"].includes(typeVal),
      `mock value of ${key} should be function or object or string, but got ${typeVal}`
    );
    if (typeVal === "string") {
      // url转发的情形  /api/test  =>   https://www.shiguangkey.com/api/mine
      if (/\(.+\)/.test(path)) {
        path = new RegExp(`^${path}$`);
      }
      app.use(path, createProxy(method, path, val));
    } else {
      app[method](path, createMockHandler(method, path, val));
    }
  });

  // 调整 stack，把 historyApiFallback 放到最后
  let lastIndex = null;
  app._router.stack.forEach((item, index) => {
    if (item.name === "webpackDevMiddleware") {
      lastIndex = index;
    }
  });
  const mockAPILength = app._router.stack.length - 1 - lastIndex;
  if (lastIndex && lastIndex > 0) {
    const newStack = app._router.stack;
    newStack.push(newStack[lastIndex - 1]);
    newStack.push(newStack[lastIndex]);
    newStack.splice(lastIndex - 1, 2);
    app._router.stack = newStack;
  }

  const watcher = chokidar.watch([configFile, mockDir], {
    ignored: /node_modules/,
    persistent: true
  });
  watcher.on("change", path => {
    console.log(chalk.green("CHANGED"), path.replace(paths.appDirectory, "."));
    watcher.close();

    // 删除旧的 mock api
    app._router.stack.splice(lastIndex - 1, mockAPILength);

    applyMock(devServer);
  });
}

function parseKey(key) {
  let arr = key.trim().split(/\s+/);
  let [method, path] = arr;
  if (!path) {
    path = method;
    method = "get";
  }
  return { method, path };
}

function outputError() {
  if (!error) return;

  const filePath = error.message.split(": ")[0];
  const relativeFilePath = filePath.replace(paths.appDirectory, ".");
  const errors = error.stack
    .split("\n")
    .filter(line => line.trim().indexOf("at ") !== 0)
    .map(line => line.replace(`${filePath}: `, ""));
  errors.splice(1, 0, [""]);

  console.log(chalk.red("Failed to parse mock config."));
  console.log();
  console.log(`Error in ${relativeFilePath}`);
  console.log(errors.join("\n"));
  console.log();
}

function applyMock(devServer) {
  try {
    realApplyMock(devServer);
    error = null;
  } catch (e) {
    console.log(e);
    error = e;

    console.log();
    outputError();

    const watcher = chokidar.watch([configFile, mockDir], {
      ignored: /node_modules/,
      ignoreInitial: true
    });
    watcher.on("change", path => {
      console.log(
        chalk.green("文件修改："),
        path.replace(paths.appDirectory, ".")
      );
      watcher.close();
      applyMock(devServer);
    });
  }
}

module.exports = applyMock;

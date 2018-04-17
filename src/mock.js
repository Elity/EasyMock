const fs = require("fs");
const url = require("url");
const path = require("path");
const glob = require("glob");
const assert = require("assert");
const proxy = require("express-http-proxy");
const middleware = require("./middleware");
const log = require("./log");
const { join, resolve, dirname } = path;

let MOCK_DIR;
let MOCK_FILES;
let ENABLE_PARSE;
let APP;
let WATCH; // 内置文件观察器
let BUILD_IN_SERVER; //内置服务器
let watcher = null;

/**
 * 删除require缓存，并加载所有mock文件
 */
function getConfig() {
  Object.keys(require.cache).forEach(file => {
    if (~file.indexOf(MOCK_DIR)) {
      delete require.cache[file];
    }
  });
  let config = {};
  glob.sync(MOCK_FILES).forEach(file => {
    try {
      Object.assign(config, require(file));
    } catch (e) {
      log.err("Error:" + e.message + ",at " + file);
    }
  });
  return config;
}

/**
 * mock路由处理
 * @param {*} method
 * @param {*} path
 * @param {*} value
 */
function createMockHandler(method, path, value) {
  return function mockHandler(req, res) {
    let data = typeof value === "function" ? value(req) : value;
    if (ENABLE_PARSE !== false) {
      let mockParse = require("./parse");
      data = mockParse(data);
    }
    res.json(data);
  };
}

/**
 * mock路由转发
 * @param {*} method
 * @param {*} path
 * @param {*} target
 */
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

/**
 * 根据加载的数据类型分情况处理mock数据
 */
function realApplyMock() {
  const config = getConfig();
  Object.keys(config).forEach(key => {
    const { method, path } = parseKey(key);
    const val = config[key];
    const typeVal = typeof val;
    assert(!!APP[method], `method of ${key} is not valid`);
    assert(
      ["function", "object", "string"].includes(typeVal),
      `mock value of ${key} should be function or object or string, but got ${typeVal}`
    );
    if (typeVal === "string") {
      // url转发的情形  /api/test  =>   https://www.xxx.com/api/test
      if (/\(.+\)/.test(path)) {
        path = new RegExp(`^${path}$`);
      }
      APP.use(path, createProxy(method, path, val));
    } else {
      APP[method](path, createMockHandler(method, path, val));
    }
  });

  let lastIndex = null;
  APP._router.stack.some((item, index) => {
    if (item.name === "HelloEasyMockMiddleware") {
      lastIndex = index;
      return true;
    }
  });

  watcher = WATCH(MOCK_FILES).on("change delete create", (type, fsPath) => {
    log.info(`File changed(${type}):${fsPath}`);
    if (type === "create") initMockFile(fsPath);
    watcher.close();
    APP._router.stack.splice(lastIndex + 1);
    applyMock();
  });
}

/**
 * 解析key中的请求方式与api地址
 * get /api/a/b
 * @param {*} key
 */
function parseKey(key) {
  let arr = key.trim().split(/\s+/);
  let [method, path] = arr;
  if (!path) {
    path = method;
    method = "get";
  }
  return { method, path };
}
/**
 * 新建mock文件时，向里面写入导出语句模版
 * @param {*} filePath
 */
function initMockFile(filePath) {
  if (!fs.readFileSync(filePath, { encoding: "utf8" })) {
    fs.writeFileSync(
      filePath,
      `module.exports = {
     
}`
    );
  }
}

/**
 * 内部循环处理mock的方法
 */
function applyMock() {
  try {
    realApplyMock();
  } catch (e) {
    log.err(e);
    watcher = WATCH(MOCK_FILES).on(
      "change delete create",
      (type, { fsPath }) => {
        log.info(`File changed(${type}):${fsPath}`);
        if (type === "create") initMockFile(fsPath);
        watcher.close();
        applyMock();
      }
    );
  }
}

/**
 * 对express服务器使用跨域中间件与用于路由定位的中间件
 */
function applyMiddleware() {
  APP.use(middleware.corsMiddleware());
  APP.use("/hello/easymock", middleware.HelloEasyMockMiddleware());
}

function isFile(path) {
  return fs.lstatSync(path).isFile();
}

/**
 * 对外暴露的启动mock的方法
 * @param {*} mockDir
 * @param {*} param1
 */
function startMock(mockDir, { enableParse, app, watch, port = 9999 } = {}) {
  if (!mockDir)
    return Promise.reject(new TypeError("`mockDir` should be a string type"));
  MOCK_DIR = mockDir;
  if (isFile(MOCK_DIR)) {
    MOCK_FILES = MOCK_DIR;
    MOCK_DIR = dirname(MOCK_DIR);
  } else {
    MOCK_FILES = join(MOCK_DIR, "*.js");
  }
  ENABLE_PARSE = enableParse;
  APP = app;
  WATCH = watch || require("./watch");
  if (APP) {
    applyMiddleware();
    applyMock();
    return Promise.resolve(APP);
  } else {
    return new Promise((resolve, reject) => {
      BUILD_IN_SERVER = require("./server");
      resolve(
        BUILD_IN_SERVER.start(MOCK_DIR, port).then(app => {
          APP = app;
          applyMiddleware();
          applyMock();
          return app;
        })
      );
    });
  }
}

/**
 * 对外暴露的停止mock的方法
 */
function stopMock() {
  watcher && watcher.close && watcher.close();
  BUILD_IN_SERVER && BUILD_IN_SERVER.stop();
}

module.exports = { startMock, stopMock };

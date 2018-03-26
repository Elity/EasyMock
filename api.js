var fs = require("fs");
var glob = require("glob");
var path = require("path");

function getMockFileList(dir) {
  return function apiGetFileList(res, req) {
    req.json({
      status: 0,
      data: glob.sync(dir + "/*.js").map(filePath => path.parse(filePath).name)
    });
  };
}

function getMockApiList(dir) {
  return function apiGetApiList(res, req) {
    let all = require(dir + "/" + res.body.file);
    req.json({
      status: 0,
      data: Object.keys(all).map(method => ({
        method,
        body: JSON.stringify(all[method] || {})
      }))
    });
  };
}

function setMockApi(dir) {
  return function apiSetApi(res, req) {
    let file = dir + "/" + res.body.file + ".js";
    let all = {};
    if (fs.existsSync(file)) {
      all = require(file);
    }
    try {
      all[res.body.method] = JSON.parse(res.body.body);
    } catch (e) {
      req.json({
        status: 1,
        msg: e.message
      });
      return;
    }
    fs.writeFileSync(file, `module.exports=${JSON.stringify(all)}`);
    req.json({
      status: 0
    });
  };
}

module.exports = {
  getMockFileList,
  getMockApiList,
  setMockApi
};

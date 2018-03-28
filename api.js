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
    let all;
    try {
      all = require(dir + "/" + res.body.file);
    } catch (e) {
      all = {};
    }

    req.json({
      status: 0,
      data: Object.keys(all).map(method => ({
        method,
        body: JSON.stringify(all[method] || {})
      }))
    });
  };
}

function addMockModule(dir) {
  return function apiAddModule(res, req) {
    let file = dir + "/" + res.body.file + ".js";
    fs.writeFileSync(file, `module.exports={}`);
    req.json({
      status: 0
    });
  };
}

function addMockApi(dir) {
  return function apiAddApi(res, req) {
    let file = dir + "/" + res.body.file + ".js";
    let all = {};
    if (fs.existsSync(file)) {
      all = require(file);
    }
    all[res.body.method] = {};
    fs.writeFileSync(file, `module.exports=${JSON.stringify(all)}`);
    req.json({
      status: 0,
      data: {}
    });
  };
}

function changeMockApi(dir) {
  return function apiChangeApi(res, req) {
    let file = dir + "/" + res.body.file + ".js";
    let all = {};
    if (fs.existsSync(file)) {
      all = require(file);
    }
    if (all[res.body.new]) {
      req.json({
        status: 1,
        msg: `已存在接口：${res.body.old}`
      });
      return;
    }
    all[res.body.new] = all[res.body.old];
    delete all[res.body.old];
    fs.writeFileSync(file, `module.exports=${JSON.stringify(all)}`);
    req.json({
      status: 0
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

function delMockModule(dir) {
  return function apiDelModule(res, req) {
    let file = dir + "/" + res.body.file + ".js";
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
    req.json({
      status: 0
    });
  };
}

function delMockApi(dir) {
  return function apiDelApi(res, req) {
    let file = dir + "/" + res.body.file + ".js";
    let all = {};
    if (fs.existsSync(file)) {
      all = require(file);
    }
    delete all[res.body.method];
    fs.writeFileSync(file, `module.exports=${JSON.stringify(all)}`);
    req.json({
      status: 0
    });
  };
}

module.exports = {
  getMockFileList,
  getMockApiList,
  setMockApi,
  addMockModule,
  changeMockApi,
  addMockApi,
  delMockModule,
  delMockApi
};

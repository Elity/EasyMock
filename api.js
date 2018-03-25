var glob = require("glob");
var path = require("path");

function getFileList(dir) {
  return function apiGetFileList(res, req) {
    req.json({
      status: 0,
      data: glob.sync(dir + "/*.js").map(filePath => path.parse(filePath).name)
    });
  };
}

function getApiList(dir) {
  return function apiGetApiList(res, req) {
    let all = require(dir + "/" + res.body.file);
    req.json({
      status: 0,
      data: Object.keys(all).map(method => ({
        method,
        body: JSON.stringify(all[method])
      }))
    });
  };
}

module.exports = {
  getFileList,
  getApiList
};

const expect = require("chai").expect;
const watch = require("../src/watch");
const path = require("path");
const fs = require("fs");
//const sinon = require("sinon");

describe("watch test", function() {
  it("should emit `create`,`delete` event when file was create and delete", function(done) {
    let file = path.resolve("./test/api/create.js");
    let wc = watch(file);
    wc.on("ready", function() {
      wc.on("create", function() {
        fs.unlinkSync(file);
      });
      wc.on("delete", function() {
        wc.close();
        done();
      });
      fs.writeFileSync(file, Date.now());
    });
  });

  it("should emit `change` event when file was changed", function(done) {
    let file = path.resolve("./test/api/apitest.js");
    let wc = watch(file);
    wc.on("ready", function() {
      wc.on("change", function() {
        wc.close();
        done();
      });
      fs.writeFileSync(file, Date.now());
    });
  });
});

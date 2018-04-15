const expect = require("chai").expect;
const watch = require("../src/watch");
const path = require("path");
const fs = require("fs");
const sinon = require("sinon");

function waitFor(spies, fn) {
  function isSpyReady(spy) {
    return Array.isArray(spy) ? spy[0].callCount >= spy[1] : spy.callCount;
  }
  function finish() {
    clearInterval(intrvl);
    clearTimeout(to);
    fn();
    fn = Function.prototype;
  }
  let intrvl = setInterval(function() {
    if (spies.every(isSpyReady)) finish();
  }, 5);
  let to = setTimeout(finish, 3500);
}

describe("watch test", function() {
  it("should emit `create` event when file was changed", function(done) {
    let file = path.resolve("./test/api/create.js");
    let spy = sinon.spy();
    watch(file)
      .on("create", spy)
      .on("ready", function() {
        expect(spy.notCalled).to.be.ok;
        fs.writeFileSync(file, Date.now());
        setTimeout(() => {
          expect(spy.calledOnce).to.be.ok;
          done();
        }, 100);
      });
  });

  it("should emit `change` event when file was changed", function(done) {
    let file = path.resolve("./test/api/apitest.js");
    let spy = sinon.spy();
    watch(file)
      .on("change", spy)
      .on("ready", function() {
        expect(spy.notCalled).to.be.ok;
        fs.writeFileSync(file, Date.now());
        setTimeout(() => {
          expect(spy.calledOnce).to.be.ok;
          done();
        }, 100);
      });
  });
});

const expect = require("chai").expect;
const request = require("supertest");
const mock = require("..");
const path = require("path");
const fs = require("fs");

describe("mock test", function() {
  it("mock.startMock() should return a promise", function() {
    expect(mock.startMock()).to.be.a("promise");
  });

  it("mock.startMock() should return promise with reject", function(done) {
    mock
      .startMock()
      .then(app => done(new Error()))
      .catch(err => done());
  });

  const mockServer = mock.startMock(path.resolve("./test/api"));

  it("mock.startMock(path) should return promise with resolved value express application", function() {
    return mockServer.then(app => {
      if (app.get) return;
      throw Error();
    });
  });

  it("mock.startMock(path) should mock api.js in the path", function() {
    return mockServer.then(app => {
      return request(app)
        .get("/api/test")
        .expect(200)
        .then(res => {
          expect(res.body.msg).to.be.equal("hello test");
        });
    });
  });
  // it("mock.startMock(path) should listen file change in the path", function() {
  //   const file = path.resolve("./test/api/api.js");
  //   const msg = "hello test new";
  //   obj = {
  //     "/api/test/new": { msg }
  //   };
  //   const bkObj = { "/api/test": { msg: "hello test" } };
  //   fs.writeFileSync(file, `module.exports=${JSON.stringify(obj)}`);
  //   return new Promise((resolve, reject) => {
  //     setTimeout(() => {
  //       resolve(
  //         mockServer.then(app => {
  //           return request(app)
  //             .get("/api/test/new")
  //             .expect(200)
  //             .then(res => {
  //               expect(res.body.msg).to.be.equal(msg);
  //               fs.writeFileSync(
  //                 file,
  //                 `module.exports=${JSON.stringify(bkObj)}`
  //               );
  //               //fs.unlinkSync(file);
  //             });
  //         })
  //       );
  //     }, 1000);
  //   });
  // });
});

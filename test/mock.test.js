const expect = require("chai").expect;
const request = require("supertest");
const mock = require("..");
const path = require("path");

describe("test", function() {
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
          mock.stopMock();
        });
    });
  });
});

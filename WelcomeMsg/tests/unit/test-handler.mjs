"use strict";

import { lambdaHandler } from "../../app.mjs";
import { expect } from "chai";
const event = { requestContext: { http: { method: "GET" } } };
const context = {};

describe("WelcomeMsgFunction", function () {
  it("returns a random message", async () => {
    const result = await lambdaHandler(event, context);
    expect(result.statusCode).to.equal(200);
    let response = JSON.parse(result.body);
    console.log("Returned message:", response.message);
    expect(response.message).to.be.a("string").and.not.empty;
  });
});

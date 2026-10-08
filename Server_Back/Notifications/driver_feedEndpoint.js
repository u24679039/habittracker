// driver_feedEndpoint.js
// Not a unit test - this is a DRIVER: a fake caller that simulates how a
// real Express route would eventually call buildGroupFeed, proving this
// code is ready to be wired into the real API without changes.
// Run with: node backend/driver_feedEndpoint.js

const { buildGroupFeed } = require("./feedAggregationService");

// This pretends to be what Express would hand us: a request with a group
// ID in it, and a response object we're expected to send data back through.
function fakeExpressRoute(fakeRequest, fakeResponse) {
  const groupId = fakeRequest.params.groupId;
  const feed = buildGroupFeed(groupId);
  fakeResponse.json(feed);
}

// Simulate an incoming request for group 100's feed.
const fakeRequest = { params: { groupId: 100 } };

// Simulate Express's response object - normally this would actually send
// data back to a browser; here it just prints what WOULD have been sent.
const fakeResponse = {
  json: (data) => {
    console.log("GET /groups/100/feed would respond with:");
    console.log(JSON.stringify(data, null, 2));
  },
};

fakeExpressRoute(fakeRequest, fakeResponse);
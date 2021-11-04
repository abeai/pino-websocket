#!/usr/bin/env node

const nopt = require("nopt");
const linebyline = require("linebyline");
const buffer = require("buffer");
let options = {
  address: "127.0.0.1",
  port: "514",
  path: "/",
  echo: true,
  reconnect: true,
  reconnectTries: Infinity,
};
const longOpts = {
  address: String,
  port: Number,
  path: String,
  reconnect: Boolean,
  reconnectTries: Number,
  echo: Boolean,
  debug: Boolean,
};
const shortOpts = {
  a: "--address",
  p: "--port",
  pa: "--path",
  r: "--reconnect",
  t: "--reconnectTries",
  e: "--echo",
  d: "--debug",
};
const argv = nopt(longOpts, shortOpts, process.argv);

options = Object.assign(options, argv);

if (options.debug) {
  console.log("Starting up!");
}

const webSocketStream = require("./lib/websocket")(options);
linebyline(process.stdin, {
  maxLineLength: buffer.constants.MAX_LENGTH,
}).on("line", (chunk) => {
  webSocketStream.write(chunk);
});

process.stdin.on("close", () => {
  process.exit(0);
});

"use strict";

const WebSocket = require("ws");
const stream = require("stream");
const backoff = require("backoff");

module.exports = function factory(options) {
  const inputStream = new stream.PassThrough();
  const outputStream = stream.Writable({
    close() {
      console.log(`outputStream Close`);
      // socket.terminate();
    },
    write(data, encoding, callback) {
      console.log(data.toString());
      socket.send(data, callback);
    },
  });
  let socket,
    retry,
    connectCallback,
    socketError,
    connecting = false,
    connected = false,
    reconnecting = false;

  inputStream.pause();

  function connect(cb) {
    if (connecting) return;

    if (options.debug) {
      console.log(
        `Connecting to WebSocket ws://${options.address}:${options.port}${options.path}`
      );
    }

    connecting = true;
    connectCallback = cb;
    socket = new WebSocket(
      `ws://${options.address}:${options.port}${options.path}`
    );
    addListeners();
  }

  function reconnect() {
    if (reconnecting || connecting) return;

    reconnecting = true;

    if (!retry) {
      retry = backoff.fibonacci({
        initialDelay: 999,
        maxDelay: 1000,
      });
      retry.failAfter(options.reconnectTries);
      retry.on("ready", () => {
        connect((err) => {
          if (connected === false) {
            return retry.backoff(err);
          } else {
            return retry.reset();
          }
        });
      });
      retry.on("backoff", (number, delay) => {
        process.stdout.write(
          `Attempting reconnect attempt ${number} after ${delay}ms...\n`
        );
      });
      retry.on("fail", (err) => {
        process.stderr.write(`could not reconnect: ${err.message}`);
      });
    }

    retry.reset();
    retry.backoff();
  }

  function disconnect() {
    connected = false;
    connecting = false;
    inputStream.pause();
    inputStream.unpipe(outputStream);
  }

  function addListeners() {
    socket.addEventListener("close", closeListener);
    socket.addEventListener("error", errorListener);
    socket.addEventListener("open", connectListener);
  }

  function connectListener() {
    connecting = false;
    connected = true;
    reconnecting = false;

    if (connectCallback) {
      connectCallback(null);
    }

    if (options.debug) {
      console.log(`Socket Connected!`);
    }

    inputStream.pipe(outputStream, { end: false });
    inputStream.resume();
  }

  function closeListener(hadError) {
    disconnect();
    removeListeners();

    if (hadError && connectCallback) {
      connectCallback(socketError);
    }

    if (options.reconnect) {
      reconnect();
    }
  }

  function errorListener(err) {
    if (options.debug) {
      console.log(`Socket Error: ${err.message}`);
    }

    socketError = err;
  }

  function removeListeners() {
    socket.removeEventListener("close");
    socket.removeEventListener("error");
    socket.removeEventListener("connect");
  }

  connect();

  return inputStream;
};

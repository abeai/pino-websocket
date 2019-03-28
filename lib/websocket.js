'use strict'

const WebSocket = require('ws');
const stream = require('stream');
const pump = require('pump');
const split = require('split2');
const backoff = require('backoff');

module.exports = function factory(options) {
    const inputStream = new stream.PassThrough();
    let socket;
    let socketError;
    let connected = false;
    let connecting = false;
    let reconnecting = false;
    let connectCallback;

    pump(process.stdin, split(), inputStream);
    inputStream.pause();

    const outputStream = stream.Writable({
        close() {
            socket.terminate();
        },
        write(data, encoding, callback) {
            socket.send(data, callback);
        }
    });

    function connect(cb) {
        if (connecting) return;
        
        connectCallback = cb;
        connecting = true;
        socket = new WebSocket(`ws://${options.address}:${options.port}${options.path}`);
        addListeners();
    }

    function disconnect() {
        connected = false;
        connecting = false;
        inputStream.pause();
        inputStream.unpipe(outputStream);
    }

    function reconnect() {
        if (reconnecting || connecting) return;

        reconnecting = true;
        const retry = backoff.fibonacci();
        retry.failAfter(options.reconnectTries);
        retry.on('ready', () => {
            connect((err) => {
                if (connected === false) {
                    return retry.backoff(err);
                }
            })
        });
        retry.on('backoff', (number, delay) => {
            process.stdout.write(`Attempting reconnect attempt ${number} after ${delay}ms...\n`);
        });
        retry.on('fail', (err) => {
            process.stderr.write(`could not reconnect: ${err.message}`);
        });
        retry.backoff();
    }

    function addListeners() {
        socket.addEventListener('close', closeListener);
        socket.addEventListener('error', errorListener);
        socket.addEventListener('open', connectListener);
    }

    function connectListener() {
        connecting = false;
        connected = true;
        reconnecting = false;

        if (connectCallback) {
            connectCallback(null);
        }

        inputStream.pipe(outputStream, {end:false});
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
        socketError = err;
    }

    function removeListeners() {
        socket.removeEventListener('close');
        socket.removeEventListener('error');
        socket.removeEventListener('connect');
    }

    connect();
    return outputStream;
}

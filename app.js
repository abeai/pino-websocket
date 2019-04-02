#!/usr/bin/env node

const nopt = require('nopt');
const exitHook = require('async-exit-hook');
const websocketFactory = require('./lib/websocket');
const through = require('through2');
const pump = require('pump');
const split = require('split2');
let connection;
let options = {
    address: '127.0.0.1',
    port: '514',
    path: '/',
    echo: true,
    reconnect: false,
    reconnectTries: Infinity,
};
const longOpts = {
    address: String,
    port: Number,
    path: String,
    reconnect: Boolean,
    reconnectTries: Number,
    echo: Boolean,
    help: Boolean,
    version: Boolean,
};
const shortOpts = {
    a: '--address',
    p: '--port',
    pa: '--path',
    r: '--reconnect',
    t: '--reconnectTries',
    ne: '--no-echo',
    h: '--help',
    v: '--version',
};
const argv = nopt(longOpts, shortOpts, process.argv);
options = Object.assign(options, argv);

if (options.help) {
    console.log(fs.readFileSync(path.join(__dirname, 'help.txt'), 'utf8'));
    process.exit(0);
}

if (options.version) {
    console.log('pino-socket', require('./package.json').version);
    process.exit(0);
}

connection = websocketFactory(options)

exitHook((callback) => {
    try {
        connection.close();
    } catch (e) {}

    callback();
})

const myTransport = through.obj(function transport (chunk, enc, cb) {
    setImmediate(() => console.log(chunk));
    cb();
});

if (!options.echo) pump(process.stdin, split(), myTransport);
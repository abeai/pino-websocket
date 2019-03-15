# pino-websocket

This module provides a "transport" for [pino][pino] that simply forwards
messages to a websocket socket server. The module can echo the received
logs or work silently.

You should install `pino-websocket` globally for ease of use:

```bash
$ npm install -g @abeai/pino-websocket
```

[pino-websocket]: https://www.npmjs.com/package/pino-websocket

## Usage

Given an application `foo` that logs via [pino][pino], and a webscoket server
that collects logs on port `5000` on IP `10.10.10.5`, you would use `pino-websocket`
like so:

```bash
$ node foo | pino-websocket -a 10.10.10.5 -p 5000
```
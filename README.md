# denoexec

![.github/workflows/release.yml](https://github.com/brad-jones/denoexec/workflows/.github/workflows/release.yml/badge.svg?branch=master)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)
[![KeepAChangelog](https://img.shields.io/badge/Keep%20A%20Changelog-1.0.0-%23E05735)](https://keepachangelog.com/)
[![License](https://img.shields.io/github/license/brad-jones/denoexec.svg)](https://github.com/brad-jones/denoexec/blob/master/LICENSE)

[![deno land](http://img.shields.io/badge/available%20on-deno.land/x-lightgrey.svg?logo=deno&labelColor=black)](https://deno.land/x/denoexec)
[![deno version](https://img.shields.io/badge/deno-^1.12.2-lightgrey?logo=deno)](https://github.com/denoland/deno)
[![TypeScript](https://img.shields.io/badge/%3C/%3E-TypeScript-blue.svg)](https://www.typescriptlang.org/)
[![GitHub release](https://img.shields.io/github/release/brad-jones/denoexec.svg)](https://github.com/brad-jones/denoexec/releases)

A higher level wrapper around
[`Deno.run`](https://doc.deno.land/builtin/stable#Deno.run).

**Inspired by:**

- <https://github.com/sindresorhus/execa>
- <https://github.com/brad-jones/goexec>
- <https://github.com/brad-jones/dexeca>

**Why not <https://github.com/gpasq/deno-exec>?**

I don't want to supply a string as the command to execute, quoting becomes a
nightmare, an explicitly defined array of arguments is much more reliable in my
experience.

**Why not <https://github.com/acathur/exec>?**

It's too basic, can not easily buffer input or output.

## Usage

### Traditional API

```ts
import { exec } from "https://deno.land/x/denoexec/mod.ts";

// A new child process is started as soon as the exec call is made
const proc = exec({
  cmd: ["ping", "1.1.1.1"], /* all other options are provided on this object */
});

// You can do things with the process before it's finished,
// like kill it or read it's io streams, etc...
setTimeout(() => proc.kill(), 1000);

// You need to await for it's completion
const results = await proc;
console.log(results.success);
```

### Functional (Deferred) API

This is an alternative API that provides a subset of functionality and was
inspired by the likes of <https://github.com/google/zx> &
<https://github.com/Minigugus/bazx>

```ts
import { $, _, prefix } from "https://deno.land/x/denoexec/mod.ts";

// Use `_` to create a new deferred child process.
// At this point nothing has been executed.
const proc = _`ping 1.1.1.1`;

// You can wrap the process with other functions like this
proc = prefix("foo", proc);

// Or you might apply config to the object directly
proc.prefixSeparator = " -> ";

// Finally start the execution of and await the child processes results
const results = await proc;
console.log(results.success);

// To capture the io instead of stream it to the console you can use the `$`
// function, think of it like bash command substitution.
const branch = $(_`git rev-parse --abbrev-ref HEAD`);
```

> see [./examples](./examples) for more details

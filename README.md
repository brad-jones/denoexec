# denoexec

![.github/workflows/main.yml](https://github.com/brad-jones/denoexec/workflows/.github/workflows/main.yml/badge.svg?branch=master)
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

```ts
import { exec } from "https://deno.land/x/denoexec/mod.ts";

await exec({ cmd: ["ping", "1.1.1.1"] });
```

> see [./example/main.ts](./example/main.ts) for more details

dzsfaghdsghf

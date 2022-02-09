import { testing } from "../deps.ts";
import { parseStringLiteral } from "./functional.ts";

Deno.test("parseStringLiteral", () => {
  const bar = "baz";
  testing.assertEquals(parseStringLiteral`foo bar`, ["foo", "bar"]);
  testing.assertEquals(parseStringLiteral`foo${bar}`, ["foobaz"]);
  testing.assertEquals(parseStringLiteral`${bar}foo`, ["bazfoo"]);
  testing.assertEquals(parseStringLiteral`foo ${bar}`, ["foo", "baz"]);
  testing.assertEquals(parseStringLiteral`${bar} foo`, ["baz", "foo"]);
  testing.assertEquals(parseStringLiteral`${bar}foo quz`, ["bazfoo", "quz"]);
  testing.assertEquals(parseStringLiteral`foo --quz ${bar}`, [
    "foo",
    "--quz",
    "baz",
  ]);
  testing.assertEquals(parseStringLiteral`foo --quz ${"abc " + bar}`, [
    "foo",
    "--quz",
    "abc baz",
  ]);
});

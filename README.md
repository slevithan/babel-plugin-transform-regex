# babel-plugin-transform-regex [![npm](https://img.shields.io/npm/v/babel-plugin-transform-regex)](https://www.npmjs.com/package/babel-plugin-transform-regex)

This is a [Babel](https://babel.dev/) plugin that transpiles tagged [`regex`](https://github.com/slevithan/regex) templates into native `RegExp` literals, enabling syntax for modern and more readable regex features (atomic groups, subroutines, subroutine definition groups, insignificant whitespace, comments, *named capture only* mode, etc.) without the need for calling `regex` at runtime. Although `regex` is already a lightweight and high-performance library, this takes things further by giving you its developer experience benefits without adding any runtime dependencies and without users paying any runtime cost.

<big>**[Try the demo REPL](https://slevithan.github.io/babel-plugin-transform-regex/demo/)**</big>

## Example

Input:

```js
const ipv4 = regex`
  ^ \g<byte> (\.\g<byte>){3} $

  (?(DEFINE)
    (?<byte> 2[0-4]\d | 25[0-5] | 1\d\d | [1-9]?\d)
  )
`;
```

Output:

```js
const ipv4 = /^(?:2[0-4]\d|25[0-5]|1\d\d|[1-9]?\d)(?:\.(?:2[0-4]\d|25[0-5]|1\d\d|[1-9]?\d)){3}$/v;
```

## Supported

The following call formats are all supported:

- `` regex`<expression>` ``
- `` regex()`<expression>` ``
- `` regex('<flags>')`<expression>` ``
- `` regex({<options>})`<expression>` ``

Interpolation into the expression is supported, so long as the interpolated values are:

- Inline string, regexp, or number literals.
- Inline regexes constructed via `RegExp` or `new RegExp` with string values.
- Inline patterns, via `` pattern`…` `` as a template tag (without interpolation) or `pattern(…)` as a funcion call with a string or number literal as the value.

Additional details:

- Wherever strings are allowed, `'…'`, `"…"`, `` `…` ``, and `` String.raw`…` `` can all be used, so long as they don't include interpolation.
- Basic support is included for transforming the `regex` tag when called as a function instead of with backticks, via `regex({raw: ['<expression>']})`.

## Unsupported

- Tagged `regex` templates that interpolate *variables* or other *dynamic* values are not transformed.
- The specific options `subclass`, `plugins`, and `unicodeSetsPlugin` are disallowed. Regexes that use these options are not transformed.

Support for interpolating variables that hold non-dynamic strings, regexes, numbers, and patterns might be added in future versions. Contributions are welcome!

## Compatibility

Emitted regexes use flag <kbd>v</kbd>, supported by Node.js 20 and 2023-era browsers or later. The option `disable: {v: true}` switches `regex` to to use flag <kbd>u</kbd>, but this doesn't transpile <kbd>v</kbd>-only syntax like nested character classes and set subtraction/intersection. To support such syntax in older environments, leave flag <kbd>v</kbd> enabled and additionally use Babel's official plugin [@babel/plugin-transform-unicode-sets-regex](https://babel.dev/docs/babel-plugin-transform-unicode-sets-regex), which is included in [@babel/preset-env](https://babel.dev/docs/babel-preset-env).

## Installation and usage

Add this plugin and a recent version of Babel (tested with v7.24) to your project:

```sh
npm install --save-dev @babel/core @babel/cli
npm install --save-dev babel-plugin-transform-regex
```
Run the following command to compile all of your code from the `src` directory to `lib`:

```sh
./node_modules/.bin/babel src --out-dir lib --plugins=babel-plugin-transform-regex
```

### Optional setup steps

To make this easier to run, create a config file in the root of your project named `babel.config.json`, with this content:

```json
{
  "plugins": ["babel-plugin-transform-regex"]
}
```

Then add a script to your `package.json` to run the build:

```json
"scripts": {
  "build": "babel src --out-dir lib"
}
```

After that, you can run it via `npm run build`.

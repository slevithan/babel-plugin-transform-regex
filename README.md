# babel-plugin-transform-regex

[![npm version][npm-version-src]][npm-version-href]

This is a [Babel](https://babel.dev/) plugin that transpiles tagged [`regex`](https://github.com/slevithan/regex) templates into native `RegExp` literals, enabling syntax for modern and more readable regex features (atomic groups, subroutines, insignificant whitespace, comments, etc.) without the need for calling `regex` at runtime. Although `regex` is already a lightweight and high-performance library, this takes things further by giving you its developer experience benefits without adding any runtime dependencies and without users paying any runtime cost.

### [Try the demo REPL](https://slevithan.github.io/babel-plugin-transform-regex/demo/)

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

## Unsupported

- Tagged `regex` templates that interpolate variables or other dynamic values are not transformed.
- The specific `regex` options `subclass`, `plugins`, and `unicodeSetsPlugin` are unsupported. Regexes that use these options are not transformed.
- Calling the `regex` tag as a function instead of with backticks is not transformed.

## Babel plugin options

The following options are available when running the Babel plugin:

- **`removeImport`** &mdash; If `true`, removes any import declarations with module name `'regex'`.
- **`disableUnicodeSets`** &mdash; If `true`, adds `regex` option `disable: {v: true}` to all regexes before transformation.
- **`optimize`** (*experimental*) &mdash; If `true`, attempts to further optimize the regex source generated by `regex`.
  - Uses an external library ([regexp-tree](https://github.com/DmitrySoshnikov/regexp-tree)'s optimizer) that doesn't support flag-<kbd>v</kbd>-only syntax and isn't fully context-aware, so you should check the output.
- **`headerComment`** &mdash; If given a value, it will be added in a comment at the top of processed output/files.

## Compatibility

By default, the `regex` tag implicitly adds flag <kbd>v</kbd> (`unicodeSets`, supported by Node.js 20 and 2023-era browsers) to generated regexes, but it automatically switches to flag <kbd>u</kbd> (while applying <kbd>v</kbd>'s escaping rules) in environments without native <kbd>v</kbd> support. This creates an issue for the Babel plugin, because although it will typically be run in environments that support flag <kbd>v</kbd>, the transpiled results may need to run for users in old browsers without native <kbd>v</kbd>.

There are several ways to address this:

- **Option 1:** Leave <kbd>v</kbd> enabled and transpile <kbd>v</kbd> with a separate Babel plugin.
  - This allows supporting <kbd>v</kbd>-only syntax (like nested character classes) in older environments.
  - Use Babel's official plugin [@babel/plugin-transform-unicode-sets-regex](https://babel.dev/docs/babel-plugin-transform-unicode-sets-regex), which is also included in [@babel/preset-env](https://babel.dev/docs/babel-preset-env).
- **Option 2:** Disable <kbd>v</kbd> for all transpiled regexes.
  - To do this, set the Babel plugin option `disableUnicodeSets: true` (see details above).
  - This keeps things simple/clean and avoids a second regex transpilation step.
  - This doesn't support the use of <kbd>v</kbd>-only syntax.
- **Option 3:** Disable <kbd>v</kbd> for individual regexes.
  - To do this, use the `regex` option `` regex({disable: {v: true}})`…` `` in your code.
  - This maintains 100% parity between code running with or without the Babel plugin.
  - This doesn't support the use of <kbd>v</kbd>-only syntax.

You can try all these options in the [demo REPL](https://slevithan.github.io/babel-plugin-transform-regex/demo/).

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

Or to set plugin options:

```json
{
  "plugins": [["babel-plugin-transform-regex", {"removeImport": true}]]
}
```

Then add a script to your `package.json` to run the build:

```json
"scripts": {
  "build": "babel src --out-dir lib"
}
```

After that, you can run it via `npm run build`.

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/babel-plugin-transform-regex?color=78C372
[npm-version-href]: https://npmjs.com/package/babel-plugin-transform-regex

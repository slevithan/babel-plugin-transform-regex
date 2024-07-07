# babel-plugin-transform-regex

This is a [Babel](https://babel.dev/) plugin that transpiles tagged [`regex`](https://github.com/slevithan/regex) template literals into native `RegExp` literals, enabling syntax for modern and more readable regex features (atomic groups, subroutines, insignificant whitespace, comments, *named capture only* mode, etc.) without the need for calling `regex` at runtime. Although `regex` is already a lightweight and high-performance package, nevertheless this takes things even further by giving you its developer experience benefits while allowing you to avoid adding any runtime dependencies and without users paying any runtime cost.

**[Try the demo](https://slevithan.github.io/babel-plugin-transform-regex/demo/)**.

The following call formats are all supported:

- `` regex`<pattern>` ``
- `` regex()`<pattern>` ``
- `` regex('<flags>')`<pattern>` ``
- `` regex({<options>})`<pattern>` ``

Interpolation into the regex pattern is supported, so long as the interpolated values are:

- Inline string, regex, or number literals.
- Inline regexes constructed via `RegExp` with string values.
- Inline partials. Allows both `` partial`…` `` as a template tag (without interpolation) and `partial(…)` with a string or number value.

Additional details:

- Wherever strings are allowed, `'…'`, `"…"`, `` `…` ``, and `` String.raw`…` `` can all be used, so long as they don't include interpolation.
- Tagged `regex` templates that interpolate variables or other dynamic values are **not transformed**.
- Basic support is included for transforming the `regex` tag when called as a function instead of with backticks, via `regex({raw: ['<pattern>']})`.

**TODO:** Support for additional usage patterns (including e.g. interpolating *variables* that hold non-dynamic strings, regexes, numbers, and partials) might be added in future versions. Contributions are welcome!

## Compatibility

Outputted regexes use flag `v`, supported by Node.js 20+ and 2023-era browsers or later. You can further transpile away the `v` flag with Babel's official plugin [@babel/plugin-transform-unicode-sets-regex](https://babel.dev/docs/babel-plugin-transform-unicode-sets-regex) that is included in [@babel/preset-env](https://babel.dev/docs/babel-preset-env).

## Installation and usage

Install a recent version of Babel, and this plugin:

```sh
npm install --save-dev @babel/core @babel/cli
npm install --save-dev babel-plugin-transform-regex
```
Run the following command to compile all your code from the `src` directory to `lib`:

```sh
./node_modules/.bin/babel src --out-dir lib --plugins=babel-plugin-transform-regex
```

### Optional setup steps

To make this easier to use, you can create a config file in the root of your project named `babel.config.json`, with this content:

```json
{
  "plugins": ["babel-plugin-transform-regex"]
}
```

Then add the following script to your `package.json`:

```json
"scripts": {
  "build": "babel src --out-dir lib"
}
```

After that, you can run it via `npm run build`.

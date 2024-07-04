# babel-plugin-transform-regex

Transpiles tagged [`regex`](https://github.com/slevithan/regex) template literals into native `RegExp` literals, enabling syntax for modern and more readable regex features (atomic groups, subroutines, insignificant whitespace, line comments, *named capture only* mode, etc.), without the need for calling `regex` at runtime.

Currently, this only transforms tagged `regex` templates that **don't use interpolation**.

The following call formats are currently supported:

- `` regex`<pattern>` ``
- `` regex()`<pattern>` ``
- `` regex('<flags>')`<pattern>` ``
- `` regex({flags: '<flags>'})`<pattern>` ``
- `regex({raw: ['<pattern>']})` - Called as a function instead of with backticks.

**TODO:** Support additional usage patterns:

- Interpolation of non-dynamic literals (strings, regexes, etc.).
- Interpolation of regexes and partials constructed with non-dynamic literals.
- Additional edge case call formats.

<!-- Examples of edge case call formats:
- `` regex(`<flags>`)`<pattern>` ``, without interpolation of flags or with only literal strings interpolated
- `regex('<flags>')({raw: ['<pattern>']})`
- `regex({flags: '<flags>'})({raw: ['<pattern>']})`
- `regex({raw: [<strs>]}, <values>)`, with literal strs and values 
-->

**NOTE:** Outputted regexes use flag `v`, supported by Node.js 20+ and 2023-era browsers or later. You can further transpile away the `v` flag with Babel's official plugin [@babel/plugin-transform-unicode-sets-regex](https://babel.dev/docs/babel-plugin-transform-unicode-sets-regex) that is also included in `@babel/preset-env`.

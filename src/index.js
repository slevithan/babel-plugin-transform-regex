import {regex, pattern} from 'regex';
import optimizer from '../tools/optimizer.js';

export default ({types: t}) => {
  function isNondynamicRegExpCall(node) {
    // `RegExp` can be called with or without `new`
    if (!t.isNewExpression(node) && !t.isCallExpression(node)) {
      return false;
    }
    const args = node.arguments;
    return t.isIdentifier(node.callee, {name: 'RegExp'}) &&
      (args.length === 1 || args.length === 2) &&
      args.every(a => isNondynamicString(a));
  }

  // Assumes the structure was validated by `isNondynamicRegExpCall`
  function getNondynamicRegExpCall(node) {
    const args = node.arguments;
    return new RegExp(getNondynamicString(args[0]), getNondynamicString(args[1]));
  }

  function isNondynamicPattern(node) {
    return ( // `pattern` call
      t.isCallExpression(node) &&
      t.isIdentifier(node.callee, {name: 'pattern'}) &&
      node.arguments.length === 1 &&
      (isNondynamicString(node.arguments[0]) || t.isNumericLiteral(node.arguments[0]))
    ) ||
    ( // `pattern` template tag, without interpolation
      t.isTaggedTemplateExpression(node) &&
      t.isIdentifier(node.tag, {name: 'pattern'}) &&
      node.quasi.quasis.length === 1
    );
  }

  // Assumes the structure was validated by `isNondynamicPattern`
  function getNondynamicPattern(node) {
    if (t.isCallExpression(node)) {
      const arg = node.arguments[0];
      if (isNondynamicString(arg)) {
        return pattern(getNondynamicString(arg));
      }
      if (t.isNumericLiteral(arg)) {
        return pattern(arg.value);
      }
    } else if (t.isTaggedTemplateExpression(node)) {
      return pattern(node.quasi.quasis[0].value.raw);
    }
  }

  function isNondynamicString(node) {
    return t.isStringLiteral(node) ||
      ( // Allow: `...`, without interpolation
        t.isTemplateLiteral(node) &&
        node.quasis.length === 1
      ) ||
      ( // Allow: String.raw`...`, without interpolation
        t.isTaggedTemplateExpression(node) &&
        node.quasi.quasis.length === 1 &&
        t.isMemberExpression(node.tag) &&
        t.isIdentifier(node.tag.object, {name: 'String'}) &&
        t.isIdentifier(node.tag.property, {name: 'raw'})
      );
  }

  // Assumes the structure was validated by `isNondynamicString`
  function getNondynamicString(node) {
    if (t.isStringLiteral(node)) {
      return node.value;
    }
    if (t.isTemplateLiteral(node)) {
      return node.quasis[0].value.cooked;
    }
    if (t.isTaggedTemplateExpression(node)) {
      return node.quasi.quasis[0].value.raw;
    }
  }

  function isSimpleOptionsObject(node) {
    const disallowedOptions = [
      'subclass',
      'plugins',
      'unicodeSetsPlugin',
    ];
    return t.isObjectExpression(node) &&
      node.properties.every(p => {
        return t.isObjectProperty(p) &&
          t.isIdentifier(p.key) &&
          !disallowedOptions.includes(p.key.name) &&
          ( // Allow: nested simple object
            isSimpleOptionsObject(p.value) ||
            isNondynamicString(p.value) ||
            t.isBooleanLiteral(p.value)
          );
      });
  }

  // Assumes the structure was validated by `isSimpleOptionsObject`
  function getSimpleOptionsObject(node) {
    const object = {};
    node.properties.forEach(p => {
      let value;
      if (isNondynamicString(p.value)) {
        value = getNondynamicString(p.value);
      } else if (t.isBooleanLiteral(p.value)) {
        value = p.value.value;
      } else {
        value = getSimpleOptionsObject(p.value);
      }
      object[p.key.name] = value;
    });
    return object;
  }

  function isWhitelistedInterpolation(expressions) {
    return expressions.every(e => {
      return isNondynamicString(e) ||
        t.isNumericLiteral(e) ||
        t.isRegExpLiteral(e) ||
        isNondynamicRegExpCall(e) ||
        isNondynamicPattern(e);
    });
  }

  function getRegexCallArg(node) {
    const args = node.tag.arguments ?? [];
    if (args.length) {
      const arg = args[0];
      if (isNondynamicString(arg)) {
        return getNondynamicString(arg);
      } else if (isSimpleOptionsObject(arg)) {
        return getSimpleOptionsObject(arg);
      }
    }
  }

  function getRegexQuasisRaw(node) {
    const result = [];
    node.quasi.quasis.forEach(q => result.push(q.value.raw));
    return result;
  }

  function getRegexExpressions(node) {
    const result = [];
    node.quasi.expressions.forEach(e => {
      // These checks mirror `isWhitelistedInterpolation`
      if (isNondynamicString(e)) {
        result.push(getNondynamicString(e));
      } else if (t.isNumericLiteral(e)) {
        result.push(e.value);
      } else if (t.isRegExpLiteral(e)) {
        result.push(new RegExp(e.pattern, e.flags));
      } else if (isNondynamicRegExpCall(e)) {
        result.push(getNondynamicRegExpCall(e));
      } else if (isNondynamicPattern(e)) {
        result.push(getNondynamicPattern(e));
      }
    });
    return result;
  }

  function isRegexTemplate(node) {
    // Restrict interpolation into the expression to non-dynamic string/number/regexp literals,
    // plus regexes and patterns constructed with non-dynamic literals
    if (!(
      t.isTemplateLiteral(node.quasi) &&
      (node.quasi.quasis.length === 1 || isWhitelistedInterpolation(node.quasi.expressions))
    )) {
      return false;
    }
    // Allow: regex`<expression>`
    if (t.isIdentifier(node.tag, {name: 'regex'})) {
      return true;
    }
    // For remaining cases, require: regex(...)`<expression>`
    if (!(
      t.isCallExpression(node.tag) &&
      t.isIdentifier(node.tag.callee, {name: 'regex'})
    )) {
      return false;
    }
    // Allow: regex()`<expression>`, without flags
    if (node.tag.arguments.length === 0) {
      return true;
    }
    // For remaining cases, require one argument
    if (!node.tag.arguments.length === 1) {
      return false;
    }
    const arg = node.tag.arguments[0];
    // Allow: regex('<flags>')`<expression>`
    // Allow: regex({<options>})`<expression>`
    if (isNondynamicString(arg) || isSimpleOptionsObject(arg)) {
      return true;
    }
    return false;
  }

  function getRegexOptions(callArg, babelPluginOptions) {
    const {disableUnicodeSets, optimize} = babelPluginOptions;
    // The optimizer doesn't support flag v
    const disableV = !!(disableUnicodeSets || optimize);
    const options = {...(typeof callArg === 'string' ? {flags: callArg} : callArg)};
    if (disableV) {
      options.disable ??= {};
      options.disable.v = true;
    }
    return options;
  }

  function getOptimizedRegex(re) {
    return optimizer.optimize(re, {whitelist: [
      // All options: https://github.com/DmitrySoshnikov/regexp-tree/tree/master/src/optimizer
      'charEscapeUnescape',
      'groupSingleCharsToCharClass',
      'removeEmptyGroup', // Incorrectly removes the empty group in e.g. `\0(?:)0`
      'ungroup', // Incorrectly removes the group in e.g. `(?:\0)0`
    ]}).toRegExp();
  }

  return {
    visitor: {
      TaggedTemplateExpression(path, state) {
        if (!isRegexTemplate(path.node)) {
          return;
        }
        const {optimize} = state.opts;
        const options = getRegexOptions(getRegexCallArg(path.node), state.opts);
        const quasis = getRegexQuasisRaw(path.node);
        const expressions = getRegexExpressions(path.node);
        let re = regex(options)({raw: quasis}, ...expressions);
        // The optimizer doesn't support flag v
        if (optimize && !options.force?.v) {
          re = getOptimizedRegex(re);
        }
        path.replaceWith(t.regExpLiteral(re.source, re.flags));
      },
      ImportDeclaration(path, state) {
        const {removeImport} = state.opts;
        if (removeImport && path.node.source.value === 'regex') {
          path.remove();
        }
      },
      Program(path, state) {
        const {headerComment} = state.opts;
        if (headerComment) {
          path.addComment('leading', `\n${headerComment}\n`);
        }
      },
    },
  };
};

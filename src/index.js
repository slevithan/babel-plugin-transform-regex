import {regex, partial} from 'regex';

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
  function isNondynamicPartial(node) {
    return ( // `partial` call
      t.isCallExpression(node) &&
      t.isIdentifier(node.callee, {name: 'partial'}) &&
      node.arguments.length === 1 &&
      (isNondynamicString(node.arguments[0]) || t.isNumericLiteral(node.arguments[0]))
    ) ||
    ( // `partial` template tag, without interpolation
      t.isTaggedTemplateExpression(node) &&
      t.isIdentifier(node.tag, {name: 'partial'}) &&
      node.quasi.quasis.length === 1
    );
  }
  // Assumes the structure was validated by `isNondynamicPartial`
  function getNondynamicPartial(node) {
    if (t.isCallExpression(node)) {
      const arg = node.arguments[0];
      if (isNondynamicString(arg)) {
        return partial(getNondynamicString(arg));
      }
      if (t.isNumericLiteral(arg)) {
        return partial(arg.value);
      }
    } else if (t.isTaggedTemplateExpression(node)) {
      return partial(node.quasi.quasis[0].value.raw);
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
    return t.isObjectExpression(node) &&
      node.properties.every(p => {
        return t.isObjectProperty(p) &&
          t.isIdentifier(p.key) &&
          (isNondynamicString(p.value) || t.isBooleanLiteral(p.value));
      });
  }
  // Assumes the structure was validated by `isSimpleOptionsObject`
  function getSimpleOptionsObject(node) {
    const object = {};
    node.properties.forEach(p => {
      object[p.key.name] = isNondynamicString(p.value) ?
        getNondynamicString(p.value) :
        p.value.value;
    });
    return object;
  }
  function isWhitelistedInterpolation(expressions) {
    return expressions.every(e => {
      return isNondynamicString(e) ||
        t.isNumericLiteral(e) ||
        t.isRegExpLiteral(e) ||
        isNondynamicRegExpCall(e) ||
        isNondynamicPartial(e);
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
      } else if (isNondynamicPartial(e)) {
        result.push(getNondynamicPartial(e));
      }
    });
    return result;
  }

  function isRegexTemplate(node) {
    // Restrict interpolation into the pattern to non-dynamic string/number/regexp literals, plus
    // regexes and partials constructed with non-dynamic literals
    if (!(
      t.isTemplateLiteral(node.quasi) &&
      (node.quasi.quasis.length === 1 || isWhitelistedInterpolation(node.quasi.expressions))
    )) {
      return false;
    }
    // Allow: regex`<pattern>`
    if (t.isIdentifier(node.tag, {name: 'regex'})) {
      return true;
    }
    // For remaining cases, require: regex(...)`<pattern>`
    if (!(
      t.isCallExpression(node.tag) &&
      t.isIdentifier(node.tag.callee, {name: 'regex'})
    )) {
      return false;
    }
    // Allow: regex()`<pattern>`, without flags
    if (node.tag.arguments.length === 0) {
      return true;
    }
    // For remaining cases, require one argument
    if (!node.tag.arguments.length === 1) {
      return false;
    }
    const arg = node.tag.arguments[0];
    // Allow: regex('<flags>')`<pattern>`
    // Allow: regex({<options>})`<pattern>`
    if (isNondynamicString(arg) || isSimpleOptionsObject(arg)) {
      return true;
    }
    return false;
  }

  function isRegexTemplateViaCall(node) {
    if (!(
      t.isIdentifier(node.callee, {name: 'regex'}) &&
      node.arguments.length === 1
    )) {
      return false;
    }
    const arg = node.arguments[0];
    // Allow: `regex({raw: ['<pattern>']})`
    if (
      t.isObjectExpression(arg) &&
      arg.properties.length === 1 &&
      t.isObjectProperty(arg.properties[0]) &&
      t.isIdentifier(arg.properties[0].key, {name: 'raw'}) &&
      t.isArrayExpression(arg.properties[0].value) &&
      arg.properties[0].value.elements.length === 1 &&
      t.isStringLiteral(arg.properties[0].value.elements[0])
    ) {
      return true;
    }
    return false;
  }

  return {
    visitor: {
      TaggedTemplateExpression(path) {
        if (!isRegexTemplate(path.node)) {
          return;
        }
        const callArg = getRegexCallArg(path.node);
        const quasis = getRegexQuasisRaw(path.node);
        const expressions = getRegexExpressions(path.node);
        const re = regex(callArg)({raw: quasis}, ...expressions);
        path.replaceWith(t.regExpLiteral(re.source, re.flags));
      },
      CallExpression(path) {
        // Currently only has basic support for `regex({raw: ['<pattern>']})`
        // TODO: Allow:
        // - `regex('<flags>')({raw: ['<pattern>']})`
        // - `regex({<options>})({raw: ['<pattern>']})`
        // - `regex({raw: [`<pattern>`]})`, with template literal or String.raw`<pattern>`
        // - `regex({raw: ['<pattern>', '<pattern>']}, <value>)`, with template values
        if (!isRegexTemplateViaCall(path.node)) {
          return;
        }
        const pattern = path.node.arguments[0].properties[0].value.elements[0].value;
        const re = regex({raw: [pattern]});
        path.replaceWith(t.regExpLiteral(re.source, re.flags));
      },
    },
  };
};

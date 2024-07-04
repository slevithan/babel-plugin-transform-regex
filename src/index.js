import {regex} from 'regex';

export default ({types: t}) => {
  function isRegexTemplate(node) {
    // Don't allow using interpolation
    if (!(
      t.isTemplateLiteral(node.quasi) &&
      node.quasi.quasis.length === 1
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
    if (t.isStringLiteral(arg)) {
      return true;
    }
    // Allow: regex({flags: '<flags>'})`<pattern>`
    if (
      t.isObjectExpression(arg) &&
      arg.properties.length === 1 &&
      t.isObjectProperty(arg.properties[0]) &&
      t.isIdentifier(arg.properties[0].key, {name: 'flags'})
    ) {
      return true;
    }
    return false;
  }
  function isRegexTemplateViaRawProp(node) {
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
    // TODO: Allow: `regex(...)({raw: ['<pattern>']})`, with flags
    return false;
  }
  function getFlags(node) {
    if (!t.isCallExpression(node.tag) || !node.tag.arguments.length) {
      return;
    }
    const arg = node.tag.arguments[0];
    if (t.isStringLiteral(arg)) {
      return arg.value;
    }
    if (t.isObjectExpression(arg)) {
      // const flagsProp = arg.properties.find(obj => obj.key.name === 'flags');
      // return flagsProp?.value.value;
      return arg.properties[0].value.value;
    }
    return;
  }

  return {
    visitor: {
      TaggedTemplateExpression(path) {
        if (!isRegexTemplate(path.node)) {
          return;
        }
        const pattern = path.node.quasi.quasis[0].value.raw;
        const re = regex(getFlags(path.node))({raw: [pattern]});
        path.replaceWith(t.regExpLiteral(re.source, re.flags));
      },
      CallExpression(path) {
        if (!isRegexTemplateViaRawProp(path.node)) {
          return;
        }
        const pattern = path.node.arguments[0].properties[0].value.elements[0].value;
        const re = regex()({raw: [pattern]});
        path.replaceWith(t.regExpLiteral(re.source, re.flags));
      },
    },
  };
};

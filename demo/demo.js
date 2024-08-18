Babel.registerPlugin('babel-plugin-transform-regex', BabelPluginTransformRegexStandalone);

let useRemoveImport = getChecked('remove-import');
let useDisableUnicodeSets = getChecked('disable-unicode-sets');
let useOptimize = getChecked('optimize');
let useHeaderComment = getChecked('header-comment');
let useTransformUnicodeSets = getChecked('transform-unicode-sets');
const inputEl = document.getElementById('input');
autoGrow(inputEl);
showOutput(inputEl);

function getChecked(id) {
  return document.getElementById(id).checked;
}

function showOutput(el) {
  const code = el.value;
  const outputEl = document.getElementById('output');
  const plugins = [['babel-plugin-transform-regex', {
    removeImport: useRemoveImport,
    disableUnicodeSets: useDisableUnicodeSets,
    optimize: useOptimize,
    headerComment: useHeaderComment ? "Source transformed by `babel-plugin-transform-regex`. This comment's text was\nprovided as the value of the `headerComment` option." : null,
  }]];
  if (useTransformUnicodeSets) {
    plugins.push(Babel.availablePlugins['transform-unicode-sets-regex']);
  }
  let output = '';
  outputEl.classList.remove('error');
  try {
    output = Babel.transform(code, {
      plugins,
    }).code;
  } catch (e) {
    outputEl.classList.add('error');
    output = `Error: ${cleanupError(e.message)}`;
  }
  outputEl.innerHTML = escapeHtml(output);
}

function cleanupError(str) {
  return str.
    replace(/^unknown(?: file)?: /, '').
    replace(/^(Invalid regular expression: )\/.*?\/v: (.*)/su, '$1$2');
}

function autoGrow(el) {
  el.style.height = '0';
  el.style.height = (el.scrollHeight + 5) + 'px';
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

function setRemoveImport(checked) {
  useRemoveImport = checked;
  showOutput(inputEl);
}
function setDisableUnicodeSets(checked) {
  useDisableUnicodeSets = checked;
  showOutput(inputEl);
}
function setOptimize(checked) {
  useOptimize = checked;
  showOutput(inputEl);
}
function setHeaderComment(checked) {
  useHeaderComment = checked;
  showOutput(inputEl);
}
function setTransformUnicodeSets(checked) {
  useTransformUnicodeSets = checked;
  showOutput(inputEl);
}

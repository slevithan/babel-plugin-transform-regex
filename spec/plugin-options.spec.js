import {regex} from 'regex';
import {transformSync} from '@babel/core';
import babelPluginTransformRegex from '../src/index.js';

function transformed(input, options) {
  return transformSync(input, {plugins: [[babelPluginTransformRegex, options]]}).code;
}

function actual(re) {
  return String(re) + ';';
}

const flagVSupported = (() => {
  try {
    new RegExp('', 'v');
  } catch (e) {
    return false;
  }
  return true;
})();

describe('plugin options', () => {
  describe('removeImport', () => {
    it('should strip regex import declarations', () => {
      expect(transformed('import { regex } from "regex";regex`.`;', {removeImport: false})).not.toBe(actual(regex`.`));
      expect(transformed('import { regex } from "regex";regex`.`;', {removeImport: true})).toBe(actual(regex`.`));
      expect(transformed('import {regex, pattern} from "regex";regex`.`;', {removeImport: true})).toBe(actual(regex`.`));
      expect(transformed('import * as regex from "regex";', {removeImport: true})).toBe('');
    });

    it('should not strip other import declarations', () => {
      const declaration = 'import { regex } from "xregexp";';
      expect(transformed(declaration, {removeImport: true})).toBe(declaration);
    });

    it('should not strip regex dynamic import', () => {
      expect(transformed('import("regex");', {removeImport: true})).toBe('import("regex");');
    });
  });

  describe('disableUnicodeSets', () => {
    it('should set option disable: {v: true} for all regexes', () => {
      expect(transformed('regex`.`', {disableUnicodeSets: true})).toBe(actual(regex({disable: {v: true}})`.`));
      if (flagVSupported) {
        expect(transformed('regex`.`', {disableUnicodeSets: false})).not.toBe(actual(regex({disable: {v: true}})`.`));
      }
    });

    it('should not override option force: {v: true}', () => {
      if (flagVSupported) {
        expect(transformed('regex({force: {v: true}})`.`', {disableUnicodeSets: true})).not.toBe(actual(regex({disable: {v: true}})`.`));
      }
    });
  });

  describe('headerComment', () => {
    it('should add a leading comment with the provided value', () => {
      expect(transformed('', {headerComment: 'Hi'})).toBe('/*\nHi\n*/');
    });
  });

  describe('optimize', () => {
    it('should optimize generated regex source', () => {
      expect(transformed('regex`(?:.)`', {optimize: true})).toBe('/./u;');
      expect(transformed('regex`(?:.)`', {optimize: false})).not.toBe('/./u;');
    });
  });
});

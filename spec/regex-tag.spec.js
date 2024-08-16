import {regex, pattern} from 'regex';
import {transformSync} from '@babel/core';
import babelPluginTransformRegex from '../src/index.js';

function transformed(input) {
  return transformSync(input, {plugins: [babelPluginTransformRegex]}).code;
}

function actual(re) {
  return String(re) + ';';
}

describe('regex', () => {
  it('should transform tagged regex templates within code', () => {
    expect(transformed('const re = regex` .`;')).toBe('const re = /./v;');
  });

  describe('call formats', () => {
    it('should transform direct use of tag', () => {
      expect(transformed('regex`.`')).toBe(actual(regex`.`));
    });

    it('should transform tag with empty arguments', () => {
      expect(transformed('regex()`.`')).toBe(actual(regex()`.`));
    });

    it('should transform tag with flags string', () => {
      expect(transformed("regex('i')`.`")).toBe(actual(regex('i')`.`));
      expect(transformed('regex("i")`.`')).toBe(actual(regex("i")`.`));
      expect(transformed('regex(`i`)`.`')).toBe(actual(regex(`i`)`.`));
      expect(transformed('regex(String.raw`i`)`.`')).toBe(actual(regex(String.raw`i`)`.`));
    });

    it('should transform tag with options object', () => {
      expect(transformed("regex({flags: 'i'})`.`")).toBe(actual(regex({flags: 'i'})`.`));
      expect(transformed('regex({flags: "i"})`.`')).toBe(actual(regex({flags: "i"})`.`));
      expect(transformed('regex({flags: `i`})`.`')).toBe(actual(regex({flags: `i`})`.`));
      expect(transformed('regex({flags: String.raw`i`})`.`')).toBe(actual(regex({flags: String.raw`i`})`.`));
      expect(transformed("regex({flags: 'i', disable: {x: false}})` . `")).toBe(actual(regex({flags: 'i', disable: {x: false}})` . `));
      expect(transformed("regex({flags: 'i', disable: {x: true}})` . `")).toBe(actual(regex({flags: 'i', disable: {x: true}})` . `));
    });

    it('should not transform tag with explicitly disallowed options', () => {
      expect(transformed("regex({subclass: true})`.`")).not.toBe(actual(regex({subclass: true})`.`));
      expect(transformed("regex({plugins: []})`.`")).not.toBe(actual(regex({plugins: []})`.`));
      expect(transformed("regex({unicodeSetsPlugin: null})`.`")).not.toBe(actual(regex({unicodeSetsPlugin: null})`.`));
    });
  });

  describe('interpolation of non-dynamic inline values', () => {
    it('should allow interpolating string literals', () => {
      expect(transformed("regex`${'.'}`")).toBe(actual(regex`${'.'}`));
      expect(transformed('regex`${"."}`')).toBe(actual(regex`${"."}`));
    });

    it('should allow interpolating string templates without interpolation', () => {
      expect(transformed('regex`${`.`}`')).toBe(actual(regex`${`.`}`));
      expect(transformed('regex`${String.raw`.`}`')).toBe(actual(regex`${String.raw`.`}`));
      expect(transformed('regex`.${`.`}.${`.`}.`')).toBe(actual(regex`.${`.`}.${`.`}.`));
    });

    it('should allow interpolating number literals', () => {
      expect(transformed('regex`${1}`')).toBe(actual(regex`${1}`));
    });

    it('should allow interpolating regexp literals', () => {
      expect(transformed('regex`${/./}`')).toBe(actual(regex`${/./}`));
      expect(transformed('regex`${/./s}`')).toBe(actual(regex`${/./s}`));
    });

    it('should allow interpolating regexes constructed by RegExp', () => {
      expect(transformed("regex`${RegExp('.')}`")).toBe(actual(regex`${RegExp('.')}`));
      expect(transformed('regex`${RegExp(".")}`')).toBe(actual(regex`${RegExp(".")}`));
      expect(transformed('regex`${RegExp(`.`)}`')).toBe(actual(regex`${RegExp(`.`)}`));
      expect(transformed('regex`${RegExp(String.raw`.`)}`')).toBe(actual(regex`${RegExp(String.raw`.`)}`));
      expect(transformed("regex`${RegExp('.', 's')}`")).toBe(actual(regex`${RegExp('.', 's')}`));
      expect(transformed('regex`${RegExp(`.`, "s")}`')).toBe(actual(regex`${RegExp(`.`, "s")}`));
      expect(transformed('regex`${RegExp(`.`, `s`)}`')).toBe(actual(regex`${RegExp(`.`, `s`)}`));
      expect(transformed('regex`${RegExp(`.`, String.raw`s`)}`')).toBe(actual(regex`${RegExp(`.`, String.raw`s`)}`));
    });

    it('should allow interpolating regexes constructed by new RegExp', () => {
      expect(transformed("regex`${new RegExp('.')}`")).toBe(actual(regex`${new RegExp('.')}`));
      expect(transformed('regex`${new RegExp(".")}`')).toBe(actual(regex`${new RegExp(".")}`));
      expect(transformed('regex`${new RegExp(`.`)}`')).toBe(actual(regex`${new RegExp(`.`)}`));
      expect(transformed('regex`${new RegExp(String.raw`.`)}`')).toBe(actual(regex`${new RegExp(String.raw`.`)}`));
      expect(transformed("regex`${new RegExp('.', 's')}`")).toBe(actual(regex`${new RegExp('.', 's')}`));
      expect(transformed('regex`${new RegExp(`.`, "s")}`')).toBe(actual(regex`${new RegExp(`.`, "s")}`));
      expect(transformed('regex`${new RegExp(`.`, `s`)}`')).toBe(actual(regex`${new RegExp(`.`, `s`)}`));
      expect(transformed('regex`${new RegExp(`.`, String.raw`s`)}`')).toBe(actual(regex`${new RegExp(`.`, String.raw`s`)}`));
    });

    it('should allow interpolating pattern templates without interpolation', () => {
      expect(transformed('regex`${pattern`.`}`')).toBe(actual(regex`${pattern`.`}`));
    });

    it('should allow interpolating pattern function calls with string literals', () => {
      expect(transformed("regex`${pattern('.')}`")).toBe(actual(regex`${pattern('.')}`));
      expect(transformed('regex`${pattern(".")}`')).toBe(actual(regex`${pattern(".")}`));
    });

    it('should allow interpolating pattern function calls with string templates without interpolation', () => {
      expect(transformed('regex`${pattern(`.`)}`')).toBe(actual(regex`${pattern(`.`)}`));
      expect(transformed('regex`${pattern(String.raw`.`)}`')).toBe(actual(regex`${pattern(String.raw`.`)}`));
    });

    it('should allow interpolating pattern function calls with number literals', () => {
      expect(transformed('regex`${pattern(1)}`')).toBe(actual(regex`${pattern(1)}`));
    });
  });
});

// @ts-check
/**
 * @author Casiano Rodríguez León <crguezl@ull.edu.es>
 * @since 28/03/2122 22/03/2022
 * @module lexgen-code
 * @file This module exports the functions buildLexer and nearleyLexer
 *     that allows to create lexical analyzers
 */

'use strict';

/**
 * A helper function to check a regular expression has a
 *     named parenthesis and only one
 * @param {RegExp} regexp The regular expression
 * @return {string | boolean} Whether the regular expression is named one time
 * @private
 */
const checkRegExpIsNamed = (regexp) => {
  const id = /^\(\?\<(\w+?)\>(?:[^(]|\((?!\?\<[^=!]))*\)$/.exec(regexp.source);
  return id === null ? false : id[1];
};

/**
 * Creates two lexical analyzers ...
 * @param {array} regexps An array of regular expressions.
 *     Regexps must be named using a parenthesis. Example: `/(?<NAME>.)/`.
 *     Fill the documentation ...
 *     **Note**: When two regexps can match the one that appears
 *     earlier will be chosen
 * @throws {Error} Will throw if someregular expression isn't named
 *     or has more than one name
 * @return {Object} The map of valid tokens and a lexical analyzer in form of a function
 */
const buildLexer = (regexps) => {
  let validTokens = new Map();
  regexps.push(/(?<ERROR>.+)/);
  let arr = '';
  regexps.forEach((regexp) => {
    if (checkRegExpIsNamed(regexp) != false) {
      validTokens.set(checkRegExpIsNamed(regexp), regexp);
      arr += regexp.source + '|';
    }
    else {
      throw new Error("Not valid regex expression named");
    }
  });
  arr = arr.slice(0, arr.length - 1);
  // console.log(arr);
  const regexp = new RegExp(arr, 'y');
  // console.log(regexp);
  let lexer = (string, line = 1) => {
    const result = [];

    let match;
    while (match = regexp.exec(string)) {
      for (let i in match.groups) {
        if (match.groups[i] != undefined)
          if (!validTokens.get(i).hasOwnProperty('skip')) {
            let line = 1;
            let col = 1;
            for (let j = 0; j < regexp.lastIndex; j++) {
              if (string[j] === '\n') {
                line++;
                col = 1;
              }
              else col++;
            }
            let token;
            if (!validTokens.get(i).hasOwnProperty('value')) {
              token = { type: i, value: match.groups[i], line: line, col: col - match.groups[i].length, length: match.groups[i].length }
            }
            else 
            {
              token = { type: i, value: validTokens.get(i).value(match.groups[i]), line: line, col: col - match.groups[i].length, length: match.groups[i].length }

            }
            //console.log(match.groups[i]);
            result.push(token);
          }
      }
    }

    return result;
  };

  //console.log(validTokens);
  return { validTokens, lexer };
};


const nearleyLexer = function (regexps) {
  debugger;
  const { validTokens, lexer } = buildLexer(regexps);
  validTokens.set("EOF");
  return {
    currentPos: 0,
    buffer: '',
    lexer: lexer,
    validTokens: validTokens,
    regexps: regexps,
    /**
     * Sets the internal buffer to data, and restores line/col/state info taken from save().
     * Compatibility not tested
     */
    reset: function (data, info) {
      this.buffer = data || '';
      this.currentPos = 0;
      let line = info ? info.line : 1;
      this.tokens = lexer(data, line);
      return this;
    },
    /**
     * Returns e.g. {type, value, line, col, …}. Only the value attribute is required.
     */
    next: function () { // next(): Token | undefined;
      if (this.currentPos < this.tokens.length)
        return this.tokens[this.currentPos++];
      else if (this.currentPos == this.tokens.length) {
        let token = {};
        Object.assign(token, this.tokens[this.currentPos - 1]);
        token.type = "EOF"
        this.currentPos++; //So that next time will return undefined
        return token;
      }
    },
    has: function (tokenType) {
      return validTokens.has(tokenType);
    },
    /**
     * Returns an object describing the current line/col etc. This allows nearley.JS
     * to preserve this information between feed() calls, and also to support Parser#rewind().
     * The exact structure is lexer-specific; nearley doesn't care what's in it.
     */
    save: function () {
      return this.tokens[this.currentPos];
    }, // line and col
    /**
     * Returns a string with an error message describing the line/col of the offending token.
     * You might like to include a preview of the line in question.
     */
    formatError: function (token) {
      return `Error near "${token.value}" in line ${token.line}`;
    } // string with error message
  };
}

module.exports = { buildLexer, nearleyLexer };

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
  let expression = '';

  regexps.forEach((regexp) => {
    let name = checkRegExpIsNamed(regexp);
    if (name === false) {
     throw SyntaxError('Error, the regular expresion must be named.');
    }
    validTokens.set(name, regexp)
    expression += regexp.source + '|';
  });
  const regexp = new RegExp( expression.slice(0, expression.length - 1), 'y', 'u' ); // Deleting last |

  /**
   * Lexer analyzer for EGG
   *
   * @param      {string}  string    The string
   * @param      {number}  [line=1]  The line
   * @return     {Array}   Nodes obtained
   */
  let lexer = (string, line=1) => {
    const result = [];
    let match;
    while (match = regexp.exec(string)) {        
      for (let i in match.groups) {
        if (typeof match.groups[i] !== 'undefined') {
          if (!validTokens.get(i).hasOwnProperty('skip') || (validTokens.get(i).hasOwnProperty('skip') && validTokens.get(i).skip === false)) {
            let val = match.groups[i]
            if (validTokens.get(i).hasOwnProperty('value')) {
              val = validTokens.get(i).value(val);
            }
            let len = match.groups[i].length;
            let pos = searchPosition(regexp.lastIndex - len, string)
            // Unicode
            if (String(string[regexp.lastIndex]).charCodeAt(0) > 255) {
              // Codes from char and readed char (They are the same!!)
              // console.log("\n\nCODE CHAR", '�'.charCodeAt(0), "---\n\n");
              // console.log("\n\nCODE READED", match.groups[i].charCodeAt(0), "---\n\n");
              let newToken = {type: i, value: String.fromCodePoint(match.groups[i].codePointAt(0)) , line: pos.line, col: pos.col, length: len + 1}
              result.push(newToken)
            }
            // Normal case
            else {
              let newToken = {type: i, value: val, line: pos.line, col: pos.col, length: len}
              result.push(newToken)
            }              
          }
        }
      }
    }
    return result;
  };

  return {validTokens, lexer};
};

/**
 * Searchs the position of a word in a string (number of line and column)
 *
 * @param      {number}  firstIndex  The first index
 * @param      {string}  str         The string
 * @return     {Object}  Object with the col and the line of the string
 */
function searchPosition(firstIndex, str) {
  let col = 1;
  let line = 1;
  let unicode = false;
  for (let i = 0; i < firstIndex; i++) {
    if (str[i] === '\n') {
      line++;
      col = 0;
    }
    col++;
  }
  return {col, line}
}

/**
 * Lexer using nearley
 *
 * @param      {RegExp}  regexps  The regexps
 * @return     {Object}  Tokens generated
 */
const nearleyLexer = function(regexps) {
  debugger;
  const {validTokens, lexer} = buildLexer(regexps);
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
    reset: function(data, info) { 
      this.buffer = data || '';
      this.currentPos = 0;
      let line = info ? info.line : 1;
      this.tokens = lexer(data, line);
      return this;
    },
    /**
     * Returns e.g. {type, value, line, col, …}. Only the value attribute is required.
     */
    next: function() { // next(): Token | undefined;
      if (this.currentPos < this.tokens.length)
        return this.tokens[this.currentPos++];
      else if (this.currentPos == this.tokens.length) {
        let token = this.tokens[this.currentPos-1];
        token.type = "EOF"
        this.currentPos++; //So that next time will return undefined
        return token; 
      }
    },
    has: function(tokenType) {
      return validTokens.has(tokenType);
    },
    /**
     * Returns an object describing the current line/col etc. This allows nearley.JS
     * to preserve this information between feed() calls, and also to support Parser#rewind().
     * The exact structure is lexer-specific; nearley doesn't care what's in it.
     */
    save: function() {
      return this.tokens[this.currentPos];
    }, // line and col
    /**
     * Returns a string with an error message describing the line/col of the offending token.
     * You might like to include a preview of the line in question.
     */
    formatError: function(token) {
      return `Error near "${token.value}" in line ${token.line}`;
    } // string with error message
  };
}


module.exports = { buildLexer, nearleyLexer };
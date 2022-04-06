"use strict";
// const { buildLexer } =require('@ULL-ESIT-PL-2122/lexgen-code-aluTeam');
const { buildLexer } = require('../src/main.js');


const SPACE = /(?<SPACE>\s+)/; SPACE.skip = true;
const COMMENT = /(?<COMMENT>\/\/.*)/; COMMENT.skip = true;
const RESERVEDWORD = /(?<RESERVEDWORD>\b(const|let)\b)/;
const NUMBER = /(?<NUMBER>\d+)/; NUMBER.value = v => Number(v);
const ID = /(?<ID>\b([a-z_]\w*)\b)/;
const STRING = /(?<STRING>"([^\\"]|\\.")*")/;
const PUNCTUATOR = /(?<PUNCTUATOR>[-+*\/=;])/;
const myTokens = [SPACE, COMMENT, NUMBER, RESERVEDWORD, ID, STRING, PUNCTUATOR];

const { validTokens, lexer } = buildLexer(myTokens);

// console.log(validTokens);
const str = 'const varName \n// An example of comment\n=\n 3;\nlet z = "value"';
// const str = 'let n = 3\n n = n + 2';
const result = lexer(str);
console.log(result);
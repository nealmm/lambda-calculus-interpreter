import { buildLexer,
         Rule,
         rule,
         tok,
         seq,
         kmid,
         lrec_sc,
         alt_sc,
         apply,
         expectSingleResult,
         expectEOF } from 'typescript-parsec';

import { Expression } from './evaluator';

enum Token {
    Identifier,
    Lambda,
    Dot,
    OpenParen,
    CloseParen,
    Whitespace
};

const lexer = buildLexer([
    [true, /^[A-Z_a-z][0-9A-Z_a-z]*/g, Token.Identifier],
    [true, /^λ/g, Token.Lambda],
    [true, /^\./g, Token.Dot],
    [true, /^\(/g, Token.OpenParen],
    [true, /^\)/g, Token.CloseParen],
    [false, /^\s+/g, Token.Whitespace]
]);

const expression: Rule<Token, Expression> = rule();
const term: Rule<Token, Expression> = rule();

const variable = tok(Token.Identifier);
const lambda = seq(kmid(tok(Token.Lambda), variable, tok(Token.Dot)), expression);

expression.setPattern(lrec_sc(term, term, (f, a) => {
    return { form: 'app', func: f, arg: a };
}));

term.setPattern(
    alt_sc(
        apply(variable, (parsed) => {
            return { form: 'var', id: parsed.text };
        }),
        apply(lambda, (parsed) => {
            return { form: 'lam', id: parsed[0].text, body: parsed[1] };
        }),
        kmid(tok(Token.OpenParen), expression, tok(Token.CloseParen))
    )
);

export function parseExp(text: string): Expression {
    return expectSingleResult(expectEOF(expression.parse(lexer.parse(text))));
}

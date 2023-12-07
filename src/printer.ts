import { Expression } from "./evaluator";

export function printExp(exp: Expression): string {
    switch (exp.form) {
        case 'var':
            return exp.id;

        case 'lam':
            return `λ${exp.id}.${printExp(exp.body)}`;

        case 'app':
            let f = printExp(exp.func);
            let a = printExp(exp.arg);

            if (exp.func.form === 'lam') {
                f = '(' + f + ')';
            }

            if (exp.arg.form === 'lam' || exp.arg.form === 'app') {
                a = '(' + a + ')';
            }

            return f + ' ' + a;
    }
}

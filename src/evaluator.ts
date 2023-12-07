export type Expression = { form: 'var', id: string }
                       | { form: 'lam', id: string, body: Expression }
                       | { form: 'app', func: Expression, arg: Expression};

function vars(exp: Expression): string[] {
    switch (exp.form) {
        case 'var':
            return [exp.id];

        case 'lam':
            return vars(exp.body).concat([exp.id]);

        case 'app':
            return vars(exp.func).concat(vars(exp.arg));
    }
}

function freeVars(exp: Expression): string[] {
    switch (exp.form) {
        case 'var':
            return [exp.id];

        case 'lam':
            return freeVars(exp.body).filter(x => x !== exp.id);

        case 'app':
            return freeVars(exp.func).concat(freeVars(exp.arg));
    }
}

function changeVar(oldId: string, newId: string, exp: Expression): Expression {
    switch (exp.form) {
        case 'var':
            return exp.id === oldId ? { form: 'var', id: newId } : exp;

        case 'lam':
            if (exp.id === oldId) {
                return { form: 'lam', id: newId, body: changeVar(oldId, newId, exp.body) };
            }

            return { form: 'lam', id: exp.id, body: changeVar(oldId, newId, exp.body) };

        case 'app':
            return { form: 'app', func: changeVar(oldId, newId, exp.func), arg: changeVar(oldId, newId, exp.arg) };
    }
}

function freshVar(id: string, used: string[]) {
    let count: number = 1;
    let fresh: string = id + '_1';

    while (used.includes(fresh)) {
        count++;
        fresh = `${id}_${count}`;
    }

    return fresh;
}

function subst(id: string, sub: Expression, exp: Expression): Expression {
    switch (exp.form) {
        case 'var':
            return exp.id === id ? sub : exp;

        case 'lam':
            if (exp.id === id) {
                return exp;
            }

            if (freeVars(sub).includes(exp.id)) {
                const x: string = freshVar(exp.id, vars(exp.body).concat(vars(sub)));
                const b: Expression = changeVar(exp.id, x, exp.body);

                return { form: 'lam', id: x, body: subst(id, sub, b) };
            }

            return { form: 'lam', id: exp.id, body: subst(id, sub, exp.body) };

        case 'app':
            return { form: 'app', func: subst(id, sub, exp.func), arg: subst(id, sub, exp.arg) };
    }
}

function reduce(exp: Expression): Expression | undefined {
    switch (exp.form) {
        case 'var':
            return undefined;

        case 'lam':
            const b: Expression | undefined = reduce(exp.body);

            if (b !== undefined) {
                return { form: 'lam', id: exp.id, body: b };
            }

            return undefined;

        case 'app':
            if (exp.func.form === 'lam') {
                return subst(exp.func.id, exp.arg, exp.func.body);
            }

            const f: Expression | undefined = reduce(exp.func);

            if (f !== undefined) {
                return { form: 'app', func: f, arg: exp.arg };
            }

            const a: Expression | undefined = reduce(exp.arg);

            if (a !== undefined) {
                return { form: 'app', func: exp.func, arg: a };
            }

            return undefined;
    }
}

export async function evalExp(exp: Expression): Promise<Expression> {
    let val: Expression = exp;

    while (true) {
        const v: Expression | undefined = reduce(val);

        if (v !== undefined) {
            val = v;
        }
        else {
            return val;
        }

        await new Promise(resolve => setTimeout(resolve, 10));
    }
}

import './style.css';

import { Terminal }            from 'xterm';
import { LineEditAddon }       from './LineEditAddon';
import { parseExp }            from './parser';
import { Expression, evalExp } from './evaluator';
import { printExp }            from './printer';

const terminal: Terminal = new Terminal();
const editor: LineEditAddon = new LineEditAddon();

terminal.loadAddon(editor);
terminal.open(document.getElementById('xterm-container')!);

async function main() {
  while (true) {
    try {
      const line: string = await editor.readline('> ');

      const exp: Expression = await evalExp(parseExp(line));

      terminal.writeln(printExp(exp));
    }
    catch (_) {
      terminal.writeln('\x1B[0;31m** PARSE ERROR **\x1B[0m');
    }
  }
}

main();

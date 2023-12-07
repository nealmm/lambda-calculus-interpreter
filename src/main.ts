import './style.css';

import { Terminal }            from 'xterm';
import { FitAddon }            from 'xterm-addon-fit';
import { LineEditAddon }       from './LineEditAddon';
import { parseExp }            from './parser';
import { Expression, evalExp } from './evaluator';
import { printExp }            from './printer';

const storedTheme = typeof localStorage !== "undefined" && localStorage.getItem("theme");
const theme = storedTheme || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");

const root = document.documentElement;

if ((theme === "dark" && root.classList.contains("dark")) || (theme === "light" && !root.classList.contains("dark"))) {

}
else {
  root.classList.toggle("dark", theme === "dark");
}

const terminal: Terminal = new Terminal();
const fitAddon: FitAddon = new FitAddon();
const editor: LineEditAddon = new LineEditAddon();

terminal.loadAddon(fitAddon);
terminal.loadAddon(editor);
terminal.open(document.getElementById('xterm-container')!);
fitAddon.fit();

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

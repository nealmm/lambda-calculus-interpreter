import { ITerminalAddon, Terminal } from 'xterm';

export class LineEditAddon implements ITerminalAddon {
    private terminal?: Terminal;
    private pendingRead?: { prompt: string, resolve: (line: string) => void };
    private history: string[];
    private buffers: Map<number, string[]>;
    private active: number;
    private cursorStart: [number, number];
    private cursor: number;

    public constructor() {
        this.history = [];
        this.buffers = new Map();
        this.active = 0;
        this.cursorStart = [1, 1];
        this.cursor = 0;

        this.buffers.set(this.active, []);
    }

    public activate(terminal: Terminal): void {
        this.terminal = terminal;

        this.terminal.attachCustomKeyEventHandler((event: KeyboardEvent) => {
            if (event.type === 'keydown') {
                switch (event.key) {
                    case 'Enter':
                        this.resolveRead();
                        return false;

                    case '\\':
                        this.insert('λ');
                        return false;

                    case 'Backspace':
                        this.deleteChar();
                        return false;

                    case 'ArrowUp':
                        this.historyBackward();
                        return false;

                    case 'ArrowDown':
                        this.historyForward();
                        return false;

                    case 'ArrowRight':
                        this.cursorForward();
                        return false;

                    case 'ArrowLeft':
                        this.cursorBackward();
                        return false;

                    default:
                        return true;
                }
            }

            if (event.type === 'keypress') {
                switch (event.key) {
                    case 'Enter':
                        return false;

                    case '\\':
                        return false;

                    default:
                        return true;
                }
            }

            return false;
        });

        terminal.onData((input: string) => {
            let output: string = '';

            for (const char of input) {
                if (char < '\x20' || char === '\x7F') {
                    output += '^' + String.fromCharCode(char.charCodeAt(0) ^ 0x40);
                }
                else {
                    output += char;
                }
            }

            this.insert(output);
        });
    }

    public dispose(): void {}

    public readline(prompt?: string): Promise<string> {
        if (this.terminal === undefined) {
            return new Promise((_, reject) => {
                reject('LineEditAddon not activated');
            });
        }

        if (prompt === undefined) {
            return new Promise((resolve, _) => {
                this.pendingRead = { prompt: '', resolve };
                this.cursorStart = [0, 0];
                console.log(this.cursorStart);
            });
        }

        this.terminal.write(prompt, () => {
            if (this.terminal != undefined) {
                this.cursorStart = [this.terminal.buffer.active.cursorX, this.terminal.buffer.active.cursorY];
            }
        });

        return new Promise((resolve, _) => {
            this.pendingRead = { prompt, resolve };
        });
    }

    private resolveRead(): void {
        if (this.terminal === undefined || this.pendingRead === undefined) {
            return;
        }

        const line: string = this.buffers.get(this.active)!.join('');
        const rows: number = Math.ceil((line.length - this.cursor) / this.terminal.cols);

        if (line.trim().length > 0) {
            this.history.push(line);
        }

        this.buffers.clear();
        this.active = this.history.length;
        this.cursor = 0;

        this.buffers.set(this.active, []);

        this.terminal.write(`\x1B[${rows}E`);

        if (this.terminal.buffer.active.cursorY == this.terminal.rows - 1) {
            this.terminal.writeln('');
        }

        this.pendingRead.resolve(line);
    }

    private deleteChar(): void {
        if (this.terminal === undefined) {
            return;
        }

        if (this.cursor > 0) {
            const buffer: string[] = this.buffers.get(this.active)!;

            buffer.splice(this.cursor - 1, 1);
            this.cursor--;

            const startOfRow: boolean = this.terminal.buffer.active.cursorX == 0;
            const moveCursor: string = startOfRow ? `\x1B[A\x1B[${this.terminal.cols}G` : '\x1B[D';

            this.terminal.write(moveCursor + '\x1B[s\x1B[0J' + buffer.slice(this.cursor).join('') + '\x1B[u');
        }
    }

    private historyBackward(): void {
        if (this.terminal === undefined) {
            return;
        }

        if (this.active > 0) {
            this.active--;

            if (!this.buffers.has(this.active)) {
                this.buffers.set(this.active, [...this.history[this.active]]);
            }

            const buffer: string[] = this.buffers.get(this.active)!;
            const promptLen: number = this.pendingRead?.prompt.length || 0;
            const rows: number = Math.floor((promptLen + this.cursor) / this.terminal.cols);

            this.cursor = buffer.length;

            const endOfRow: boolean = (promptLen + buffer.length) > 0 && (promptLen + buffer.length) % this.terminal.cols == 0;
            const moveCursor1: string = (rows > 0 ? `\x1B[${rows}A` : '') + `\x1B[${promptLen + 1}G`;

            let moveCursor2: string = endOfRow ? '\x1B[E' : '';

            if (endOfRow && this.terminal.buffer.active.cursorY == this.terminal.rows - 1) {
                moveCursor2 = '\r\n';
            }

            this.terminal.write(moveCursor1 + '\x1B[0J' + buffer.join('') + moveCursor2);

            // if (endOfRow && this.terminal.buffer.active.cursorY == this.terminal.rows - 1) {
            //     this.terminal.writeln('');
            // }
        }
    }

    private historyForward(): void {
        if (this.terminal === undefined) {
            return;
        }

        if (this.active < this.history.length) {
            this.active++;

            const buffer: string[] = this.buffers.get(this.active)!;
            const promptLen: number = this.pendingRead?.prompt.length || 0;
            const rows: number = Math.floor((promptLen + this.cursor) / this.terminal.cols);

            this.cursor = buffer.length;

            const endOfRow: boolean = (promptLen + buffer.length) > 0 && (promptLen + buffer.length) % this.terminal.cols == 0;
            const moveCursor1: string = (rows > 0 ? `\x1B[${rows}A` : '') + `\x1B[${promptLen + 1}G`;

            let moveCursor2: string = endOfRow ? '\x1B[E' : '';

            if (endOfRow && this.terminal.buffer.active.cursorY == this.terminal.rows - 1) {
                moveCursor2 = '\r\n';
            }

            this.terminal.write(moveCursor1 + '\x1B[0J' + buffer.join('') + moveCursor2);

            // if (endOfRow && this.terminal.buffer.active.cursorY == this.terminal.rows - 1) {
            //     this.terminal.writeln('');
            // }
        }
    }

    private cursorForward(): void {
        if (this.terminal === undefined) {
            return;
        }

        if (this.cursor < this.buffers.get(this.active)!.length) {
            this.cursor++;

            const endOfRow: boolean = this.terminal.buffer.active.cursorX == this.terminal.cols - 1;

            this.terminal.write(endOfRow ? '\x1B[E' : '\x1B[C');
        }
    }

    private cursorBackward(): void {
        if (this.terminal === undefined) {
            return;
        }

        if (this.cursor > 0) {
            this.cursor--;

            const startOfRow: boolean = this.terminal.buffer.active.cursorX == 0;

            this.terminal.write(startOfRow ? `\x1B[A\x1B[${this.terminal.cols}G` : '\x1B[D');
        }
    }

    private insert(text: string): void {
        if (this.terminal === undefined) {
            return;
        }
        
        const buffer: string[] = this.buffers.get(this.active)!;

        buffer.splice(this.cursor, 0, ...text);
        this.cursor += text.length;

        const endOfRow: boolean = (this.terminal.buffer.active.cursorX + text.length) % this.terminal.cols == 0;

        let moveCursor: string = endOfRow ? '\x1B[E' : '';

        if (endOfRow && this.terminal.buffer.active.cursorY == this.terminal.rows - 1) {
            moveCursor = '\r\n';
        }

        this.terminal.write(text + moveCursor + '\x1B[s' + buffer.slice(this.cursor).join('') + '\x1B[u');

        // if (endOfRow && this.terminal.buffer.active.cursorY == this.terminal.rows - 1) {
        //     this.terminal.writeln('');
        // }
    }
}

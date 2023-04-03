export const bufferHex = (x: string): Buffer => {
    if (typeof x !== 'string') {
        throw new Error('Expected string');
    }
    if (x.startsWith('0x')) {
        x = x.slice(2);
    }
    if (x.length % 2 !== 0) {
        throw new Error('Expected even number of characters');
    }
    if (!/^[0-9A-Fa-f]*$/.test(x)) {
        throw new Error('Expected valid hexadecimal characters');
    }
    const buffer = Buffer.from(x, 'hex');
    if (buffer.length === 0) {
        throw new Error('Expected non-empty buffer');
    }
    return buffer;
}
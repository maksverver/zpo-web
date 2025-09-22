export function assertLength<T extends {length: any}, N extends number>(a: T, n: N): T & {length: typeof n} {
    if (a.length !== n) {
        throw new Error(`Expected object with length=${n} but received object with length=${a.length}!`);
    }
    return a;
}

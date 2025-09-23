export default function assertLength<T extends {length: number}, N extends number>(a: T, n: N): T & {length: typeof n} {
    if (a.length !== n) {
        throw new Error(`Expected object with length=${n} but received object with length=${a.length}!`);
    }
    return a as T & {length: N};
}

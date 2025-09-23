export function assertLength<T extends {length: any}, N extends number>(a: T, n: N): T & {length: typeof n} {
    if (a.length !== n) {
        throw new Error(`Expected object with length=${n} but received object with length=${a.length}!`);
    }
    return a;
}

// Constructs a className string from an object, where the keys are strings
// that are added if the corresponding values are truthy.
//
// For example:
//
//  classNames({foo: 42, bar: i > 123, baz: null})
//
// evaluates to 'foo bar' if i > 123, or 'foo' if i <= 123.
//
export function classNames(options: Record<string, unknown>): string {
    return Object.entries(options)
            .filter(([_name, cond]) => Boolean(cond))
            .map(([name, _cond]) => name)
            .join(' ');
}

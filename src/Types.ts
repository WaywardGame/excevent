
////////////////////////////////////
// Tuple Types
//

/**
 * Describes the type of the first item in the tuple.
 */
export type Head<TUPLE extends any[]> = TUPLE[0];
/**
 * Describes a tuple type of all items after the first item in the tuple.
 */
export type Tail<TUPLE extends any[]> = ((...args: TUPLE) => any) extends ((_: any, ...args: infer A2) => any) ? A2 : never;


////////////////////////////////////
// Function types
//

/**
 * Describes a function that takes any arguments and returns any output.
 */
export type AnyFunction = (...args: any[]) => any;
/**
 * Describes a function that takes no arguments and returns the given output.
 */
export type NullaryFunction<OUTPUT = any> = () => OUTPUT;
/**
 * Describes a function that takes the given input and returns the given output.
 */
export type UnaryFunction<INPUT = any, OUTPUT = any> = (input: INPUT) => OUTPUT;
/**
 * Describes a tuple type of all parameters in the given function type, or if the given type is not a function type, `never`.
 */
export type Args<T> = Extract<LiterallyJustTheSameThing<Parameters<Extract<T, AnyFunction>>>, any[]>;
/**
 * Describes the return type of the given function type, or if the given type is not a function type, `never`.
 */
export type Return<T> = ReturnType<Extract<T, AnyFunction>>;


////////////////////////////////////
// Map types
//

export type MapKey<MAP extends Map<any, any>> = MAP extends Map<infer KEY, any> ? KEY : never;
export type MapValue<MAP extends Map<any, any>> = MAP extends Map<any, infer VALUE> ? VALUE : never;


////////////////////////////////////
// Classes
//

export type Class<INSTANCE, CONSTRUCTOR_PARAMETERS extends any[] = any[]> = new (...args: CONSTRUCTOR_PARAMETERS) => INSTANCE;


////////////////////////////////////
// Other types
//

/**
 * Describes a type where if the given type is void, `undefined`, else the given type.
 */
export type UndefinedFromVoid<VALUE> = VALUE extends void ? undefined : VALUE;
/**
 * Describes a value or an array of the value.
 */
export type ArrayOr<T> = T | T[];
/**
 * Describes a value or an iterable of the value.
 */
export type IterableOr<T> = T | Iterable<T>;

/**
 * Just recasts the given type with `[K in T]: T[K]`
 */
export type LiterallyJustTheSameThing<T> = { [K in keyof T]: T[K] };

/**
 * no-doc - This is a helper for `Nominal` and is not useful on its own
 */

export declare class TaggedString<N extends string> extends String { protected _nominal_: N }
export declare class TaggedNumber<N extends number> extends Number { protected _nominal_: N }
/**
 * Constructs a nominal type of type `T`.
 * Useful to prevent any value of type `T` from being used or modified in places it shouldn't (think `id`s).
 * @param T the type of the `Nominal` type (string, number, etc.)
 * @param N the name of the `Nominal` type (id, username, etc.)
 * @returns a type that is equal only to itself, but can be used like its contained type `T`
 */
export type NominalString<T, N extends string> = (T | TaggedString<N>) & string
export type NominalNumber<T, N extends number> = (T | TaggedNumber<N>) & number
export type Nominal<T, N extends string | number> = N extends string ? NominalString<T, N> : (N extends number ? NominalNumber<T, N> : never)

export type ID = NominalString<string, 'ID'>

export type Optional<T> = T | undefined

export type Prettify<T> = { [P in keyof T]: T[P] }

export type ReplaceField<T, K extends keyof T, V> = Prettify<{ [P in K]: V } & Omit<T, K>>

export type TReplaceFields<T, T2> = {
  [K in keyof T]: K extends keyof T2 ? T2[K] : T[K]
}

// usage:
type tEmail = Nominal<string, 'email'>
function make(a: tEmail) {
  return a
}

const b = 'string' as tEmail
make('text')
make(b)
// the following is an error
// type tOtherString = Nominal<string, 'example2'>
// const otherString = 'asdf' as tOtherString
// make(releaseId)

type aId = Nominal<ID, 'aId'>

function make2(a: aId) {
  return a
}

make2('test')

// the following is an error
// type bId = Nominal<ID, 'bId'>
// make2('test' as bId)

// the following is an error
// type aPlusId = Nominal<aId, 'aPlusId'>
// make2('test' as aPlusId)

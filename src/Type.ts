export enum TypeTag { Bool = 1, Int, Function, Placeholder, TypeScheme }
export type BoolType = { tag: TypeTag.Bool }
export type IntType = { tag: TypeTag.Int }
export type PlaceholderType = { tag: TypeTag.Placeholder, name: string }
export type FunctionType = { tag: TypeTag.Function, argument: Type, return: Type }
export type TypeSchemeType = { tag: TypeTag.TypeScheme, bound: string[], type: Type }
export type Type = BoolType | IntType | PlaceholderType | FunctionType
export type Substitution = Record<string, Type>

export const BoolType: BoolType = { tag: TypeTag.Bool }
export const IntType: IntType = { tag: TypeTag.Int }

let placeholderCount = 0

export const PlaceholderType =
	(name = String(placeholderCount++)): PlaceholderType => ({ tag: TypeTag.Placeholder, name })

export const FunctionType =
	(argument: Type, returnType: Type): FunctionType => ({ tag: TypeTag.Function, argument, return: returnType })

export const TypeSchemeType =
	(variables: string[], type: Type): TypeSchemeType => ({ tag: TypeTag.TypeScheme, bound: variables, type })

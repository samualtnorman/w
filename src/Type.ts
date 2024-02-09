export enum TypeTag { Bool = 1, Int, Function, TypeVariable, TypeScheme }
export type BoolType = { tag: TypeTag.Bool }
export type IntType = { tag: TypeTag.Int }
export type TypeVariableType = { tag: TypeTag.TypeVariable, name: string }
export type FunctionType = { tag: TypeTag.Function, argument: Type, return: Type }
export type TypeSchemeType = { tag: TypeTag.TypeScheme, bound: string[], type: Type }
export type Type = BoolType | IntType | TypeVariableType | FunctionType
export type Substitution = Record<string, Type>

export const BoolType: BoolType = { tag: TypeTag.Bool }
export const IntType: IntType = { tag: TypeTag.Int }

let typeVariableCount = 0

export const TypeVariableType = (name = String(typeVariableCount++)): TypeVariableType =>
	({ tag: TypeTag.TypeVariable, name })

export const FunctionType = (argument: Type, returnType: Type): FunctionType =>
	({ tag: TypeTag.Function, argument, return: returnType })

export const TypeSchemeType = (variables: string[], type: Type): TypeSchemeType =>
	({ tag: TypeTag.TypeScheme, bound: variables, type })

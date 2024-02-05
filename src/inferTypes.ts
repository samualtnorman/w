import { ExpressionTag, type Expression } from "./parse"

export enum TypeTag { Bool = 1, Int, Function, TypeVariable, TypeScheme }
export type BoolType = { tag: TypeTag.Bool }
export type IntType = { tag: TypeTag.Int }
export type TypeVariableType = { tag: TypeTag.TypeVariable, name: string }
export type FunctionType = { tag: TypeTag.Function, argument: Type, return: Type }
export type TypeSchemeType = { tag: TypeTag.TypeScheme, bound: string[], type: Type }
export type Type = BoolType | IntType | TypeVariableType | FunctionType | TypeSchemeType
export type TypeEnvironment = Record<string, TypeSchemeType>
export type Substitution = Record<string, Type>
export type TypeAnnotation = { type: Type, substitution: Substitution }
export type AnnotatedExression = Expression<TypeAnnotation>

let typeVariableCount = 0

export const BoolType: BoolType = { tag: TypeTag.Bool }
export const IntType: IntType = { tag: TypeTag.Int }

export const TypeVariableType = (name = String(typeVariableCount++)): TypeVariableType =>
	({ tag: TypeTag.TypeVariable, name })

export const FunctionType = (argument: Type, returnType: Type): FunctionType =>
	({ tag: TypeTag.Function, argument, return: returnType })

export const TypeSchemeType = (variables: string[], type: Type): TypeSchemeType =>
	({ tag: TypeTag.TypeScheme, bound: variables, type })

export const typeSchemeTypeApplySubsitution =
	(typeSchemeType: TypeSchemeType, substitution: Substitution): TypeSchemeType => TypeSchemeType(
		typeSchemeType.bound,
		typeApplySubstitution(
			typeSchemeType.type,
			Object.fromEntries(Object.entries(substitution).filter(([ name ]) => !typeSchemeType.bound.includes(name)))
		)
	)

export function typeApplySubstitution(type: Type, substitution: Substitution): Type {
	switch (type.tag) {
		case TypeTag.Bool:
		case TypeTag.Int:
			return type

		case TypeTag.TypeVariable:
			return substitution[type.name] || type

		case TypeTag.Function: {
			return {
				tag: TypeTag.Function,
				argument: typeApplySubstitution(type.argument, substitution),
				return: typeApplySubstitution(type.return, substitution)
			}
		}

		case TypeTag.TypeScheme:
			return typeSchemeTypeApplySubsitution(type, substitution)
	}
}

export const typeEnvironmentApplySubstitution =
	(typeEnvironment: TypeEnvironment, substitution: Substitution): TypeEnvironment => Object.fromEntries(
		Object.entries(typeEnvironment)
			.map(([ name, typeSchemeType ]) => [ name, typeSchemeTypeApplySubsitution(typeSchemeType, substitution) ])
	)

export function contains(haystack: Type, needle: Type): boolean {
	switch (haystack.tag) {
		case TypeTag.Bool:
		case TypeTag.Int:
			return haystack.tag == needle.tag

		case TypeTag.TypeVariable:
			return needle.tag == TypeTag.TypeVariable && needle.name == haystack.name

		case TypeTag.Function:
			return contains(haystack.argument, needle) || contains(haystack.return, needle)

		case TypeTag.TypeScheme:
			return contains(haystack.type, needle)
	}
}

export function typeToString(type: Type): string {
	switch (type.tag) {
		case TypeTag.Bool:
			return "bool"

		case TypeTag.Int:
			return "int"

		case TypeTag.TypeVariable:
			return type.name

		case TypeTag.Function: {
			if (type.argument.tag == TypeTag.Function) {
				if (type.return.tag == TypeTag.Function)
					return `(${typeToString(type.argument)}) -> (${typeToString(type.return)})`

				return `(${typeToString(type.argument)}) -> ${typeToString(type.return)}`
			}

			if (type.return.tag == TypeTag.Function)
				return `${typeToString(type.argument)} -> (${typeToString(type.return)})`

			return `${typeToString(type.argument)} -> ${typeToString(type.return)}`
		}

		case TypeTag.TypeScheme:
			return `Scheme([${type.bound.join()}], ${typeToString(type.type)})`
	}
}

export function composeSubstitutions(a: Substitution, b: Substitution): Substitution {
	const substitution: Substitution = { ...b, ...a }

	for (const typeVariable in substitution)
		substitution[typeVariable] = typeApplySubstitution(substitution[typeVariable]!, substitution)

	return substitution
}

export function unify(a: Type, b: Type): { type: Type, substitution: Substitution } {
	if (a.tag == TypeTag.TypeVariable) {
		if (b.tag == TypeTag.TypeVariable && a.name == b.name)
			return { type: a, substitution: {} }

		if (contains(b, a))
			throw Error(`Infinite type ${a.name}: ${typeToString(b)}`)

		return { type: b, substitution: { [a.name]: b } }
	}

	switch (b.tag) {
		case TypeTag.Bool:
		case TypeTag.Int: {
			if (a.tag == b.tag)
				return { type: a, substitution: {} }

			throw Error(`Cannot unify ${typeToString(a)} and ${typeToString(b)}`)
		}

		case TypeTag.TypeVariable: {
			if (contains(a, b))
				throw Error(`Infinite type ${b.name}: ${typeToString(a)}`)

			return { type: a, substitution: { [b.name]: a } }
		}

		case TypeTag.Function: {
			if (a.tag != TypeTag.Function)
				throw Error(`Cannot unify ${typeToString(a)} and ${typeToString(b)}`)

			const argumentType = unify(a.argument, b.argument)

			const returnType = unify(
				typeApplySubstitution(a.return, argumentType.substitution),
				typeApplySubstitution(b.return, argumentType.substitution)
			)

			const substitution = composeSubstitutions(argumentType.substitution, returnType.substitution)

			return { type: typeApplySubstitution(a, substitution), substitution }
		}

		case TypeTag.TypeScheme:
			throw Error("not implemented")
	}
}

export function findTypeFreeTypeVariables(type: Type, freeTypeVariables: Set<string>): void {
	switch (type.tag) {
		case TypeTag.Bool:
		case TypeTag.Int:
			break

		case TypeTag.TypeVariable: {
			freeTypeVariables.add(type.name)
		} break

		case TypeTag.Function: {
			findTypeFreeTypeVariables(type.argument, freeTypeVariables)
			findTypeFreeTypeVariables(type.return, freeTypeVariables)
		} break

		case TypeTag.TypeScheme: {
			const typeVariables = new Set<string>

			findTypeFreeTypeVariables(type.type, typeVariables)

			for (const variable of typeVariables) {
				if (!type.bound.includes(variable))
					freeTypeVariables.add(variable)
			}
		}
	}
}

export function inferTypes(expression: Expression, typeEnvironment: TypeEnvironment = {}): AnnotatedExression {
	switch (expression.tag) {
		case ExpressionTag.True:
		case ExpressionTag.False:
			return { ...expression, type: BoolType, substitution: {} }

		case ExpressionTag.Integer:
			return { ...expression, type: IntType, substitution: {} }

		case ExpressionTag.Identifier: {
			const variable = typeEnvironment[expression.name]

			if (!variable)
				throw Error(`Undefined variable ${expression.name}`)

			const substitution: Substitution = {}

			for (const name of variable.bound)
				substitution[name] = TypeVariableType()

			return { ...expression, type: typeApplySubstitution(variable.type, substitution), substitution: {} }
		}

		case ExpressionTag.Abstraction: {
			const argumentType: Type = TypeVariableType()

			const body = inferTypes(
				expression.body,
				{ ...typeEnvironment, [expression.argumentName]: TypeSchemeType([], argumentType) }
			)

			return {
				...expression,
				body,
				type: FunctionType(typeApplySubstitution(argumentType, body.substitution), body.type),
				substitution: body.substitution
			}
		}

		case ExpressionTag.Application: {
			const returnType = TypeVariableType()
			const callee = inferTypes(expression.callee, typeEnvironment)

			const argument =
				inferTypes(expression.argument, typeEnvironmentApplySubstitution(typeEnvironment, callee.substitution))

			const { type: calleeType, substitution: applicationSubstitution } = unify(
				typeApplySubstitution(callee.type, argument.substitution),
				FunctionType(argument.type, returnType)
			)

			return {
				...expression,
				callee: { ...callee, type: calleeType },
				argument,
				type: typeApplySubstitution(returnType, applicationSubstitution),
				substitution: composeSubstitutions(
					applicationSubstitution,
					composeSubstitutions(argument.substitution, callee.substitution)
				)
			}
		}

		case ExpressionTag.Let: {
			const value = inferTypes(expression.value, typeEnvironment)
			const typeFreeTypeVariables = new Set<string>

			findTypeFreeTypeVariables(value.type, typeFreeTypeVariables)

			const typeEnvironmentFreeTypeVariables = new Set<string>

			for (const typeSchemeType of
				Object.values(typeEnvironmentApplySubstitution(typeEnvironment, value.substitution))
			)
				findTypeFreeTypeVariables(typeSchemeType, typeEnvironmentFreeTypeVariables)

			for (const variable of typeEnvironmentFreeTypeVariables)
				typeFreeTypeVariables.delete(variable)

			const body = inferTypes(
				expression.body,
				typeEnvironmentApplySubstitution({
					...typeEnvironment,
					[expression.name]: TypeSchemeType([ ...typeFreeTypeVariables ], value.type)
				}, value.substitution)
			)

			return {
				...expression,
				value,
				body,
				substitution: composeSubstitutions(value.substitution, body.substitution),
				type: body.type
			}
		}

		case ExpressionTag.Add:
		case ExpressionTag.Minus: {
			const left = inferTypes(expression.left, typeEnvironment)
			const { substitution: leftSubstitution } = unify(left.type, IntType)
			const right = inferTypes(expression.right, typeEnvironment)
			const { substitution: rightSubstitution } = unify(right.type, IntType)

			return {
				...expression,
				left,
				right,
				type: IntType,
				substitution: composeSubstitutions(leftSubstitution, rightSubstitution)
			}
		}

		case ExpressionTag.IfElse: {
			const condition = inferTypes(expression.condition, typeEnvironment)
			const { substitution: conditionSubstitution } = unify(condition.type, BoolType)
			const then = inferTypes(expression.then, typeEnvironment)
			const else_ = inferTypes(expression.else, typeEnvironment)
			const { type, substitution } = unify(then.type, else_.type)

			return {
				...expression,
				condition,
				then,
				else: else_,
				type,
				substitution: composeSubstitutions(substitution, conditionSubstitution)
			}
		}

		case ExpressionTag.LessThan: {
			const left = inferTypes(expression.left, typeEnvironment)
			const { substitution: leftSubstitution } = unify(left.type, IntType)
			const right = inferTypes(expression.right, typeEnvironment)
			const { substitution: rightSubstitution } = unify(right.type, IntType)

			return {
				...expression,
				left,
				right,
				type: BoolType,
				substitution: composeSubstitutions(leftSubstitution, rightSubstitution)
			}
		}

		case ExpressionTag.RecursiveLet: {
			const typeVariableType = TypeVariableType()
			const value = inferTypes(expression.value, { ...typeEnvironment, [expression.name]: TypeSchemeType([ typeVariableType.name ], typeVariableType) })
			const typeFreeTypeVariables = new Set<string>

			findTypeFreeTypeVariables(value.type, typeFreeTypeVariables)

			const typeEnvironmentFreeTypeVariables = new Set<string>

			for (const typeSchemeType of
				Object.values(typeEnvironmentApplySubstitution(typeEnvironment, value.substitution))
			)
				findTypeFreeTypeVariables(typeSchemeType, typeEnvironmentFreeTypeVariables)

			for (const variable of typeEnvironmentFreeTypeVariables)
				typeFreeTypeVariables.delete(variable)

			const body = inferTypes(
				expression.body,
				typeEnvironmentApplySubstitution({
					...typeEnvironment,
					[expression.name]: TypeSchemeType([...typeFreeTypeVariables], value.type)
				}, value.substitution)
			)

			return {
				...expression,
				value,
				body,
				substitution: composeSubstitutions(value.substitution, body.substitution),
				type: body.type
			}
		}
	}
}

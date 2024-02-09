import { BoolType, FunctionType, IntType, TypeSchemeType, TypeVariableType, type Substitution, type Type } from "./Type"
import { composeSubstitutions } from "./inferTypes/composeSubstitutions"
import { findTypeFreeTypeVariables } from "./inferTypes/findTypeFreeTypeVariables"
import { typeApplySubstitution } from "./inferTypes/typeApplySubstitution"
import { typeEnvironmentApplySubstitution } from "./inferTypes/typeEnvironmentApplySubstitution"
import { unify } from "./inferTypes/unify"
import { ExpressionTag, type Expression } from "./parse"

export type TypeAnnotation = { type: Type, substitution: Substitution }
export type AnnotatedExression = Expression<TypeAnnotation>
export type TypeEnvironment = Record<string, TypeSchemeType>

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
			const leftUnified = unify(left.type, IntType)
			let substitution = composeSubstitutions(leftUnified.substitution, left.substitution)
			const right = inferTypes(expression.right, typeEnvironmentApplySubstitution(typeEnvironment, substitution))
			substitution = composeSubstitutions(right.substitution, substitution)
			const rightUnified = unify(right.type, IntType)

			return {
				...expression,
				left,
				right,
				type: IntType,
				substitution: composeSubstitutions(rightUnified.substitution, substitution)
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

			const value = inferTypes(
				expression.value,
				{ ...typeEnvironment, [expression.name]: TypeSchemeType([ typeVariableType.name ], typeVariableType) }
			)

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

import { BoolType, FunctionType, IntType, PlaceholderType, TypeSchemeType, type Substitution, type Type } from "./Type"
import { composeSubstitutions } from "./inferTypes/composeSubstitutions"
import { findTypeFreePlaceholders } from "./inferTypes/findTypeFreePlaceholders"
import { unify } from "./inferTypes/unify"
import { ExpressionTag, type Expression } from "./parse"

export type TypedExpression = Expression<{ type: Type }>
export type TypeEnvironment = Record<string, TypeSchemeType>

export function inferTypes(expression: Expression, typeEnvironment: TypeEnvironment = {})
: TypedExpression & { substitution: Substitution } {
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
				substitution[name] = PlaceholderType()

			return { ...expression, type: variable.type, substitution: {} }
		}

		case ExpressionTag.Abstraction: {
			const argumentType: Type = PlaceholderType()

			const { substitution, ...body } = inferTypes(
				expression.body,
				{ ...typeEnvironment, [expression.argumentName]: TypeSchemeType([], argumentType) }
			)

			return { ...expression, body, type: FunctionType(argumentType, body.type), substitution }
		}

		case ExpressionTag.Application: {
			const returnType = PlaceholderType()
			const { substitution: calleeSubstitution, ...callee } = inferTypes(expression.callee, typeEnvironment)
			const { substitution: argumentSubstitution, ...argument } = inferTypes(expression.argument, typeEnvironment)

			const { type: calleeType, substitution: applicationSubstitution } =
				unify(callee.type, FunctionType(argument.type, returnType))

			return {
				...expression,
				callee: { ...callee, type: calleeType },
				argument,
				type: returnType,
				substitution: composeSubstitutions(
					applicationSubstitution,
					composeSubstitutions(argumentSubstitution, calleeSubstitution)
				)
			}
		}

		case ExpressionTag.Let: {
			const { substitution: valueSubstitution, ...value } = inferTypes(expression.value, typeEnvironment)
			const typeFreePlaceholders = new Set<string>
			findTypeFreePlaceholders(value.type, typeFreePlaceholders)
			const typeEnvironmentFreePlaceholders = new Set<string>

			for (const typeSchemeType of Object.values(typeEnvironment))
				findTypeFreePlaceholders(typeSchemeType, typeEnvironmentFreePlaceholders)

			for (const variable of typeEnvironmentFreePlaceholders)
				typeFreePlaceholders.delete(variable)

			const { substitution: bodySubstitution, ...body } = inferTypes(
				expression.body,
				{ ...typeEnvironment, [expression.name]: TypeSchemeType([ ...typeFreePlaceholders ], value.type) }
			)

			return {
				...expression,
				value,
				body,
				substitution: composeSubstitutions(valueSubstitution, bodySubstitution),
				type: body.type
			}
		}

		case ExpressionTag.Add:
		case ExpressionTag.Minus: {
			const { substitution: leftSubstitution, ...left } = inferTypes(expression.left, typeEnvironment)
			const { substitution: rightSubstitution, ...right } = inferTypes(expression.right, typeEnvironment)

			return {
				...expression,
				left,
				right,
				type: IntType,
				substitution: composeSubstitutions(
					unify(right.type, IntType).substitution,
					composeSubstitutions(
						rightSubstitution,
						composeSubstitutions(
							unify(left.type, IntType).substitution,
							leftSubstitution
						)
					)
				)
			}
		}

		case ExpressionTag.IfElse: {
			const { substitution: conditionSubstitution, ...condition } =
				inferTypes(expression.condition, typeEnvironment)

			const { substitution: thenSubstitution, ...then } = inferTypes(expression.then, typeEnvironment)
			const { substitution: elseSubstitution, ...else_ } = inferTypes(expression.else, typeEnvironment)
			const ifElseUnified = unify(then.type, else_.type)

			return {
				...expression,
				condition,
				then,
				else: else_,
				type: ifElseUnified.type,
				substitution: composeSubstitutions(
					ifElseUnified.substitution,
					composeSubstitutions(
						elseSubstitution,
						composeSubstitutions(
							thenSubstitution,
							composeSubstitutions(unify(condition.type, BoolType).substitution, conditionSubstitution)
						)
					)
				)
			}
		}

		case ExpressionTag.LessThan: {
			const { substitution: leftSubstitution, ...left } = inferTypes(expression.left, typeEnvironment)
			const { substitution: rightSubstitution, ...right } = inferTypes(expression.right, typeEnvironment)

			return {
				...expression,
				left,
				right,
				type: BoolType,
				substitution: composeSubstitutions(
					unify(right.type, IntType).substitution,
					composeSubstitutions(
						rightSubstitution,
						composeSubstitutions(unify(left.type, IntType).substitution, leftSubstitution)
					)
				)
			}
		}

		case ExpressionTag.RecursiveLet: {
			const placeholderType = PlaceholderType()

			const { substitution: valueSubstitution, ...value } = inferTypes(
				expression.value,
				{ ...typeEnvironment, [expression.name]: TypeSchemeType([], placeholderType) }
			)

			const unifiedValue = unify(value.type, placeholderType)
			value.type = unifiedValue.type
			const typeFreePlaceholders = new Set<string>
			findTypeFreePlaceholders(value.type, typeFreePlaceholders)
			const typeEnvironmentFreePlaceholders = new Set<string>

			for (const typeSchemeType of Object.values(typeEnvironment))
				findTypeFreePlaceholders(typeSchemeType, typeEnvironmentFreePlaceholders)

			for (const variable of typeEnvironmentFreePlaceholders)
				typeFreePlaceholders.delete(variable)

			const { substitution: bodySubstitution, ...body } = inferTypes(
				expression.body,
				{ ...typeEnvironment, [expression.name]: TypeSchemeType([ ...typeFreePlaceholders ], value.type) }
			)

			return {
				...expression,
				value,
				body,
				substitution: composeSubstitutions(
					composeSubstitutions(unifiedValue.substitution, valueSubstitution),
					bodySubstitution
				),
				type: body.type
			}
		}
	}
}

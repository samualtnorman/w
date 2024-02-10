import { BoolType, FunctionType, IntType, TypeSchemeType, TypeVariableType, type Substitution, type Type } from "./Type"
import { composeSubstitutions } from "./inferTypes/composeSubstitutions"
import { findTypeFreeTypeVariables } from "./inferTypes/findTypeFreeTypeVariables"
import { typeApplySubstitution } from "./inferTypes/typeApplySubstitution"
import { typeEnvironmentApplySubstitution } from "./inferTypes/typeEnvironmentApplySubstitution"
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
				substitution[name] = TypeVariableType()

			return { ...expression, type: typeApplySubstitution(variable.type, substitution), substitution: {} }
		}

		case ExpressionTag.Abstraction: {
			const argumentType: Type = TypeVariableType()

			const { substitution, ...body } = inferTypes(
				expression.body,
				{ ...typeEnvironment, [expression.argumentName]: TypeSchemeType([], argumentType) }
			)

			return {
				...expression,
				body,
				type: FunctionType(typeApplySubstitution(argumentType, substitution), body.type),
				substitution
			}
		}

		case ExpressionTag.Application: {
			const returnType = TypeVariableType()
			const { substitution: calleeSubstitution, ...callee } = inferTypes(expression.callee, typeEnvironment)

			const { substitution: argumentSubstitution, ...argument } =
				inferTypes(expression.argument, typeEnvironmentApplySubstitution(typeEnvironment, calleeSubstitution))

			const { type: calleeType, substitution: applicationSubstitution } = unify(
				typeApplySubstitution(callee.type, argumentSubstitution),
				FunctionType(argument.type, returnType)
			)

			return {
				...expression,
				callee: { ...callee, type: calleeType },
				argument,
				type: typeApplySubstitution(returnType, applicationSubstitution),
				substitution: composeSubstitutions(
					applicationSubstitution,
					composeSubstitutions(argumentSubstitution, calleeSubstitution)
				)
			}
		}

		case ExpressionTag.Let: {
			const { substitution: valueSubstitution, ...value } = inferTypes(expression.value, typeEnvironment)
			const typeFreeTypeVariables = new Set<string>

			findTypeFreeTypeVariables(value.type, typeFreeTypeVariables)

			const typeEnvironmentFreeTypeVariables = new Set<string>

			for (const typeSchemeType of
				Object.values(typeEnvironmentApplySubstitution(typeEnvironment, valueSubstitution))
			)
				findTypeFreeTypeVariables(typeSchemeType, typeEnvironmentFreeTypeVariables)

			for (const variable of typeEnvironmentFreeTypeVariables)
				typeFreeTypeVariables.delete(variable)

			const { substitution: bodySubstitution, ...body } = inferTypes(
				expression.body,
				typeEnvironmentApplySubstitution({
					...typeEnvironment,
					[expression.name]: TypeSchemeType([ ...typeFreeTypeVariables ], value.type)
				}, valueSubstitution)
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
			const leftUnified = unify(left.type, IntType)
			let substitution = composeSubstitutions(leftUnified.substitution, leftSubstitution)

			const { substitution: rightSubstitution, ...right } =
				inferTypes(expression.right, typeEnvironmentApplySubstitution(typeEnvironment, substitution))

			substitution = composeSubstitutions(rightSubstitution, substitution)
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
			const { substitution: conditionSubstitution, ...condition } =
				inferTypes(expression.condition, typeEnvironment)

			const conditionUnified = unify(condition.type, BoolType)
			let substitution = composeSubstitutions(conditionUnified.substitution, conditionSubstitution)

			const { substitution: thenSubstitution, ...then } =
				inferTypes(expression.then, typeEnvironmentApplySubstitution(typeEnvironment, substitution))

			substitution = composeSubstitutions(thenSubstitution, substitution)

			const { substitution: elseSubstitution, ...else_ } =
				inferTypes(expression.else, typeEnvironmentApplySubstitution(typeEnvironment, substitution))

			substitution = composeSubstitutions(elseSubstitution, substitution)

			const ifElseUnified = unify(then.type, else_.type)

			return {
				...expression,
				condition,
				then,
				else: else_,
				type: ifElseUnified.type,
				substitution: composeSubstitutions(ifElseUnified.substitution, substitution)
			}
		}

		case ExpressionTag.LessThan: {
			const { substitution: leftSubstitution, ...left } = inferTypes(expression.left, typeEnvironment)
			const leftUnified = unify(left.type, IntType)
			let substitution = composeSubstitutions(leftUnified.substitution, leftSubstitution)

			const { substitution: rightSubstitution, ...right } =
				inferTypes(expression.right, typeEnvironmentApplySubstitution(typeEnvironment, substitution))

			substitution = composeSubstitutions(rightSubstitution, substitution)

			const rightUnified = unify(right.type, IntType)

			return {
				...expression,
				left,
				right,
				type: BoolType,
				substitution: composeSubstitutions(rightUnified.substitution, substitution)
			}
		}

		case ExpressionTag.RecursiveLet: {
			const typeVariableType = TypeVariableType()

			const { substitution: valueSubstitution, ...value } = inferTypes(
				expression.value,
				{ ...typeEnvironment, [expression.name]: TypeSchemeType([ typeVariableType.name ], typeVariableType) }
			)

			const typeFreeTypeVariables = new Set<string>
			findTypeFreeTypeVariables(value.type, typeFreeTypeVariables)
			const typeEnvironmentFreeTypeVariables = new Set<string>

			for (const typeSchemeType of
				Object.values(typeEnvironmentApplySubstitution(typeEnvironment, valueSubstitution))
			)
				findTypeFreeTypeVariables(typeSchemeType, typeEnvironmentFreeTypeVariables)

			for (const variable of typeEnvironmentFreeTypeVariables)
				typeFreeTypeVariables.delete(variable)

			const { substitution: bodySubstitution, ...body } = inferTypes(
				expression.body,
				typeEnvironmentApplySubstitution({
					...typeEnvironment,
					[expression.name]: TypeSchemeType([ ...typeFreeTypeVariables ], value.type)
				}, valueSubstitution)
			)

			return {
				...expression,
				value,
				body,
				substitution: composeSubstitutions(valueSubstitution, bodySubstitution),
				type: body.type
			}
		}
	}
}

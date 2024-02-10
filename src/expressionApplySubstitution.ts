import { TypeTag, type BoolType, type FunctionType, type IntType, type Substitution } from "./Type"
import type { TypedExpression } from "./inferTypes"
import { typeApplySubstitution } from "./inferTypes/typeApplySubstitution"
import { Expression, ExpressionTag, expressionToSource } from "./parse"

export function expressionApplySubstitution(expression: TypedExpression, substitution: Substitution)
: Expression<{ type: BoolType | IntType | FunctionType }> {
	const type = typeApplySubstitution(expression.type, substitution)

	if (type.tag == TypeTag.TypeVariable)
		throw Error(`Could not infer type of "${expressionToSource(expression)}"`)

	switch (expression.tag) {
		case ExpressionTag.RecursiveLet: {
			return {
				...expression,
				value: expressionApplySubstitution(expression.value, substitution),
				body: expressionApplySubstitution(expression.body, substitution),
				type
			}
		}

		case ExpressionTag.Abstraction: {
			return {
				...expression,
				body: expressionApplySubstitution(expression.body, substitution),
				type
			}
		}

		case ExpressionTag.IfElse: {
			return {
				...expression,
				condition: expressionApplySubstitution(expression.condition, substitution),
				then: expressionApplySubstitution(expression.then, substitution),
				else: expressionApplySubstitution(expression.else, substitution),
				type
			}
		}

		case ExpressionTag.LessThan:
		case ExpressionTag.Add:
		case ExpressionTag.Minus: {
			return {
				...expression,
				left: expressionApplySubstitution(expression.left, substitution),
				right: expressionApplySubstitution(expression.right, substitution),
				type
			}
		}

		case ExpressionTag.Identifier:
		case ExpressionTag.Integer:
			return { ...expression, type }

		case ExpressionTag.Application: {
			return {
				...expression,
				callee: expressionApplySubstitution(expression.callee, substitution),
				argument: expressionApplySubstitution(expression.argument, substitution),
				type
			}
		}

		default:
			throw Error(`Unhandled expression ${ExpressionTag[expression.tag]}`)
	}
}

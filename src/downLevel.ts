import Cuid2 from "@paralleldrive/cuid2"
import { TypeTag } from "./Type"
import { ExpressionTag, type Expression } from "./parse"
import { TypedExpression } from "./inferTypes"

export function downLevel(expression: TypedExpression, environment: Record<string, TypedExpression> = {})
: TypedExpression {
	if (expression.tag == ExpressionTag.Identifier)
		return environment[expression.name] || expression

	if (expression.tag == ExpressionTag.Let) {
		if (expression.value.tag == ExpressionTag.Let) {
			const cuid2 = Cuid2.createId()

			renameVariable(expression.value.body, expression.value.name, cuid2)

			return downLevel(
				{ ...expression.value, name: cuid2, body: { ...expression, value: expression.value.body } },
				environment
			)
		}

		const value = downLevel(expression.value, environment)

		if (value.type.tag == TypeTag.Function)
			return downLevel(expression.body, { ...environment, [expression.name]: value })

		const body = downLevel(expression.body)

		if (body.tag != ExpressionTag.Abstraction)
			return { ...expression, value, body: downLevel(body, environment) }

		const cuid2 = Cuid2.createId()

		renameVariable(expression.body, expression.name, cuid2)

		return {
			...body,
			body: { ...expression, value, name: cuid2, body: downLevel(body.body, environment) }
		}
	}

	if (expression.tag == ExpressionTag.Application) {
		const callee = downLevel(expression.callee, environment)

		if (callee.tag == ExpressionTag.Abstraction) {
			return downLevel(
				callee.body,
				{ ...environment, [callee.argumentName]: downLevel(expression.argument, environment) }
			)
		}

		return {
			...expression,
			callee,
			argument: downLevel(expression.argument, environment)
		}
	}

	if (expression.tag == ExpressionTag.Abstraction)
		return { ...expression, body: downLevel(expression.body, environment) }

	if (expression.tag == ExpressionTag.Add) {
		return {
			...expression,
			left: downLevel(expression.left, environment),
			right: downLevel(expression.right, environment)
		}
	}

	return expression
}

export function renameVariable(expression: Expression, from: string, to: string): void {
	switch (expression.tag) {
		case ExpressionTag.True:
		case ExpressionTag.False:
		case ExpressionTag.Integer:
			break

		case ExpressionTag.Identifier: {
			if (expression.name == from)
				expression.name = to
		} break

		case ExpressionTag.Application: {
			renameVariable(expression.callee, from, to)
			renameVariable(expression.argument, from, to)
		} break

		case ExpressionTag.Abstraction: {
			if (expression.argumentName != from)
				renameVariable(expression.body, from, to)
		} break

		case ExpressionTag.Let: {
			renameVariable(expression.value, from, to)

			if (expression.name != from)
				renameVariable(expression.body, from, to)
		}
	}
}

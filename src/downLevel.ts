import { AnnotatedExression, TypeTag } from "./inferTypes"
import { ExpressionTag } from "./parse"

export function downLevel(
	expression: AnnotatedExression,
	environment: Record<string, AnnotatedExression> = {}
): AnnotatedExression {
	if (expression.tag == ExpressionTag.Identifier)
		return environment[expression.name] || expression

	if (expression.tag == ExpressionTag.Let) {
		const value = downLevel(expression.value, environment)

		if (value.type.tag == TypeTag.Function)
			return downLevel(expression.body, { ...environment, [expression.name]: value })

		const body = downLevel(expression.body)

		if (body.tag != ExpressionTag.Abstraction)
			return { ...expression, value, body: downLevel(body, environment) }

		return {
			...body,
			body: { ...expression, value, body: downLevel(body.body, environment) }
		}
	}

	if (expression.tag == ExpressionTag.Application) {
		const callee = downLevel(expression.callee, environment)

		if (callee.tag == ExpressionTag.Abstraction)
			return downLevel(callee.body, { ...environment, [callee.argumentName]: downLevel(expression.argument, environment) })

		return {
			...expression,
			callee,
			argument: downLevel(expression.argument, environment)
		}
	}

	if (expression.tag == ExpressionTag.Abstraction)
		return { ...expression, body: downLevel(expression.body, environment) }

	return expression
}

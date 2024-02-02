import { AnnotatedExression, FunctionType, IntType, TypeSchemeType, TypeTag, inferTypes } from "./inferTypes"
import { ExpressionTag, expressionToSource, parse } from "./parse"
import { tokenise } from "./tokenise"

// export type DownLeveledExpression = TrueExpression | FalseExpression | IntegerExpression | IdentifierExpression |
// 	AbstractionExpression | ApplicationExpression

export function downLevel(expression: AnnotatedExression, environment: Record<string, AnnotatedExression>): AnnotatedExression {
	if (expression.tag == ExpressionTag.Identifier)
		return environment[expression.name] || expression

	if (expression.tag == ExpressionTag.Let) {
		const value = downLevel(expression.value, environment)

		if (value.type.tag == TypeTag.Function)
			return downLevel(expression.body, { ...environment, [expression.name]: downLevel(expression.value, environment) })

		return { ...expression, value, body: downLevel(expression.body, environment) }
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

	return expression
}

const source = `
	let id = a.a in
	let increment = add 1 in
	let square = a.times a a in
	let _ = setByte 0 104 in
	let _ = setByte 1 101 in
	let _ = setByte 2 108 in
	let _ = setByte 3 108 in
	let _ = setByte 4 111 in
	print 0 5
`

const tokens = [ ...tokenise(source) ]
const ast = parse(tokens)

console.log(expressionToSource(ast))
console.log()

const typedAst = inferTypes(ast, {
	add: TypeSchemeType([], FunctionType(IntType, FunctionType(IntType, IntType))),
	times: TypeSchemeType([], FunctionType(IntType, FunctionType(IntType, IntType))),
	setByte: TypeSchemeType([], FunctionType(IntType, FunctionType(IntType, IntType))),
	print: TypeSchemeType([], FunctionType(IntType, FunctionType(IntType, IntType))),
})

const downLeveledAst = downLevel(typedAst, {})

console.log(expressionToSource(downLeveledAst))

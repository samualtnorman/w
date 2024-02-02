import { isRecord } from "@samual/lib/isRecord"
import { TokenTag, tokenIs, tokenToString, type Token } from "./tokenise"
import { typeToString } from "./inferTypes"

export enum ExpressionTag { Integer = 1, Identifier, Abstraction, Application, Let, True, False }
export type IntegerExpression<T = {}> = { tag: ExpressionTag.Integer, value: number } & T
export type IdentifierExpression<T = {}> = { tag: ExpressionTag.Identifier, name: string } & T
export type AbstractionExpression<T = {}> = { tag: ExpressionTag.Abstraction, argumentName: string, body: Expression<T> } & T
export type ApplicationExpression<T = {}> = { tag: ExpressionTag.Application, callee: Expression<T>, argument: Expression<T> } & T
export type LetExpression<T = {}> = { tag: ExpressionTag.Let, name: string, value: Expression<T>, body: Expression<T> } & T
export type TrueExpression<T = {}> = { tag: ExpressionTag.True } & T
export type FalseExpression<T = {}> = { tag: ExpressionTag.False } & T

export type Expression<T = {}> = IntegerExpression<T> | IdentifierExpression<T> | AbstractionExpression<T> |
	ApplicationExpression<T> | LetExpression<T> | TrueExpression<T> | FalseExpression<T>

export function parse(tokens: Token[], index: { $: number } = { $: 0 }): Expression {
	let expression = maybeParse()

	if (!expression) {
		const token = tokens[index.$]

		if (!token)
			throw Error(`Expected expression, reached end`)

		throw Error(`Expected expression, got ${tokenToString(token)}`)
	}

	for (let argument; argument = maybeParse();)
		expression = { tag: ExpressionTag.Application, callee: expression, argument }

	return expression

	function maybeParse(): Expression | undefined {
		const firstToken = tokens[index.$]

		switch (firstToken?.tag) {
			case TokenTag.Identifier: {
				index.$++

				if (tokens[index.$]?.tag != TokenTag.Dot)
					return { tag: ExpressionTag.Identifier, name: firstToken.data }

				index.$++
				return { tag: ExpressionTag.Abstraction, argumentName: firstToken.data, body: parse(tokens, index) }
			}

			case TokenTag.False: {
				index.$++
				return { tag: ExpressionTag.False }
			}

			case TokenTag.True: {
				index.$++
				return { tag: ExpressionTag.True }
			}

			case TokenTag.Integer: {
				index.$++
				return { tag: ExpressionTag.Integer, value: parseInt(firstToken.data, 10) }
			}

			case TokenTag.OpenBracket: {
				index.$++
				const expression = parse(tokens, index)
				expectTag(TokenTag.CloseBracket)
				return expression
			}

			case TokenTag.Let: {
				index.$++
				const identifier = expectTag(TokenTag.Identifier)
				expectTag(TokenTag.Equals)
				const value = parse(tokens, index)
				expectTag(TokenTag.In)
				return { tag: ExpressionTag.Let, name: identifier.data, value, body: parse(tokens, index) }
			}
		}

		function expectTag<T extends TokenTag>(tag: T): Token & { tag: T } {
			const token = tokens[index.$++]

			if (!token)
				throw Error(`Expected ${TokenTag[tag]}, reached end`)

			if (tokenIs(token, tag))
				return token

			throw Error(`Expected ${TokenTag[tag]}, got ${tokenToString(token)}`)
		}
	}
}

export function expressionToString(expression: Record<string, unknown>, indentLevel: number = 0): string {
	const { tag, type, substitution, ...properties } = expression
	let result = ``

	if (typeof tag == `number`) {
		result += `${ExpressionTag[tag]}\n`
		indentLevel++
	}

	if (type)
		result += `${"\t".repeat(indentLevel)}type: ${typeToString(type)}\n`

	for (const [ name, value ] of Object.entries(properties)) {
		result += `${result && "\t".repeat(indentLevel)}${name}:`

		if (typeof value == `bigint`)
			result += ` ${value}n\n`
		else if (isRecord(value))
			result += ` ${expressionToString(value, indentLevel)}`
		else
			result += ` ${JSON.stringify(value)}\n`
	}

	return result
}

export function expressionToSource(expression: Expression): string {
	if (expression.tag == ExpressionTag.True)
		return `true`

	if (expression.tag == ExpressionTag.False)
		return `false`

	if (expression.tag == ExpressionTag.Integer)
		return String(expression.value)

	if (expression.tag == ExpressionTag.Identifier)
		return expression.name

	if (expression.tag == ExpressionTag.Abstraction)
		return `${expression.argumentName}.${expressionToSource(expression.body)}`

	if (expression.tag == ExpressionTag.Application) {
		if (expression.callee.tag == ExpressionTag.Abstraction)
			return `(${expressionToSource(expression.callee)}) ${expressionToSource(expression.argument)}`

		return `${expressionToSource(expression.callee)} ${expressionToSource(expression.argument)}`
	}

	return `let ${expression.name} = ${expressionToSource(expression.value)} in\n${expressionToSource(expression.body)}`
}

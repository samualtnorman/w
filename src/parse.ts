import { TokenTag, type Token, tokenToString, tokenIs, tokenise } from "./tokenise"
import { isRecord } from "@samual/lib/isRecord"

export enum ExpressionTag { Integer = 1, Identifier, Abstraction, Application, Let, True, False }
export type IntegerExpression = { tag: ExpressionTag.Integer, value: bigint }
export type IdentifierExpression = { tag: ExpressionTag.Identifier, name: string }
export type AbstractionExpression = { tag: ExpressionTag.Abstraction, parameterName: string, body: Expression }
export type ApplicationExpression = { tag: ExpressionTag.Application, callee: Expression, argument: Expression }
export type LetExpression = { tag: ExpressionTag.Let, name: string, value: Expression, body: Expression }
export type TrueExpression = { tag: ExpressionTag.True }
export type FalseExpression = { tag: ExpressionTag.False }

export type Expression = IntegerExpression | IdentifierExpression | AbstractionExpression | ApplicationExpression |
	LetExpression | TrueExpression | FalseExpression

export function parse(tokens: Token[], index: { $: number }): Expression | undefined {
	const firstToken = tokens[index.$]

	switch (firstToken?.tag) {
		case TokenTag.Identifier: {
			index.$++

			if (tokens[index.$]?.tag == TokenTag.Dot) {
				index.$++
				return { tag: ExpressionTag.Abstraction, parameterName: firstToken.data, body: parseApplication(tokens, index) }
			}

			return { tag: ExpressionTag.Identifier, name: firstToken.data }
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
			return { tag: ExpressionTag.Integer, value: BigInt(firstToken.data) }
		}

		case TokenTag.OpenBracket: {
			index.$++
			const expression = parseApplication(tokens, index)
			expectTag(TokenTag.CloseBracket)
			return expression
		}

		case TokenTag.Let: {
			index.$++
			const identifier = expectTag(TokenTag.Identifier)
			expectTag(TokenTag.Equals)
			const value = parseApplication(tokens, index)
			expectTag(TokenTag.In)
			return { tag: ExpressionTag.Let, name: identifier.data, value, body: parseApplication(tokens, index) }
		}
	}

	function expectTag<T extends TokenTag>(tag: T): Token & { tag: T } {
		const token = tokens[index.$++]

		if (!token)
			throw Error("Unexpected end")

		if (tokenIs(token, tag))
			return token

		throw Error(`Expected ${TokenTag[tag]}, got ${tokenToString(token)}`)
	}
}

function expectExpression(tokens: Token[], index: { $: number }): Expression {
	const expression = parse(tokens, index)

	if (!expression) {
		const token = tokens[index.$]

		if (!token)
			throw Error("Expected expression, reached end")

		throw Error(`Expected expression, got ${tokenToString(token)}`)
	}

	return expression
}

function parseApplication(tokens: Token[], index: { $: number }): Expression {
	let expression = expectExpression(tokens, index)
	let argument = parse(tokens, index)

	while (argument) {
		expression = { tag: ExpressionTag.Application, callee: expression, argument }
		argument = parse(tokens, index)
	}

	return expression
}

export function expressionToString(expression: Record<string, unknown>, indentLevel: number): string {
	const { tag, ...properties } = expression
	let result = ``

	if (typeof tag == `number`) {
		result += `${ExpressionTag[tag]}\n`
		indentLevel++
	}

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

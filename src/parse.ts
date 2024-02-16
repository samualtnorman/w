import { isRecord } from "@samual/lib/isRecord"
import { TokenTag, tokenIs, tokenToString, type Token } from "./tokenise"
import { typeToString } from "./typeToString"
import type { Type } from "./Type"

export enum ExpressionTag {
	Integer = 1, Identifier, Function, Application, Let, True, False, RecursiveLet, LessThan, Minus, Add, IfElse, Return
}

export type IntegerExpression<T = {}> = { tag: ExpressionTag.Integer, value: number } & T
export type IdentifierExpression<T = {}> = { tag: ExpressionTag.Identifier, name: string } & T

export type FunctionExpression<T = {}> =
	{ tag: ExpressionTag.Function, name: string, argumentName: string, body: Expression<T>[] } & T

export type ApplicationExpression<T = {}> =
	{ tag: ExpressionTag.Application, callee: Expression<T>, argument: Expression<T> } & T

export type LetExpression<T = {}> =
	{ tag: ExpressionTag.Let, name: string, value: Expression<T>, body: Expression<T> } & T

export type TrueExpression<T = {}> = { tag: ExpressionTag.True } & T
export type FalseExpression<T = {}> = { tag: ExpressionTag.False } & T

export type RecursiveLetExpression<T = {}> =
	{ tag: ExpressionTag.RecursiveLet, name: string, value: Expression<T>, body: Expression<T> } & T

export type BinaryOperatorExpression<T = {}> = {
	tag: ExpressionTag.LessThan | ExpressionTag.Minus | ExpressionTag.Add
	left: Expression<T>
	right: Expression<T>
} & T

export type IfElseExpression<T = {}> = {
	tag: ExpressionTag.IfElse
	condition: Expression<T>
	then: Expression<T>
	else: Expression<T>
} & T

export type ReturnExpression<T = {}> = { tag: TokenTag.Return, value: Expression<T> }

export type Expression<T = {}> = IntegerExpression<T> | IdentifierExpression<T> | FunctionExpression<T> |
	ApplicationExpression<T> | LetExpression<T> | TrueExpression<T> | FalseExpression<T> | RecursiveLetExpression<T> |
	BinaryOperatorExpression<T> | IfElseExpression<T> | ReturnExpression<T>

export const IntegerExpression = (value: number): IntegerExpression => ({ tag: ExpressionTag.Integer, value })
export const IdentifierExpression = (name: string): IdentifierExpression => ({ tag: ExpressionTag.Identifier, name })

export const FunctionExpression = (name: string, argumentName: string, body: Expression[]): FunctionExpression =>
	({ tag: ExpressionTag.Function, name, argumentName, body })

export const ApplicationExpression = (callee: Expression, argument: Expression): ApplicationExpression =>
	({ tag: ExpressionTag.Application, callee, argument })

export const LetExpression = (name: string, value: Expression, body: Expression): LetExpression =>
	({ tag: ExpressionTag.Let, name, value, body })

export const TrueExpression: TrueExpression = { tag: ExpressionTag.True }
export const FalseExpression: FalseExpression = { tag: ExpressionTag.False }

export const RecursiveLetExpression = (name: string, value: Expression, body: Expression): RecursiveLetExpression =>
	({ tag: ExpressionTag.RecursiveLet, name, value, body })

export const IfElseExpression = (condition: Expression, then: Expression, elseExpression: Expression): IfElseExpression =>
	({ tag: ExpressionTag.IfElse, condition, then, else: elseExpression })

export const BinaryOperatorTokensToExpressionTag: { [K in TokenTag]?: BinaryOperatorExpression["tag"] } = {
	[TokenTag.LessThan]: ExpressionTag.LessThan,
	[TokenTag.Minus]: ExpressionTag.Minus,
	[TokenTag.Add]: ExpressionTag.Add
}

export function parse(tokens: Token[]): Expression {
	const index = { $: 0 }

	const expression = greedyParse(0)

	if (index.$ < tokens.length)
		throw Error(`Unexpected token ${tokenToString(tokens[index.$]!)}`)

	return expression

	function greedyParse(indentLevel: number): Expression {
		let expression = maybeParse(indentLevel)

		if (!expression) {
			const token = tokens[index.$]

			if (!token)
				throw Error(`Expected expression, reached end`)

			throw Error(`Expected expression, got token ${tokenToString(token)}`)
		}

		while (index.$ < tokens.length) {
			const tag = BinaryOperatorTokensToExpressionTag[tokens[index.$]!.tag]

			if (tag) {
				index.$++
				expression = { tag, left: expression, right: greedyParse(indentLevel) }
			} else {
				const argument = maybeParse(indentLevel)

				if (!argument)
					break

				expression = ApplicationExpression(expression, argument)
			}
		}

		return expression

		function maybeParse(indentLevel: number): Expression | undefined {
			const firstToken = tokens[index.$]

			switch (firstToken?.tag) {
				case TokenTag.False: {
					index.$++
					return FalseExpression
				}

				case TokenTag.True: {
					index.$++
					return TrueExpression
				}

				case TokenTag.Integer: {
					index.$++
					return IntegerExpression(parseInt(firstToken.data, 10))
				}

				case TokenTag.OpenBracket: {
					index.$++
					const expression = greedyParse(indentLevel)
					expectTag(TokenTag.CloseBracket)
					return expression
				}

				case TokenTag.Let: {
					index.$++

					if (tokens[index.$]?.tag == TokenTag.Recursive) {
						index.$++
						const identifier = expectTag(TokenTag.Identifier)
						expectTag(TokenTag.Equals)
						const value = greedyParse(indentLevel)
						expectTag(TokenTag.In)
						return RecursiveLetExpression(identifier.data, value, greedyParse(indentLevel))
					}

					const identifier = expectTag(TokenTag.Identifier)
					expectTag(TokenTag.Equals)
					const value = greedyParse(indentLevel)
					expectTag(TokenTag.In)
					return LetExpression(identifier.data, value, greedyParse(indentLevel))
				}

				case TokenTag.If: {
					index.$++

					const condition = greedyParse(indentLevel)
					expectTag(TokenTag.Then)
					const then = greedyParse(indentLevel)
					expectTag(TokenTag.Else)
					const elseExpression = greedyParse(indentLevel)

					return IfElseExpression(condition, then, elseExpression)
				}

				case TokenTag.Function: {
					index.$++

					const functionName = expectTag(TokenTag.Identifier).data
					const argumentName = expectTag(TokenTag.Identifier).data
					const newline = expectTag(TokenTag.Newline)

					indentLevel++

					if (newline.data.length != indentLevel)
						throw Error(`Wrong indent level`)

					const body = greedyParse(indentLevel)

					return FunctionExpression(functionName, argumentName, [ body ])
				}

				case TokenTag.Return: {
					index.$++
					return { tag: TokenTag.Return, value: greedyParse(indentLevel) }
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
}

export function expressionToString(expression: Record<string, unknown>, indentLevel: number = 0): string {
	const { tag, type, substitution, ...properties } = expression
	let result = ``

	if (typeof tag == `number`) {
		result += `${ExpressionTag[tag]}\n`
		indentLevel++
	}

	if (type)
		result += `${"\t".repeat(indentLevel)}type: ${typeToString(type as Type)}\n`

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

export function expressionToSource(expression: Expression, indentLevel = 0): string {
	if (expression.tag == ExpressionTag.True)
		return `true`

	if (expression.tag == ExpressionTag.False)
		return `false`

	if (expression.tag == ExpressionTag.Integer)
		return String(expression.value)

	if (expression.tag == ExpressionTag.Identifier)
		return expression.name

	if (expression.tag == ExpressionTag.Abstraction) {
		let body = expressionToSource(expression.body, indentLevel + 1)

		body = body.includes("\n") ? `\n${`\t`.repeat(indentLevel + 1)}${body}` : ` ${body}`

		return `${expression.argumentName} ->${body}`
	}

	if (expression.tag == ExpressionTag.Application) {
		let callee = expressionToSource(expression.callee, indentLevel)
		let argument = expressionToSource(expression.argument, indentLevel)

		if (expression.argument.tag != ExpressionTag.Identifier)
			argument = `(${argument})`

		return `${callee} ${argument}`
	}

	if (expression.tag == ExpressionTag.Let) {
		const indent = `\t`.repeat(indentLevel)
		let value = expressionToSource(expression.value, indentLevel + 1)

		value = value.includes("\n") ? `\n\t${indent}${value}` : ` ${value}`

		let body = expressionToSource(expression.body, indentLevel)

		body = value.includes("\n") ? `\n\t${indent}in\n${indent}${body}` : ` in\n${indent}${body}`

		return `let ${expression.name} =${value}${body}`
	}

	if (expression.tag == ExpressionTag.RecursiveLet) {
		const indent = `\t`.repeat(indentLevel)
		const value = expressionToSource(expression.value, indentLevel + 1)
		const body = expressionToSource(expression.body, indentLevel)

		return `let rec ${expression.name} =\n\t${indent}${value}\n\t${indent}in\n${indent}${body}`
	}

	if (expression.tag == ExpressionTag.IfElse) {
		const indent = `\t`.repeat(indentLevel)
		const condition = expressionToSource(expression.condition, indentLevel)
		const then = expressionToSource(expression.then, indentLevel)
		const else_ = expressionToSource(expression.else, indentLevel)

		return `if ${condition} then\n\t${indent}${then}\n${indent}else\n\t${indent}${else_}`
	}

	const left = expressionToSource(expression.left, indentLevel)
	const right = expressionToSource(expression.right, indentLevel)

	const operator =
		{ [ExpressionTag.Add]: `+`, [ExpressionTag.Minus]: `-`, [ExpressionTag.LessThan]: `<` }[expression.tag]

	return `${left} ${operator} ${right}`
}

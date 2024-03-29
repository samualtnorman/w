import { FunctionType, IntType, type Type } from "./Type"
import type { TypedExpression } from "./inferTypes"
import { unify } from "./inferTypes/unify"
import { ExpressionTag, type AbstractionExpression } from "./parse"

export type I32TypeIr = { tag: "I32Type" }
export type I64TypeIr = { tag: "I64Type" }
export type TypeIr = I32TypeIr | I64TypeIr
export type I32LiteralIr = { tag: "I32Literal", value: number }
export type GetLocalIr = { tag: "GetLocal", index: number }
export type SetLocalIr = { tag: "SetLocal", index: number, value: ExpressionIr }
export type BlockIr = { tag: "Block", children: ExpressionIr[], name: string | undefined }
export type I32AddIr = { tag: "I32Add", left: ExpressionIr, right: ExpressionIr }
export type ExpressionIr = I32LiteralIr | GetLocalIr | SetLocalIr | BlockIr | I32AddIr

export type IrFunction = {
	name: string
	arguments: TypeIr[]
	returnType: TypeIr
	locals: TypeIr[]
	body: ExpressionIr
	export: boolean
}

export type IrModule = IrFunction[]

export const I32TypeIr: I32TypeIr = { tag: "I32Type" }
export const I32LiteralIr = (value: number): I32LiteralIr => ({ tag: "I32Literal", value })
export const GetLocalIr = (index: number): GetLocalIr => ({ tag: "GetLocal", index })
export const SetLocalIr = (index: number, value: ExpressionIr): SetLocalIr => ({ tag: "SetLocal", index, value })
export const BlockIr = (children: ExpressionIr[], name?: string): BlockIr => ({ tag: `Block`, children, name })
export const I32AddIr = (left: ExpressionIr, right: ExpressionIr): I32AddIr => ({ tag: `I32Add`, left, right })

export function generateIr(downLeveledExpression: AbstractionExpression<{ type: Type }>): IrModule {
	unify(downLeveledExpression.type, FunctionType(IntType, IntType))

	const locals: TypeIr[] = []
	const body = generateExpressionIr(downLeveledExpression.body, { [downLeveledExpression.argumentName]: 0 })

	return [
		{
			name: "main",
			arguments: [ I32TypeIr ],
			body: BlockIr(body),
			export: true,
			locals,
			returnType: I32TypeIr
		}
	]

	function generateExpressionIr(
		expression: TypedExpression,
		nameToIndexes: Record<string, number>
	): ExpressionIr[] {
		switch (expression.tag) {
			case ExpressionTag.False:
				return [ I32LiteralIr(0) ]

			case ExpressionTag.True:
				return [ I32LiteralIr(1) ]

			case ExpressionTag.Integer:
				return [ I32LiteralIr(expression.value) ]

			case ExpressionTag.Let: {
				locals.push(I32TypeIr)

				return [
					SetLocalIr(locals.length, BlockIr(generateExpressionIr(expression.value, nameToIndexes))),
					...generateExpressionIr(expression.body, { ...nameToIndexes, [expression.name]: locals.length })
				]
			}

			case ExpressionTag.Identifier:
				return [ GetLocalIr(nameToIndexes[expression.name]!) ]

			case ExpressionTag.Add: {
				return [
					I32AddIr(
						BlockIr(generateExpressionIr(expression.left, nameToIndexes)),
						BlockIr(generateExpressionIr(expression.right, nameToIndexes))
					)
				]
			}

			default:
				throw Error(`Unhandled expression ${ExpressionTag[expression.tag]}`)
		}
	}
}

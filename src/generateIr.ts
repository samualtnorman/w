import { AnnotatedExression, FunctionType, IntType, TypeAnnotation, unify } from "./inferTypes"
import { AbstractionExpression, ExpressionTag } from "./parse"

export type I32TypeIr = { tag: "I32Type" }
export type I64TypeIr = { tag: "I64Type" }
export type TypeIr = I32TypeIr | I64TypeIr
export type I32LiteralIr = { tag: "I32Literal", value: number }
export type GetLocalIr = { tag: "GetLocal", index: number }
export type SetLocalIr = { tag: "SetLocal", index: number, value: ExpressionIr }
export type CallIr = { tag: "CallIr", name: string, arguments: ExpressionIr }
export type ExpressionIr = I32LiteralIr | GetLocalIr | CallIr | SetLocalIr | ExpressionIr[]

export type IrFunction = {
	name: string
	argumentTypes: TypeIr[] | undefined
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

export const CallIr = (name: string, arguments_: ExpressionIr): CallIr =>
	({ tag: "CallIr", name, arguments: arguments_ })

export function generateIr(downLeveledExpression: AbstractionExpression<TypeAnnotation>): IrModule {
	unify(downLeveledExpression.type, FunctionType(IntType, IntType))

	const irModule: IrFunction[] = []
	const locals: TypeIr[] = []

	const body = generateExpressionIr(downLeveledExpression.body, { [downLeveledExpression.argumentName]: 0 })

	const functionIr: IrFunction = {
		name: "main",
		argumentTypes: undefined,
		body,
		export: true,
		locals,
		returnType: I32TypeIr
	}

	irModule.push(functionIr)

	return irModule

	function generateExpressionIr(
		expression: AnnotatedExression,
		nameToIndexes: Record<string, number>
	): ExpressionIr {
		switch (expression.tag) {
			case ExpressionTag.False:
				return I32LiteralIr(0)

			case ExpressionTag.True:
				return I32LiteralIr(1)

			case ExpressionTag.Integer:
				return I32LiteralIr(expression.value)

			case ExpressionTag.Let: {
				locals.push(I32TypeIr)

				return [
					SetLocalIr(locals.length, generateExpressionIr(expression.value, nameToIndexes)),
					generateExpressionIr(expression.body, { ...nameToIndexes, [expression.name]: locals.length })
				]
			}

			case ExpressionTag.Identifier: {
				return GetLocalIr(nameToIndexes[expression.name]!)
			}

			default:
				throw Error(`Unhandled expression ${ExpressionTag[expression.tag]}`)
		}
	}
}

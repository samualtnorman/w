import { AnnotatedExression, TypeAnnotation, TypeTag, typeToString } from "./inferTypes"
import { AbstractionExpression, ExpressionTag } from "./parse"

// new binaren.Module().call()

export type I32TypeIr = { tag: "I32Type" }
export type TypeIr = I32TypeIr
export type I32LiteralIr = { tag: "I32Literal", value: number }
export type GetLocalIr = { tag: "GetLocal", index: number }
export type CallIr = { tag: "Call", name: string, arguments: ExpressionIr[] }
export type ExpressionIr = I32LiteralIr | GetLocalIr | CallIr

export const I32TypeIr: I32TypeIr = { tag: "I32Type" }
export const I32LiteralIr = (value: number): I32LiteralIr => ({ tag: "I32Literal", value })

type IrFunction = {
	name: string
	argumentTypes: TypeIr[] | undefined
	returnType: TypeIr
	locals: TypeIr[]
	body: ExpressionIr
	export: boolean
}

export type IrModule = IrFunction[]

export function generateIr(expression: AnnotatedExression): IrModule {
	if (expression.type.tag != TypeTag.Bool && expression.type.tag != TypeTag.Int)
		throw Error(`Module must return bool or int, got ${typeToString(expression.type)}`)

	const irModule: IrFunction[] = []
	const locals: TypeIr[] = []

	const body = generateExpressionIr(expression, {}, {})

	const functionIr: IrFunction = {
		name: "main",
		argumentTypes: undefined,
		body,
		export: true,
		locals,
		returnType: { tag: "I32Type" }
	}

	irModule.push(functionIr)

	return irModule

	function generateExpressionIr(
		expression: AnnotatedExression,
		variables: Record<string, number>,
		functions: Record<string, AbstractionExpression<TypeAnnotation>>
	): ExpressionIr {
		switch (expression.tag) {
			case ExpressionTag.False:
				return I32LiteralIr(0)

			case ExpressionTag.True:
				return I32LiteralIr(1)

			case ExpressionTag.Integer:
				return I32LiteralIr(expression.value)

			case ExpressionTag.Let: {
				if (expression.value.tag == ExpressionTag.Abstraction) {
					return generateExpressionIr(
						expression.body,
						variables,
						{ ...functions, [expression.name]: expression.value }
					)
				}

				const ir = generateExpressionIr(expression.body, { ...variables, [expression.name]: locals.length }, functions)

				locals.push(I32TypeIr)

				return ir
			}

			case ExpressionTag.Identifier: {
				const index = variables[expression.name]

				if (index == undefined)
					throw Error(`Missing variable ${expression.name}`)

				return { tag: "GetLocal", index }
			}

			case ExpressionTag.Application: {
				if (expression.callee.type.tag != TypeTag.Function ||
					expression.callee.type.argument.tag != TypeTag.Int ||
					expression.callee.type.return.tag != TypeTag.Int ||
					expression.callee.tag != ExpressionTag.Identifier
				)
					throw Error("Unsupported application")

				const abstraction = functions[expression.callee.name]

				if (!abstraction)
					throw Error(`Missing function ${expression.callee.name}`)

				irModule.push({
					name: expression.callee.name,
					argumentTypes: [ I32TypeIr ],
					locals: [],
					returnType: I32TypeIr,
					body: generateExpressionIr(abstraction.body, variables, functions),
					export: false
				})

				return {
					tag: "Call",
					name: expression.callee.name,
					arguments: [ generateExpressionIr(expression.argument, variables, functions) ]
				}
			}

			default:
				throw Error(`Unhandled expression ${ExpressionTag[expression.tag]}`)
		}
	}
}

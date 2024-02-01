import { TypeSchemeType, inferTypes, typeToString } from "./inferTypes"
import { ExpressionTag, parse, type Expression } from "./parse"
import { tokenise } from "./tokenise"

export enum IrTag { I32Type = 1, I32Literal }
export type I32Type = { tag: IrTag.I32Type }
export type TypeIr = I32Type
export type I32LiteralIr = { tag: IrTag.I32Literal, value: number }
export type ExpressionIr = I32LiteralIr

export const I32Type: I32Type = { tag: IrTag.I32Type }
export const I32LiteralIr = (value: number): I32LiteralIr => ({ tag: IrTag.I32Literal, value })

type IrFunction = {
	name: string
	argumentTypes: TypeIr[] | undefined
	returnType: TypeIr
	locals: TypeIr[]
	body: ExpressionIr
	export: boolean
}

export type IrModule = IrFunction[]

export function generateIr(expression: Expression): IrModule {
	const irModule = []
	const locals: I32Type[] = []

	const body = generateExpressionIr(expression, {})

	const functionIr: IrFunction = {
		name: "main",
		argumentTypes: undefined,
		body,
		export: true,
		locals,
		returnType: { tag: IrTag.I32Type }
	}

	irModule.push(functionIr)

	return irModule

	function generateExpressionIr(expression: Expression, environment: Record<string, { type: TypeSchemeType, localIndex: number }>): ExpressionIr {
		switch (expression.tag) {
			case ExpressionTag.False:
				return I32LiteralIr(0)

			case ExpressionTag.True:
				return I32LiteralIr(1)

			case ExpressionTag.Integer:
				return I32LiteralIr(expression.value)

			case ExpressionTag.Let: {
				const { type: variableType } = inferTypes(expression.value, Object.fromEntries(Object.entries(environment).map(([ name, { type } ]) => [ name, type ])))

				// console.log(typeToString(variableType))

				generateExpressionIr(expression.body, { ...environment, [expression.name]: { type: variableType, localIndex: 0 } })

				// const subVariables = { ...variables, [expression.name]: locals.length }
				// locals.push(I32Type)

				return
			}

			case ExpressionTag.Application: {
				const { type } = inferTypes(expression.callee, Object.fromEntries(Object.entries(environment).map(([ name, { type } ]) => [ name, type ])))

				console.log(typeToString(type))

				return
			}
		}
	}
}

console.log(JSON.stringify(generateIr(parse([ ...tokenise(`let foo = x.x in foo 0`) ]))))

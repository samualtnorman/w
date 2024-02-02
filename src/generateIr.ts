import { inspect } from "util"
import { AnnotatedExression, TypeAnnotation, TypeTag, inferTypes, typeToString } from "./inferTypes"
import { AbstractionExpression, ExpressionTag, parse } from "./parse"
import { tokenise } from "./tokenise"
// import binaryen from "binaryen"

// binaryen.auto

// new binaryen.Module().addFunction("foo", binaryen.none, binaryen.none, [], binar)

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

export function generateIr(expression: AnnotatedExression): IrModule {
	if (expression.type.tag != TypeTag.Bool && expression.type.tag != TypeTag.Int)
		throw Error(`Module must return bool or int, got ${typeToString(expression.type)}`)

	const irModule: IrFunction[] = []
	const locals: TypeIr[] = []

	const body = generateExpressionIr(expression, {})

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
		environment: Record<
			string,
			{ tag: "Local", index: number } | { tag: "Function", ast: AbstractionExpression<TypeAnnotation> }
		>
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
						{ ...environment, [expression.name]: { tag: "Function", ast: expression.value } }
					)
				}

				const ir: ExpressionIr = [
					SetLocalIr(locals.length, generateExpressionIr(expression.value, environment)),
					generateExpressionIr(
						expression.body,
						{ ...environment, [expression.name]: { tag: "Local", index: locals.length } }
					)
				]

				locals.push(I32TypeIr)

				return ir
			}

			case ExpressionTag.Identifier: {
				const variable = environment[expression.name]

				if (!variable)
					throw Error(`Missing variable ${expression.name}`)

				if (variable.tag != "Local")
					throw Error(`Expected ${expression.name} to be Local, got ${variable.tag}`)

				return GetLocalIr(variable.index)
			}

			case ExpressionTag.Application: {
				if (expression.callee.tag == ExpressionTag.Application) {
					return generateExpressionIr(expression.callee, environment)
				}

				if (expression.callee.tag != ExpressionTag.Identifier)
					throw Error("Unsupported application")

				const variable = environment[expression.callee.name]

				if (!variable)
					throw Error(`Missing variable ${expression.callee.name}`)

				if (variable.tag == "Function") {
					if (expression.argument.type.tag == TypeTag.Function) {
						generateExpressionIr(variable.ast.body, { ...environment, [variable.ast.argumentName]: { tag: "Function", ast: expression.argument } })
					}

					// generateExpressionIr(variable.ast.body, { ...environment, [variable.ast.argumentName]: {  } })
				}

				if (variable.tag != "Function")
					throw Error(`Expected Function, got ${variable.tag}`)

				const ir: ExpressionIr = [
					SetLocalIr(locals.length, generateExpressionIr(expression.argument, environment)),
					generateExpressionIr(variable.ast.body, { ...environment, [variable.ast.argumentName]: { tag: "Local", index: locals.length } })
				]

				locals.push(I32TypeIr)

				return ir
			}

			default:
				throw Error(`Unhandled expression ${ExpressionTag[expression.tag]}`)
		}
	}
}

const debugLog = (value: unknown) => console.debug(inspect(value, { depth: Infinity, colors: true }))

console.log(inspect(generateIr(inferTypes(parse([ ...tokenise(`(a.a) (a.a)`) ]))), { depth: Infinity, colors: true }))

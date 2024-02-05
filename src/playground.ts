import { inspect } from "util"
import { downLevel } from "./downLevel"
import { generateBinaryenModule } from "./generateBinaryenModule"
import { generateIr } from "./generateIr"
import { BoolType, FunctionType, IntType, TypeAnnotation, TypeSchemeType, TypeVariableType, inferTypes, typeToString } from "./inferTypes"
import { AbstractionExpression, expressionToSource, parse } from "./parse"
import { tokenise } from "./tokenise"

try {
	const source = `
		let rec fib = n ->
			if n < 2 then
				n
			else
				fib (n - 1) + fib (n - 2)
			in
		fib
	`

	const tokens = [ ...tokenise(source) ]
	const ast = parse(tokens)

	console.log(expressionToSource(ast))
	console.log()

	const typedAst = inferTypes(ast, {
		add: TypeSchemeType([], FunctionType(IntType, FunctionType(IntType, IntType))),
		ternary: TypeSchemeType(
			[ "a" ],
			FunctionType(
				BoolType,
				FunctionType(
					TypeVariableType("a"),
					FunctionType(TypeVariableType("a"), TypeVariableType("a"))
				)
			)
		),
		lt_s: TypeSchemeType([], FunctionType(IntType, FunctionType(IntType, BoolType)))
	})

	console.log(typeToString(typedAst.type))
	console.log()

	const downLeveledAst = downLevel(typedAst)

	console.log(expressionToSource(downLeveledAst))
	console.log()

	const irModule = generateIr(downLeveledAst as AbstractionExpression<TypeAnnotation>)

	console.log(inspect(irModule, { depth: Infinity, colors: true }))
	console.log()

	const binaryenModule = generateBinaryenModule(irModule)
	const wat = binaryenModule.emitStackIR()

	console.log(wat)

	const byteCode = binaryenModule.emitBinary()
	const { instance: wasmInstance } = await WebAssembly.instantiate(byteCode)

	console.log(wasmInstance.exports.main(42))
} catch (error) {
	console.error("Caught", error.stack)
}

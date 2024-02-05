import { inspect } from "util"
import { downLevel } from "./downLevel"
import { generateBinaryenModule } from "./generateBinaryenModule"
import { generateIr } from "./generateIr"
import { FunctionType, IntType, TypeAnnotation, TypeSchemeType, inferTypes } from "./inferTypes"
import { AbstractionExpression, expressionToSource, parse } from "./parse"
import { tokenise } from "./tokenise"

try {
	const source = `
		let increment = add 1 in
		let count = 0 in
		let count = increment count in
		let count = increment count in
		let count = increment count in
		arg.count
	`
	const tokens = [ ...tokenise(source) ]
	const ast = parse(tokens)

	console.log(expressionToSource(ast))
	console.log()

	const typedAst = inferTypes(ast, { add: TypeSchemeType([], FunctionType(IntType, FunctionType(IntType, IntType))) })
	const downLeveledAst = downLevel(typedAst)

	console.log(expressionToSource(downLeveledAst))

	const irModule = generateIr(downLeveledAst as AbstractionExpression<TypeAnnotation>)

	console.log(inspect(irModule, { depth: Infinity, colors: true }))
	console.log()

	const binaryenModule = generateBinaryenModule(irModule)
	const wat = binaryenModule.emitText()

	console.log(wat)

	const byteCode = binaryenModule.emitBinary()
	const { instance: wasmInstance } = await WebAssembly.instantiate(byteCode)

	console.log(wasmInstance.exports.main(42))
} catch (error) {
	console.error("Caught", error.stack)
}

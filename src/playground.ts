import { inspect } from "util"
import { FunctionType, IntType, TypeSchemeType, type Type } from "./Type"
import { downLevel } from "./downLevel"
import { generateBinaryenModule } from "./generateBinaryenModule"
import { generateIr } from "./generateIr"
import { inferTypes } from "./inferTypes"
import { expressionToSource, expressionToString, parse, type AbstractionExpression } from "./parse"
import { substitutionToString } from "./substitutionToString"
import { tokenise } from "./tokenise"
import { typeToString } from "./typeToString"

try {
	const source = `
		let rec fibonacci = n ->
			if n < 2 then
				n
			else
				(fibonacci (n - 1)) + (fibonacci (n - 2))
			in
		fibonacci
	`

	const tokens = [ ...tokenise(source) ]
	const ast = parse(tokens)

	console.log(`Formatted Source:`)
	console.log(expressionToSource(ast))
	console.log()

	const { substitution, ...typedAst } = inferTypes(ast, {
		add: TypeSchemeType([], FunctionType(IntType, FunctionType(IntType, IntType)))
	})

	console.log(`Typed AST:`)
	console.log(expressionToString(typedAst))
	console.log()

	console.log("Substitution:")
	console.log(substitutionToString(substitution))
	console.log()

	console.log("Type:")
	console.log(typeToString(typedAst.type))
	console.log()

	const downLeveledAst = downLevel(typedAst)

	console.log("Downleveled Source:")
	console.log(expressionToSource(downLeveledAst))
	console.log()

	const irModule = generateIr(downLeveledAst as AbstractionExpression<{ type: Type }>)

	console.log("IR:")
	console.log(inspect(irModule, { depth: Infinity, colors: true }))
	console.log()

	const binaryenModule = generateBinaryenModule(irModule)
	const wat = binaryenModule.emitStackIR()

	console.log("WAT:")
	console.log(wat)
	console.log()

	const byteCode = binaryenModule.emitBinary()
	const { instance: wasmInstance } = await WebAssembly.instantiate(byteCode)

	console.log("Result:")
	console.log((wasmInstance.exports!.main as Function)(42))
} catch (error) {
	console.error("Caught", (error as Record<string, unknown>).stack)
}

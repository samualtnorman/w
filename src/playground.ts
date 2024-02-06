import { inspect } from "util"
import { downLevel } from "./downLevel"
import { generateBinaryenModule } from "./generateBinaryenModule"
import { generateIr } from "./generateIr"
import { inferTypes, typeToString, type TypeAnnotation, TypeSchemeType, FunctionType, IntType, substitutionToString } from "./inferTypes"
import { expressionToSource, expressionToString, parse, type AbstractionExpression } from "./parse"
import { tokenise } from "./tokenise"

try {
	const source = `
		arg -> arg + arg
	`

	const tokens = [ ...tokenise(source) ]
	const ast = parse(tokens)

	console.log(`Formatted Source:`)
	console.log(expressionToSource(ast))
	console.log()

	const typedAst = inferTypes(ast, {
		add: TypeSchemeType([], FunctionType(IntType, FunctionType(IntType, IntType)))
	})

	console.log(`Annotated AST:`)
	console.log(expressionToString(typedAst))
	console.log()

	console.log("Substitution:")
	console.log(substitutionToString(typedAst.substitution))
	console.log()

	console.log("Type:")
	console.log(typeToString(typedAst.type))
	console.log()

	const downLeveledAst = downLevel(typedAst)

	console.log("Downleveled Source:")
	console.log(expressionToSource(downLeveledAst))
	console.log()

	const irModule = generateIr(downLeveledAst as AbstractionExpression<TypeAnnotation>)

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

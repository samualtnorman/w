import { inspect } from "util"
import { FunctionType, IntType, TypeSchemeType } from "./Type"
import { expressionApplySubstitution } from "./expressionApplySubstitution"
import { generateIr } from "./generateIr"
import { inferTypes } from "./inferTypes"
import { expressionToString, parse } from "./parse"
import { TokenTag, tokenise } from "./tokenise"

try {
	const source = `\
function fibonacci n
	return n if n < 2 else (fibonacci (n - 2)) + (fibonacci (n - 1))`

	const tokens = [ ...tokenise(source) ]

	console.log(`Tokens:`)

	console.log(tokens.map(({ tag, data, line, column }) =>
		`${data == undefined ? TokenTag[tag] : `${TokenTag[tag]} ${JSON.stringify(data)}`} :${line}:${column}`
	).join("\n"))

	console.log()

	const ast = parse(tokens)

	// console.log(`Formatted Source:`)
	// console.log(expressionToSource(ast))
	// console.log()

	const { substitution, ...typedAst } = inferTypes(ast, {
		add: TypeSchemeType([], FunctionType(IntType, FunctionType(IntType, IntType)))
	})

	// console.log(`Typed AST:`)
	// console.log(expressionToString(typedAst))
	// console.log()

	// console.log("Substitution:")
	// console.log(substitutionToString(substitution))
	// console.log()

	const fullyTypedAst = expressionApplySubstitution(typedAst, substitution)

	console.log("Fully Typed AST:")
	console.log(expressionToString(fullyTypedAst))
	console.log()

	// console.log("Type:")
	// console.log(typeToString(typedAst.type))
	// console.log()

	// const downLeveledAst = downLevel(typedAst)

	// console.log("Downleveled Source:")
	// console.log(expressionToSource(downLeveledAst))
	// console.log()

	const irModule = generateIr(fullyTypedAst)

	console.log("IR:")
	console.log(inspect(irModule, { depth: Infinity, colors: true }))
	console.log()

	// const binaryenModule = generateBinaryenModule(irModule)
	// const wat = binaryenModule.emitStackIR()

	// console.log("WAT:")
	// console.log(wat)
	// console.log()

	// const byteCode = binaryenModule.emitBinary()
	// const { instance: wasmInstance } = await WebAssembly.instantiate(byteCode)

	// console.log("Result:")
	// console.log((wasmInstance.exports!.main as Function)(42))
} catch (error) {
	console.error("Caught", (error as Record<string, unknown>).stack)
}

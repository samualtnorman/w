import { inspect } from "util"
import { FunctionType, IntType, TypeSchemeType } from "./Type"
import { expressionApplySubstitution } from "./expressionApplySubstitution"
import { generateIr } from "./generateIr"
import { inferTypes } from "./inferTypes"
import { expressionToString, parse } from "./parse"
import { TokenTag, tokenise } from "./tokenise"
import { spliceString } from "@samual/lib/spliceString"
import chalk, { ChalkInstance } from "chalk"

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

	let highlightedSource = source

	const tokensToChalkInstances: { [K in TokenTag]?: ChalkInstance } = {
		[TokenTag.Function]: chalk.magenta,
		[TokenTag.Return]: chalk.magenta,
		[TokenTag.If]: chalk.magenta,
		[TokenTag.Else]: chalk.magenta,
		[TokenTag.Identifier]: chalk.red,
		[TokenTag.Integer]: chalk.yellow,
		[TokenTag.LessThan]: chalk.cyan,
		[TokenTag.Add]: chalk.cyan,
		[TokenTag.Minus]: chalk.cyan,
	}

	for (const token of [ ...tokens ].reverse()) {
		const chalkInstance = tokensToChalkInstances[token.tag]

		if (chalkInstance) {
			highlightedSource = spliceString(
				highlightedSource,
				chalkInstance(source.slice(token.index, token.index + token.length)),
				token.index,
				token.length
			)
		}
	}

	console.log(highlightedSource)
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

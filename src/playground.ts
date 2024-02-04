import { inspect } from "util"
import { downLevel } from "./downLevel"
import { generateBinaryenModule } from "./generateBinaryenModule"
import { generateIr } from "./generateIr"
import { TypeAnnotation, inferTypes } from "./inferTypes"
import { AbstractionExpression, expressionToSource, parse } from "./parse"
import { tokenise } from "./tokenise"

const source = `
	let foo = 4 in
	a.foo
`

const tokens = [ ...tokenise(source) ]
const ast = parse(tokens)

console.log(expressionToSource(ast))
console.log()

const typedAst = inferTypes(ast)
const downLeveledAst = downLevel(typedAst)

console.log(expressionToSource(downLeveledAst))

const irModule = generateIr(downLeveledAst as AbstractionExpression<TypeAnnotation>)

console.log(inspect(irModule, { depth: Infinity, colors: true }))
console.log()

const binaryenModule = generateBinaryenModule(irModule)
const wat = binaryenModule.emitText()

console.log(wat)

let byteCode

try {
	byteCode = binaryenModule.emitBinary()
} catch {}

if (byteCode) {
	const { instance: wasmInstance } = await WebAssembly.instantiate(byteCode)

	console.log(wasmInstance.exports.main(0))
}

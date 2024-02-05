import binaryen from "binaryen"
import type { ExpressionIr, IrModule, TypeIr } from "./generateIr"

export function generateBinaryenModule(irModule: IrModule): binaryen.Module {
	const module = new binaryen.Module()

	for (const irFunction of irModule) {
		module.addFunction(
			irFunction.name,
			irFunction.argumentTypes
				? binaryen.createType(irFunction.argumentTypes.map(generateBinaryenType))
				: binaryen.none,
			generateBinaryenType(irFunction.returnType),
			irFunction.locals.map(generateBinaryenType),
			generateBinaryenExpression(irFunction.body)
		)

		if (irFunction.export)
			module.addFunctionExport(irFunction.name, irFunction.name)
	}

	return module

	function generateBinaryenExpression(expressionIr: ExpressionIr): number {
		switch (expressionIr.tag) {
			case `Block`:
				return module.block(expressionIr.name ?? null, expressionIr.children.map(generateBinaryenExpression))

			case `GetLocal`:
				// FIXME either figure out the type or store it in the ir
				return module.local.get(expressionIr.index, binaryen.i32)

			case `I32Literal`:
				return module.i32.const(expressionIr.value)

			case `SetLocal`:
				return module.local.set(expressionIr.index, generateBinaryenExpression(expressionIr.value))

			case `I32Add`: {
				return module.i32.add(
					generateBinaryenExpression(expressionIr.left),
					generateBinaryenExpression(expressionIr.right)
				)
			}
		}
	}
}

export function generateBinaryenType(typeIr: TypeIr): number {
	switch (typeIr.tag) {
		case `I32Type`:
			return binaryen.i32

		case `I64Type`:
			return binaryen.i64
	}
}

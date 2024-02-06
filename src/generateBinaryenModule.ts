import binaryen from "binaryen"
import type { ExpressionIr, IrFunction, IrModule, TypeIr } from "./generateIr"

export function generateBinaryenModule(irModule: IrModule): binaryen.Module {
	const module = new binaryen.Module()

	for (const irFunction of irModule) {
		module.addFunction(
			irFunction.name,
			irFunction.arguments
				? binaryen.createType(irFunction.arguments.map(generateBinaryenType))
				: binaryen.none,
			generateBinaryenType(irFunction.returnType),
			irFunction.locals.map(generateBinaryenType),
			generateBinaryenExpression(irFunction.body, irFunction)
		)

		if (irFunction.export)
			module.addFunctionExport(irFunction.name, irFunction.name)
	}

	return module

	function generateBinaryenExpression(expressionIr: ExpressionIr, irFunction: IrFunction): number {
		switch (expressionIr.tag) {
			case `Block`: {
				return module.block(
					expressionIr.name ?? null,
					expressionIr.children.map(item => generateBinaryenExpression(item, irFunction))
				)
			}

			case `GetLocal`: {
				return module.local.get(
					expressionIr.index,
					generateBinaryenType([ ...irFunction.arguments, ...irFunction.locals ][expressionIr.index]!)
				)
			}

			case `I32Literal`:
				return module.i32.const(expressionIr.value)

			case `SetLocal`:
				return module.local.set(expressionIr.index, generateBinaryenExpression(expressionIr.value, irFunction))

			case `I32Add`: {
				return module.i32.add(
					generateBinaryenExpression(expressionIr.left, irFunction),
					generateBinaryenExpression(expressionIr.right, irFunction)
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

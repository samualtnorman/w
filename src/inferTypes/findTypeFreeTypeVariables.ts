import { TypeTag, type Type, type TypeSchemeType } from "../Type"

export function findTypeFreeTypeVariables(type: Type | TypeSchemeType, freeTypeVariables: Set<string>): void {
	switch (type.tag) {
		case TypeTag.Bool:
		case TypeTag.Int:
			break

		case TypeTag.TypeVariable: {
			freeTypeVariables.add(type.name)
		} break

		case TypeTag.Function: {
			findTypeFreeTypeVariables(type.argument, freeTypeVariables)
			findTypeFreeTypeVariables(type.return, freeTypeVariables)
		} break

		case TypeTag.TypeScheme: {
			const typeVariables = new Set<string>

			findTypeFreeTypeVariables(type.type, typeVariables)

			for (const variable of typeVariables) {
				if (!type.bound.includes(variable))
					freeTypeVariables.add(variable)
			}
		}
	}
}

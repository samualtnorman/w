import { TypeTag, type Type, type TypeSchemeType } from "../Type"

export function findTypeFreePlaceholders(type: Type | TypeSchemeType, freePlaceholders: Set<string>): void {
	switch (type.tag) {
		case TypeTag.Bool:
		case TypeTag.Int:
			break

		case TypeTag.Placeholder: {
			freePlaceholders.add(type.name)
		} break

		case TypeTag.Function: {
			findTypeFreePlaceholders(type.argument, freePlaceholders)
			findTypeFreePlaceholders(type.return, freePlaceholders)
		} break

		case TypeTag.TypeScheme: {
			const typeVariables = new Set<string>

			findTypeFreePlaceholders(type.type, typeVariables)

			for (const variable of typeVariables) {
				if (!type.bound.includes(variable))
					freePlaceholders.add(variable)
			}
		}
	}
}

import { TypeTag, type Type, type TypeSchemeType } from "./Type"

export function typeToString(type: Type | TypeSchemeType): string {
	switch (type.tag) {
		case TypeTag.Bool:
			return "bool"

		case TypeTag.Int:
			return "int"

		case TypeTag.Placeholder:
			return type.name

		case TypeTag.Function: {
			if (type.argument.tag == TypeTag.Function) {
				if (type.return.tag == TypeTag.Function)
					return `(${typeToString(type.argument)}) -> (${typeToString(type.return)})`

				return `(${typeToString(type.argument)}) -> ${typeToString(type.return)}`
			}

			if (type.return.tag == TypeTag.Function)
				return `${typeToString(type.argument)} -> (${typeToString(type.return)})`

			return `${typeToString(type.argument)} -> ${typeToString(type.return)}`
		}

		case TypeTag.TypeScheme:
			return `Scheme([${type.bound.join()}], ${typeToString(type.type)})`
	}
}

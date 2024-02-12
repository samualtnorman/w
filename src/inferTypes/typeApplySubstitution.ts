import { TypeTag, type Substitution, type Type } from "../Type"

export function typeApplySubstitution(type: Type, substitution: Substitution): Type {
	switch (type.tag) {
		case TypeTag.Bool:
		case TypeTag.Int:
			return type

		case TypeTag.Placeholder:
			return substitution[type.name] || type

		case TypeTag.Function: {
			return {
				tag: TypeTag.Function,
				argument: typeApplySubstitution(type.argument, substitution),
				return: typeApplySubstitution(type.return, substitution)
			}
		}
	}
}

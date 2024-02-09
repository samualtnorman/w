import { TypeTag, type Type } from "../Type"
import type { TypeAnnotation } from "../inferTypes"
import { typeToString } from "../typeToString"
import { composeSubstitutions } from "./composeSubstitutions"
import { contains } from "./contains"
import { typeApplySubstitution } from "./typeApplySubstitution"

export function unify(a: Type, b: Type): TypeAnnotation {
	if (a.tag == TypeTag.TypeVariable) {
		if (b.tag == TypeTag.TypeVariable && a.name == b.name)
			return { type: a, substitution: {} }

		if (contains(b, a))
			throw Error(`Infinite type ${a.name}: ${typeToString(b)}`)

		return { type: b, substitution: { [a.name]: b } }
	}

	switch (b.tag) {
		case TypeTag.Bool:
		case TypeTag.Int: {
			if (a.tag == b.tag)
				return { type: a, substitution: {} }

			throw Error(`Cannot unify ${typeToString(a)} and ${typeToString(b)}`)
		}

		case TypeTag.TypeVariable: {
			if (contains(a, b))
				throw Error(`Infinite type ${b.name}: ${typeToString(a)}`)

			return { type: a, substitution: { [b.name]: a } }
		}

		case TypeTag.Function: {
			if (a.tag != TypeTag.Function)
				throw Error(`Cannot unify ${typeToString(a)} and ${typeToString(b)}`)

			const argumentType = unify(a.argument, b.argument)

			const returnType = unify(
				typeApplySubstitution(a.return, argumentType.substitution),
				typeApplySubstitution(b.return, argumentType.substitution)
			)

			const substitution = composeSubstitutions(argumentType.substitution, returnType.substitution)

			return { type: typeApplySubstitution(a, substitution), substitution }
		}
	}
}

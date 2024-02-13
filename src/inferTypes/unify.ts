import { TypeTag, type Substitution, type Type } from "../Type"
import { typeToString } from "../typeToString"
import { composeSubstitutions } from "./composeSubstitutions"
import { contains } from "./contains"

export function unify(a: Type, b: Type): { type: Type, substitution: Substitution } {
	if (a.tag == TypeTag.Placeholder) {
		if (b.tag == TypeTag.Placeholder && a.name == b.name)
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

		case TypeTag.Placeholder: {
			if (contains(a, b))
				throw Error(`Infinite type ${b.name}: ${typeToString(a)}`)

			return { type: a, substitution: { [b.name]: a } }
		}

		case TypeTag.Function: {
			if (a.tag != TypeTag.Function)
				throw Error(`Cannot unify ${typeToString(a)} and ${typeToString(b)}`)

			return {
				type: a,
				substitution: composeSubstitutions(
					unify(a.argument, b.argument).substitution,
					unify(a.return, b.return).substitution
				)
			}
		}
	}
}

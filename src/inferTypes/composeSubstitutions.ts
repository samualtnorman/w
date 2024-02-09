import type { Substitution } from "../Type"
import { typeApplySubstitution } from "./typeApplySubstitution"

export function composeSubstitutions(a: Substitution, b: Substitution): Substitution {
	const substitution: Substitution = { ...b, ...a }

	for (const typeVariable in substitution)
		substitution[typeVariable] = typeApplySubstitution(substitution[typeVariable]!, substitution)

	return substitution
}

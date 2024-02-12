import type { Substitution } from "../Type"
import { typeApplySubstitution } from "./typeApplySubstitution"

export function composeSubstitutions(a: Substitution, b: Substitution): Substitution {
	const substitution: Substitution = { ...b, ...a }

	for (const placeholder in substitution)
		substitution[placeholder] = typeApplySubstitution(substitution[placeholder]!, substitution)

	return substitution
}

import chalk from "chalk"
import type { Substitution } from "../Type"
import { substitutionToString } from "../substitutionToString"
import { typeApplySubstitution } from "./typeApplySubstitution"
import { unify } from "./unify"

export function composeSubstitutions(a: Substitution, b: Substitution): Substitution {
	console.debug(chalk.yellow(`composeSubstitutions(${substitutionToString(a)}, ${substitutionToString(b)})`))

	a = Object.fromEntries(Object.entries(a).map(([ name, type ]) => [ name, typeApplySubstitution(type, b) ]))
	b = Object.fromEntries(Object.entries(b).map(([ name, type ]) => [ name, typeApplySubstitution(type, a) ]))

	const substitution: Substitution = { ...a, ...b }

	for (const placeholder in a) {
		if (placeholder in b) {
			const { type, substitution: substitution_ } = unify(a[placeholder]!, b[placeholder]!)

			console.debug(HERE, substitution_, substitution)
			substitution[placeholder] = type
		}
	}

	return substitution
}

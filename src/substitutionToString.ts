import { Substitution } from "./Type"
import { typeToString } from "./typeToString"

export const substitutionToString = (substitution: Substitution) =>
	`{${Object.entries(substitution).map(([name, type]) => `${name}: ${typeToString(type)}`).join(", ")}}`

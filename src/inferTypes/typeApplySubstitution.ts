import chalk from "chalk"
import { TypeTag, type Substitution, type Type } from "../Type"
import { substitutionToString } from "../substitutionToString"
import { typeToString } from "../typeToString"

export function typeApplySubstitution(type: Type, substitution: Substitution): Type {
	console.debug(chalk.green(`typeApplySubstitution(${typeToString(type)}, ${substitutionToString(substitution)})`))

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

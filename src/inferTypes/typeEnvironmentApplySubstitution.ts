import { Substitution } from "../Type"
import { TypeEnvironment } from "../inferTypes"
import { typeSchemeTypeApplySubsitution } from "./typeSchemeTypeApplySubsitution"

export const typeEnvironmentApplySubstitution =
	(typeEnvironment: TypeEnvironment, substitution: Substitution): TypeEnvironment => Object.fromEntries(
		Object.entries(typeEnvironment)
			.map(([name, typeSchemeType]) => [name, typeSchemeTypeApplySubsitution(typeSchemeType, substitution)])
	)

import { TypeSchemeType, type Substitution } from "../Type"
import { typeApplySubstitution } from "./typeApplySubstitution"

export const typeSchemeTypeApplySubsitution =
	(typeSchemeType: TypeSchemeType, substitution: Substitution): TypeSchemeType => TypeSchemeType(
		typeSchemeType.bound,
		typeApplySubstitution(
			typeSchemeType.type,
			Object.fromEntries(Object.entries(substitution).filter(([name]) => !typeSchemeType.bound.includes(name)))
		)
	)

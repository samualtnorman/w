const enum TypeTag { Bool, Int, Float, Function, Variable, Return, Scheme }

type BoolType = { tag: TypeTag.Bool }
type IntType = { tag: TypeTag.Int }
type FloatType = { tag: TypeTag.Float }
type FunctionType = { tag: TypeTag.Function, left: Type, right: Type }
type VariableType = { tag: TypeTag.Variable, name: string }
type ReturnTypeType = { tag: TypeTag.Return, function: FunctionType | VariableType | ReturnTypeType }
type SchemeType = { tag: TypeTag.Scheme, variables: string[], type: FunctionType }
type Type = BoolType | IntType | FloatType | FunctionType | VariableType | ReturnTypeType | SchemeType
const BoolType: BoolType = { tag: TypeTag.Bool }
const IntType: IntType = { tag: TypeTag.Int }
const FloatType: FloatType = { tag: TypeTag.Float }
const VariableType = (name: string): VariableType => ({ tag: TypeTag.Variable, name })
const FunctionType = (left: Type, right: Type): FunctionType => ({ tag: TypeTag.Function, left, right })
// const ReturnType = (function_: FunctionType | VariableType | ReturnType): ReturnType => ({ tag: TypeTag.Return, function: function_ })
const SchemeType = (variables: string[], type: FunctionType): SchemeType => ({ tag: TypeTag.Scheme, variables, type })
type Substitution = Record<string, Type>

const substitutionToString = (substitution: Substitution) =>
	`{${Object.entries(substitution).map(([ name, type ]) => `${name}: ${typeToString(type)}`).join(", ")}}`

function apply(substitution: Substitution, type: Type): Type {
	switch (type.tag) {
		case TypeTag.Bool:
		case TypeTag.Int:
		case TypeTag.Float:
			return type

		case TypeTag.Variable:
			return substitution[type.name] || type

		case TypeTag.Function:
			return FunctionType(apply(substitution, type.left), apply(substitution, type.right))

		case TypeTag.Return: {
			const functionType = apply(substitution, type.function)

			if (functionType.tag == TypeTag.Variable)
				return functionType

			if (functionType.tag != TypeTag.Function)
				throw Error(`Expected function type, got: ${typeToString(functionType)}`)

			return functionType.right
		}

		case TypeTag.Scheme: {

		}
	}
}

function composeSubstitutions(a: Substitution, b: Substitution): Substitution {
	const substitution: Substitution = { ...b, ...a }

	for (const typeVariable in substitution)
		substitution[typeVariable] = apply(substitution, substitution[typeVariable]!)

	return substitution
}

function typeToString(type: Type): string {
	switch (type.tag) {
		case TypeTag.Bool:
			return "bool"

		case TypeTag.Int:
			return "int"

		case TypeTag.Float:
			return "float"

		case TypeTag.Variable:
			return type.name

		case TypeTag.Function: {
			if (type.left.tag == TypeTag.Function) {
				if (type.right.tag == TypeTag.Function)
					return `(${typeToString(type.left)}) -> (${typeToString(type.right)})`

				return `(${typeToString(type.left)}) -> ${typeToString(type.right)}`
			}

			if (type.right.tag == TypeTag.Function)
				return `${typeToString(type.left)} -> (${typeToString(type.right)})`

			return `${typeToString(type.left)} -> ${typeToString(type.right)}`
		}

		case TypeTag.Return:
			return `ReturnType(${typeToString(type.function)})`

		case TypeTag.Scheme:
			return `Scheme([${type.variables.join()}], ${typeToString(type.type)})`
	}
}

function instantiate(scheme: SchemeType, type: Type): Type {
	if (scheme.type.left.tag == TypeTag.Variable && scheme.variables.includes(scheme.type.left.name))
		return apply({ [scheme.type.left.name]: type }, scheme.type)

	return scheme.type
}

function unify(a: Type, b: Type): { type: Type, substitution: Substitution } {
	if (a.tag == TypeTag.Variable) {
		if (b.tag == TypeTag.Variable && a.name == b.name)
			return { type: a, substitution: {} }

		if (contains(b, a))
			throw Error(`Infinite type ${a.name}: ${typeToString(b)}`)

		return { type: b, substitution: { [a.name]: b } }
	}

	switch (b.tag) {
		case TypeTag.Bool:
		case TypeTag.Int:
		case TypeTag.Float: {
			if (a.tag == b.tag)
				return { type: a, substitution: {} }

			throw Error(`Cannot unify ${typeToString(a)} and ${typeToString(b)}`)
		}

		case TypeTag.Variable: {
			if (contains(a, b))
				throw Error(`Infinite type ${b.name}: ${typeToString(a)}`)

			return { type: a, substitution: { [b.name]: a } }
		}

		case TypeTag.Function: {
			if (a.tag != TypeTag.Function)
				throw Error(`Cannot unify ${typeToString(a)} and ${typeToString(b)}`)

			const left = unify(a.left, b.left)
			const right = unify(apply(left.substitution, a.right), apply(left.substitution, b.right))
			const substitution = composeSubstitutions(left.substitution, right.substitution)

			return { type: apply(substitution, a), substitution }
		}
	}
}

function contains(haystack: Type, needle: Type): boolean {
	switch (haystack.tag) {
		case TypeTag.Bool:
		case TypeTag.Int:
		case TypeTag.Float:
			return haystack.tag == needle.tag

		case TypeTag.Variable:
			return needle.tag == TypeTag.Variable && needle.name == haystack.name

		case TypeTag.Function:
			return contains(haystack.left, needle) || contains(haystack.right, needle)
	}
}

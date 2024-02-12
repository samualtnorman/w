import { TypeTag, type Type, type TypeSchemeType } from "../Type"

export function contains(haystack: Type | TypeSchemeType, needle: Type): boolean {
	switch (haystack.tag) {
		case TypeTag.Bool:
		case TypeTag.Int:
			return haystack.tag == needle.tag

		case TypeTag.Placeholder:
			return needle.tag == TypeTag.Placeholder && needle.name == haystack.name

		case TypeTag.Function:
			return contains(haystack.argument, needle) || contains(haystack.return, needle)

		case TypeTag.TypeScheme:
			return contains(haystack.type, needle)
	}
}

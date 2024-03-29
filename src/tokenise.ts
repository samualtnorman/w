export enum TokenTag {
	Integer = 1, True, False, Identifier, Dot, Let, Equals, In, OpenBracket, CloseBracket, RightArrow, LessThan,
	Minus, Add, Recursive, If, Then, Else, Function, Newline
}

export type DataTokenTag = TokenTag.Integer | TokenTag.Identifier | TokenTag.Newline
export type NonDataTokenTag = Exclude<TokenTag, DataTokenTag>
export type NonDataToken = { tag: NonDataTokenTag, data: undefined }
export type DataToken = { tag: DataTokenTag, data: string }
export type Token = NonDataToken | DataToken
export type Location = { index: number, line: number, column: number, length: number }

export const NonDataTokenDefinitions: { regex: RegExp, tag: NonDataTokenTag }[] = [
	{ regex: /^function\b/, tag: TokenTag.Function },
	{ regex: /^if\b/, tag: TokenTag.If },
	{ regex: /^then\b/, tag: TokenTag.Then },
	{ regex: /^else\b/, tag: TokenTag.Else },
	{ regex: /^rec\b/, tag: TokenTag.Recursive },
	{ regex: /^true\b/, tag: TokenTag.True },
	{ regex: /^false\b/, tag: TokenTag.False },
	{ regex: /^let\b/, tag: TokenTag.Let },
	{ regex: /^in\b/, tag: TokenTag.In },
	{ regex: /^\./, tag: TokenTag.Dot },
	{ regex: /^=/, tag: TokenTag.Equals },
	{ regex: /^\(/, tag: TokenTag.OpenBracket },
	{ regex: /^\)/, tag: TokenTag.CloseBracket },
	{ regex: /^->/, tag: TokenTag.RightArrow },
	{ regex: /^</, tag: TokenTag.LessThan },
	{ regex: /^-/, tag: TokenTag.Minus },
	{ regex: /^\+/, tag: TokenTag.Add }
]

export const DataTokenDefinitions: { regex: RegExp, tag: DataTokenTag }[] = [
	{ regex: /^(\d+)\b/, tag: TokenTag.Integer },
	{ regex: /^([a-zA-Z_]\w*)\b/, tag: TokenTag.Identifier },
	{ regex: /^\n+(\t*)/, tag: TokenTag.Newline }
]

export function* tokenise(code: string): Generator<Token & Location, void> {
	let index = 0
	let line = 1
	let column = 1

	while (index < code.length) {
		let match

		x: if (!(match = /^ +/.exec(code.slice(index)))) {
			for (const { regex, tag } of NonDataTokenDefinitions) {
				if ((match = regex.exec(code.slice(index)))) {
					yield { tag, data: undefined, index, line, column, length: match[0].length }
					break x
				}
			}

			for (const { regex, tag } of DataTokenDefinitions) {
				if ((match = regex.exec(code.slice(index)))) {
					yield { tag, data: match[1]!, index, line, column, length: match[0].length }
					break x
				}
			}

			throw Error(`Unexpected character ${JSON.stringify(code[index])}`)
		}

		index += match[0].length

		if (match[0].includes("\n")) {
			line += match[0].match(/\n/g)?.length!
			column = match[0].length - match[0].lastIndexOf("\n")
		} else
			column += match[0].length
	}
}

export const tokenToString = (token: Token): string =>
	token.data == undefined ? TokenTag[token.tag] : `${TokenTag[token.tag]} ${JSON.stringify(token.data)}`

export const tokenIs = <T extends TokenTag>(token: Token, tag: T): token is Token & { tag: T } => token.tag == tag

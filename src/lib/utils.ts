export function isIntStr(thing: string) {
	return parseInt(thing, 10) === +thing
}

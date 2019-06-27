export function makeDebug(sub, color) {
	const ns = 'hexazine' + (sub !== '' ? ':' + sub : '')
	const debug = require('debug')(ns)
	debug.enabled = true
	debug.color = color

	return debug
}
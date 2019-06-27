import {makeDebug}    from '../lib/logger'
import {safeShutdown} from './servers'
import Signals = NodeJS.Signals

const debug = makeDebug('signal-shutdown', 1)

for (const name of <Signals[]> [
	'SIGINT', // CTRL+C
	'SIGTERM', // `kill` command
	'SIGUSR1', // `kill` command
	'SIGUSR2' // `kill` command
]) {
	process.on(
		name,
		async () => {
			debug('recieved %s', name)

			await safeShutdown()
		}
	)
}

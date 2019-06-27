import {pathExists, readFile} from 'fs-extra'
import {equals} from 'typescript-is'
import {makeCustomDomainsProxy} from './app/custom-domains/proxy'
import {startServers} from './app/servers'
import {HexazineApi} from './lib/api'
import {makeDebug} from './lib/logger'
import {HexazineConfig} from './types/hexazine'
import {configLocation} from './types/vars'

process.on(
	'unhandledRejection',
	e => console.log(e)
)

const debug = makeDebug('', 3);

(async () => {
	debug('starting')

	if (!await pathExists(configLocation)) {
		debug('Error: `config.json` not found')
		debug('Please follow the instructions in `config.default.json`')

		process.exit(1)
	}

	const config: HexazineConfig = JSON.parse(
		await readFile(configLocation, 'utf8')
	)

	if (!equals<HexazineConfig>(config)) {
		debug('Error: Invalid `config`')
		debug('Check `config.default.json` for any options you don\'t have')
		debug('and remove any extra ones')

		process.exit(1)
	}

	const api = new HexazineApi(config)
	await api.init()

	if (config.mailgun_private_key !== '' && config.mailgun_public_key !== '' &&
	    config.mailgun_domain !== '') {
		api.initNotifications(
			config.mailgun_private_key, config.mailgun_public_key,
			config.mailgun_domain, config.api_base
		)
	}

	const app = await require('./app/app.ts')(api)
	const proxy = makeCustomDomainsProxy(app, config)

	await startServers(proxy, api.config.port)

	require('./app/signal-shutdown.ts')
})()

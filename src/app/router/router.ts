import * as express  from 'express'
import {Express}     from 'express'
import {readdir}     from 'fs-extra'
import {HexazineApi} from '../../lib/api'
import {makeDebug}   from '../../lib/logger'

const debug = makeDebug('router', 1)

export = async function(app: Express, api: HexazineApi) {
	const router = express.Router()

	const middleware = [
		'x-powered-by',
		'raw-request-body',
		'debug-requests',
		// 'cors-enable',
		'authenticate'
	]

	for (const name of middleware) {
		debug('loading middleware %s', name)

		router.use(await require('./middleware/' + name)(app, api))
	}

	const filenames = await readdir(__dirname + '/routes')

	for (const filename of filenames) {
		debug('loading route file %s', filename)

		router.use(await require('./routes/' + filename)(router, api))
	}

	router.use(require('./middleware/no-match.ts'))
	router.use(require('./middleware/error-handler.ts'))

	return router
}

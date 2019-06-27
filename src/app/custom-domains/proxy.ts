import {Express}        from 'express'
import {makeExpress}    from '../../lib/express-app'
import {HexazineConfig} from '../../types/hexazine'

export function makeCustomDomainsProxy(app: Express, config: HexazineConfig) {
	const proxy = makeExpress()

	proxy.use(require('./middleware')(config))
	proxy.use(app)

	return proxy
}

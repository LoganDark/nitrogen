import {NextFunction, Response}     from 'express'
import * as URI                     from 'uri-js'
import {URIComponents}              from 'uri-js'
import {ApiRequest, HexazineConfig} from '../../types/hexazine'

export = (config: HexazineConfig) => {
	const customDomainsRouter = require('./router')(config)

	return async (
		req: ApiRequest,
		res: Response,
		next: NextFunction
	) => {
		if (!req.headers.hasOwnProperty('host')) {
			res.status(400)
			res.end('Missing Host header\n', 'utf8')

			return
		}

		let uri: URIComponents

		try {
			uri = URI.parse(`https://${req.headers.host}`)
		} catch (e) {
			res.status(400)
			res.end(`Invalid Host header: ${e}\n`, 'utf8')

			return
		}

		if (uri.host === config.host) {
			next()

			return
		}

		res.status(501)
		res.end('Not implemented\n', 'utf8')
	}
}

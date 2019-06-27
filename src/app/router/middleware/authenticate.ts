import {Express, NextFunction, Response} from 'express'
import {is}                              from 'typescript-is'
import {HexazineApi}                     from '../../../lib/api'
import {makeDebug}                       from '../../../lib/logger'
import {Headers}                         from '../../../types/bodies'
import {ApiRequest}                      from '../../../types/hexazine'

const debug = makeDebug('authenticate', 1)

export = async (
	app: Express,
	api: HexazineApi
) => {
	const noAuthRoutes = [
		/^\/accounts\/auth$/,
		/^\/accounts\/new$/,
		/^\/health$/,
		/^\/projects\/published\/.+$/,
		/^\/verifyEmail\/.+$/,
		/^\/revertEmail\/.+$/
	]

	if (api.config.secret !== '') {
		noAuthRoutes.push(/^\/github$/)
	}

	return async (
		req: ApiRequest,
		res: Response,
		next: NextFunction
	) => {
		const headers = req.headers

		for (const regex of noAuthRoutes) {
			if (regex.test(req.url)) {
				debug('no-auth route')

				next()

				return
			}
		}

		if (is<Headers.HasToken>(headers)) {
			const token = <string> headers.token

			try {
				await api.validateToken(token)

				req.account =
					await api.getAccount(await api.getOwner(token))

				debug('passed authentication')

				next()

				return
			} catch {}
		}

		debug('failed authentication')

		res.json(null)
	}
}

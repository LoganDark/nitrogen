import * as express from 'express'
import {Express, Request, Response} from 'express'
import * as path from 'path'
import {HexazineApi} from '../lib/api'
import {makeExpress} from '../lib/express-app'
import {makeDebug} from '../lib/logger'
import {appLocation} from '../types/vars'

const debug = makeDebug('app', 2)

export = async function(api: HexazineApi): Promise<Express> {
	const app = makeExpress()

	app.use(
		'/api',
		await require('./router/router')(app, api)
	)

	if (api.config.reverse_proxy === '') {
		app.use(express.static('app'))

		app.get(
			'*',
			(
				req: Request,
				res: Response
			) => {
				res.sendFile(path.resolve(
					appLocation,
					'index.html'
				))
			}
		)
	} else {
		debug(
			'running in reverse proxy mode, non-API requests will be forwarded to %s',
			api.config.reverse_proxy
		)

		const proxy = require('http-proxy').createProxyServer()

		app.get(
			'*',
			async (
				req: Request,
				res: Response
			) => {
				try {
					await new Promise((accept, reject) =>
						proxy.web(req, res, {target: api.config.reverse_proxy},
							err => {
								if (err) {
									reject(err)
								} else {
									accept()
								}
							}
						)
					)
				} catch (e) {
					res.status(500)
					res.end(
						`Couldn\'t communicate with frontend\n\n${e}\n'`,
						'utf8'
					)
				}
			}
		)
	}

	return app
}

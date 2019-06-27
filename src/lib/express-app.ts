import * as express from 'express'

export function makeExpress() {
	const app = express()
	app.disable('x-powered-by')
	app.disable('etag')

	return app
}

import {spawn}        from 'child_process'
import * as crypto    from 'crypto'
import * as express   from 'express'
import {Response}     from 'express'
import {join}         from 'path'
import {is}           from 'typescript-is'
import {HexazineApi}  from '../../../lib/api'
import {makeDebug}    from '../../../lib/logger'
import {Headers}      from '../../../types/bodies'
import {ApiRequest}   from '../../../types/hexazine'
import {safeShutdown} from '../../servers'

const debug = makeDebug('routes:github', 3)

function signature(body: string, secret: string) {
	return crypto.createHmac(
		'sha1',
		secret
	).update(body).digest('hex')
}

function isSupposedlyGitHub(req: ApiRequest) {
	return is<Headers.GitHub>(req.headers) &&
	       req.headers['user-agent'].startsWith('GitHub-Hookshot/')
}

export = async function(
	router: express.Router,
	api: HexazineApi
): Promise<express.Router> {
	const githubRouter = express.Router()

	if (api.config.secret) {
		githubRouter.post(
			'/github',
			async (
				req: ApiRequest,
				res: Response
			) => {
				if (!isSupposedlyGitHub(req)) {
					debug('not a valid GitHub event')

					res.status(400)
					res.json(false)

					return
				}

				debug('got webhook ping from "GitHub" (need to validate first)')
				debug('calculating signature of request body')
				const sig = signature(req.rawBody, api.config.secret)
				debug('signature is %o', sig)

				if (req.headers['x-hub-signature'] !== 'sha1=' + sig) {
					debug('signature doesn\'t match')

					res.status(403)
					res.json(false)
				}

				const event = req.headers['x-github-event']

				debug('signature matches, event is %s', event)

				if (event === 'ping') {
					debug('ping event successfully received')

					res.status(200)
					res.json(true)
				} else if (event !== 'push') {
					debug('unsupported event')

					res.status(400)
					res.json(false)
				}

				res.status(200)
				res.json(true)

				if (req.body.ref === 'refs/heads/' + api.config.branch) {
					debug('executing update script')

					const child = spawn(
						'bash',
						[
							join(
								__dirname,
								'update.sh'
							)
						]
					)

					child.stdout.on(
						'data',
						(data) => process.stdout.write(data.toString())
					)

					child.stderr.on(
						'data',
						(data) => process.stderr.write(data.toString())
					)

					child.on(
						'close',
						async (
							code: number,
							signal: string
						) => {
							debug('execution completed')

							if (code !== 0) {
								debug(
									'exit status was non-zero: %d (signal: %s)',
									code,
									signal
								)

								debug('bringing down servers for update')
							} else {
								debug(
									'exit status was zero (signal: %s)', signal)
							}

							await safeShutdown()

							debug('stopping hexazine')

							process.exit(1)
						}
					)
				} else {
					debug(
						'assuming backend has been pushed and master will follow')
				}
			}
		)
	}

	return githubRouter
}

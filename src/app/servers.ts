import {Express}                         from 'express'
import * as fs                           from 'fs'
import * as http                         from 'http'
import {IncomingMessage, ServerResponse} from 'http'
import * as https                        from 'https'
import * as net                          from 'net'
import {Server}                          from 'net'
import {makeDebug}                       from '../lib/logger'

const debug = makeDebug('servers', 7)

export interface DestroyableServer extends Server {
	destroy: (callback?: Function) => void
}

const servers: DestroyableServer[] = []
let shuttingDown = false

export async function safeShutdown() {
	if (shuttingDown) {
		debug('already shutting down')

		return
	} else {
		shuttingDown = true
	}

	debug('shutting down hexazine safely')
	debug('we have %d server(s) to shutdown', servers.length)

	for (const server of servers) {
		await new Promise(
			accept => {
				server.destroy(accept)
			}
		)
	}

	debug('successfully shut down servers')
}

export async function startServers(app: Express, port: number) {
	const preDestroyableServers: Server[] = []

	port = port > 0
	       ? port
	       : undefined

	if (fs.existsSync('./privatekey.pem') &&
	    fs.existsSync('./certificate.crt')) {
		if (port) {
			debug('using HTTPS on port %d', port)

			preDestroyableServers.push(
				net.createServer(
					(con) => {
						con.once(
							'data',
							buf => {
								// If `buf` starts with 22, it's probably a
								// TLS handshake
								const proxyPort = port + (buf[0] === 22 ? 1 : 2)
								const proxy = net.createConnection(
									proxyPort,
									'localhost',
									() => {
										proxy.write(buf)
										con.pipe(proxy).pipe(con)
									}
								)
							}
						)
					}
				).listen(
					port,
					'0.0.0.0',
					() => debug('proxy server has started on port %d', port)
				)
			)
		} else {
			debug('using HTTPS on default ports')
		}

		const httpsPort = (port || 442) + 1

		preDestroyableServers.push(
			https.createServer(
				{
					key : fs.readFileSync('./privatekey.pem'),
					cert: fs.readFileSync('./certificate.crt')
				},
				app
			).listen(
				httpsPort,
				port
				? 'localhost'
				: '0.0.0.0',
				() => debug('https server has started on port %d', httpsPort)
			)
		)

		const httpPort = (port || 78) + 2

		preDestroyableServers.push(
			http.createServer(
				(
					req: IncomingMessage,
					res: ServerResponse
				) => {
					res.writeHead(
						301,
						{
							Location: 'https://' + req.headers.host + req.url
						}
					)

					res.end()
				}
			).listen(
				httpPort,
				port ? 'localhost' : '0.0.0.0',
				() => debug('http server has started on port %d', httpPort)
			)
		)
	} else {
		const httpPort = port || 80

		debug(
			'using insecure HTTP on port %d',
			httpPort
		)

		preDestroyableServers.push(
			app.listen(
				httpPort,
				'0.0.0.0',
				() => debug('server has started')
			)
		)
	}

	preDestroyableServers.forEach((server: Server) => {
		require('server-destroy')(server)

		servers.push(<DestroyableServer> server)
	})

	return servers
}

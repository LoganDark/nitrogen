import {Express, NextFunction, Response} from 'express'
import {HexazineApi}                     from '../../../lib/api'
import {ApiRequest}                      from '../../../types/hexazine'

export = async (app: Express, api: HexazineApi) => {
	return async (
		req: ApiRequest,
		res: Response,
		next: NextFunction
	) => {
		req.rawBody = ''
		req.setEncoding('utf8')

		req.on(
			'data',
			(chunk: string) => {
				req.rawBody += chunk
			}
		)

		req.on(
			'end',
			() => {
				try {
					req.body = req.rawBody.length === 0
					           ? {}
					           : JSON.parse(req.rawBody)
				} catch {
					req.body = {}
				}

				next()
			}
		)
	}
}

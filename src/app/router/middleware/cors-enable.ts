import {Express, NextFunction, Response} from 'express'
import {HexazineApi}                     from '../../../lib/api'
import {ApiRequest}                      from '../../../types/hexazine'

export = async (app: Express, api: HexazineApi) => {
	return async (
		req: ApiRequest,
		res: Response,
		next: NextFunction
	) => {
		res.header(
			'Access-Control-Allow-Origin',
			'*'
		)

		res.header(
			'Access-Control-Allow-Headers',
			'*'
		)

		if (req.method === 'OPTIONS') {
			res.status(200)
			res.end()
		} else {
			next()
		}
	}
}

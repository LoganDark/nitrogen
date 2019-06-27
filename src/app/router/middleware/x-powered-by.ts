import {Express, NextFunction, Response} from 'express'
import {HexazineApi}                     from '../../../lib/api'
import {ApiRequest}                      from '../../../types/hexazine'
import {hexazineVersion}                 from '../../../types/vars'

export = async (app: Express, api: HexazineApi) => {
	return async (
		req: ApiRequest,
		res: Response,
		next: NextFunction
	) => {
		res.header(
			'X-Powered-By',
			`Hexazine/${hexazineVersion}`
		)

		next()
	}
}

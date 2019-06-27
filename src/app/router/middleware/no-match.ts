import {Express, Request, Response} from 'express'
import {HexazineApi}                from '../../../lib/api'

export = async (app: Express, api: HexazineApi) => {
	return (
		req: Request,
		res: Response
	) => {
		res.status(404)
		res.end('No route', 'utf8')
	}
}

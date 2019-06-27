import {Express, NextFunction, Request, Response} from 'express'
import {HexazineApi}                              from '../../../lib/api'

export = async (app: Express, api: HexazineApi) => {
	return (
		err: Error,
		req: Request,
		res: Response,
		next: NextFunction
	) => {
		res.json(err)
	}
}

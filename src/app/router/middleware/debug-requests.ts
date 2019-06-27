import {Express, NextFunction, Response} from 'express'
import {is}                              from 'typescript-is'
import {HexazineApi}                     from '../../../lib/api'
import {makeDebug}                       from '../../../lib/logger'
import {Bodies}                          from '../../../types/bodies'
import {ApiRequest}                      from '../../../types/hexazine'

const debug = makeDebug('request', 1)

export = async (app: Express, api: HexazineApi) => {
	return async (
		req: ApiRequest,
		res: Response,
		next: NextFunction
	) => {
		const toRestore: {password?: string, oldPassword?: string, code?: string} = {}

		if (is<Bodies.Accounts.HasPassword>(req.body)) {
			toRestore.password = req.body.password

			req.body.password = '[censored]'
		}

		if (is<Bodies.Accounts.HasOldPassword>(req.body)) {
			toRestore.oldPassword = req.body.oldPassword

			req.body.oldPassword = '[censored]'
		}

		if (is<Bodies.Projects.UpdateCode>(req.body)) {
			toRestore.code = req.body.code

			req.body.code = '[censored]'
		}

		debug(
			'%s: %s /api%s: %O',
			req.ip,
			req.method,
			req.url,
			req.body
		)

		for (const key in toRestore) {
			req.body[key] = toRestore[key]
		}

		next()
	}
}

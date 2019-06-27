import * as express  from 'express'
import {Response}    from 'express'
import {equals}      from 'typescript-is'
import {HexazineApi} from '../../../lib/api'
import {isIntStr}    from '../../../lib/utils'
import {Bodies}      from '../../../types/bodies'
import {ProjectType} from '../../../types/database'
import {ApiRequest}  from '../../../types/hexazine'

export = async function(
	router: express.Router,
	api: HexazineApi
): Promise<express.Router> {
	const starterCodeRouter = express.Router()

	starterCodeRouter.get(
		'/starterCode/:type',
		async (
			req: ApiRequest,
			res: Response
		) => {
			if (req.account.isAdmin && isIntStr(req.params.type)) {
				const type = +req.params.type

				if (equals<ProjectType>(type)) {
					res.json(await api.getStarterCode(type))

					return
				}
			}

			res.json(null)
		}
	)

	starterCodeRouter.post(
		'/starterCode/:type',
		async (
			req: ApiRequest,
			res: Response
		) => {
			if (req.account.isAdmin && isIntStr(req.params.type)) {
				if (equals<Bodies.StarterCode>(req.body)) {
					const type = +req.params.type

					if (equals<ProjectType>(type)) {
						res.json(await api.setStarterCode(
							type,
							req.body.code
						))

						return
					}
				}
			}

			res.json(null)
		}
	)

	return starterCodeRouter
}

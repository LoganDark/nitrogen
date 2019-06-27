import * as express  from 'express'
import {Response}    from 'express'
import {HexazineApi} from '../../../lib/api'
import {ApiRequest}  from '../../../types/hexazine'

export = async function(
	router: express.Router,
	api: HexazineApi
): Promise<express.Router> {
	const adminRouter = express.Router()

	adminRouter.post(
		'/accounts/delete/:username',
		async (
			req: ApiRequest,
			res: Response
		) => {
			if (req.account.isAdmin) {
				try {
					res.json(await api.deleteAccount(req.params.id))
				} catch {}
			}

			res.json(false)
		}
	)

	adminRouter.get(
		'/accounts/isAdmin',
		async (
			req: ApiRequest,
			res: Response
		) => {
			res.json(req.account.isAdmin)
		}
	)

	adminRouter.get(
		'/accounts',
		async (
			req: ApiRequest,
			res: Response
		) => {
			if (req.account.isAdmin) {
				try {
					res.json(await api.getAccounts())
				} catch {
					res.json(null)
				}
			} else {
				res.json(null)
			}
		}
	)

	adminRouter.get(
		'/accounts/admin/:id',
		async (
			req: ApiRequest,
			res: Response
		) => {
			if (req.account.isAdmin) {
				try {
					res.json(await api.getAccount(req.params.id))
				} catch {
					res.json(null)
				}
			} else {
				res.json(null)
			}
		}
	)

	adminRouter.post(
		'/accounts/admin/:username',
		async (
			req: ApiRequest,
			res: Response
		) => {
			/*if (req.account.isAdmin && equals<Account>(req.body)) {
				try {
					res.json(await api.setAccount(
						req.params.username,
						req.body
						// holy fuck I hope the client knows what it's doing
					))

					return
				} catch {}
			}*/

			res.json(false)
		}
	)

	return adminRouter
}

import * as express  from 'express'
import {Response}    from 'express'
import {equals}      from 'typescript-is'
import {HexazineApi} from '../../../lib/api'
import {isIntStr}    from '../../../lib/utils'
import {Bodies}      from '../../../types/bodies'
import {BugReport}   from '../../../types/database'
import {ApiRequest}  from '../../../types/hexazine'

export = async function(
	router: express.Router,
	api: HexazineApi
): Promise<express.Router> {
	const bugReportRouter = express.Router()

	bugReportRouter.post(
		'/bugReport',
		async (
			req: ApiRequest,
			res: Response
		) => {
			const body = req.body

			if (equals<Bodies.BugReport>(body)) {
				try {
					res.json(await api.submitBugReport(
						req.account.username,
						<BugReport> {
							account : req.account.id,
							title   : body.title,
							summary : body.summary,
							steps   : body.steps,
							comments: body.comments,
							read    : false
						}
					))
				} catch {
					res.json(false)
				}
			} else {
				res.json(false)
			}
		}
	)

	bugReportRouter.get(
		'/bugReports',
		async (
			req: ApiRequest,
			res: Response
		) => {
			if (req.account.isAdmin) {
				try {
					res.json(await api.getBugReports())
				} catch {
					res.json(null)
				}
			}
		}
	)

	bugReportRouter.post(
		'/bugReports/:id',
		async (
			req: ApiRequest,
			res: Response
		) => {
			if (req.account.isAdmin && isIntStr(req.params.id) &&
			    equals<BugReport>(req.body)) {
				try {
					res.json(await api.setBugReport(
						+req.params.id,
						req.body
					))
				} catch {
					res.json(false)
				}
			}
		}
	)

	return bugReportRouter
}

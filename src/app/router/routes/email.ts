import * as express  from 'express'
import {Response}    from 'express'
import {HexazineApi} from '../../../lib/api'
import {ApiRequest}  from '../../../types/hexazine'

export = async function(
	router: express.Router,
	api: HexazineApi
): Promise<express.Router> {
	const emailRouter = express.Router()

	emailRouter.get(
		'/verifyEmail/:code',
		async (
			req: ApiRequest,
			res: Response
		) => {
			if (req.params.code.length > 1) {
				try {
					const verifyCode = await api.tryUseEmailVerifyCodeString(
						req.params.code)

					// @formatter:off
					res.end(
						`Thank you ${api.uFromId(verifyCode.account)}, your email has been changed to ${verifyCode.email}`,
						'utf8'
					)
					// @formatter:on
				} catch (e) {
					res.end(
						'Sorry, this code is invalid or has expired. Remember, email verification codes expire after 24 hours.',
						'utf8'
					)
				}
			}
		}
	)

	emailRouter.get(
		'/revertEmail/:code',
		async (
			req: ApiRequest,
			res: Response
		) => {
			if (req.params.code.length > 1) {
				try {
					const verifyCode = await api.tryUseEmailRevertCodeString(
						req.params.code)

					// @formatter:off
					res.end(
						`Thank you ${api.uFromId(verifyCode.account)}, your email has been changed back to ${verifyCode.email}`,
						'utf8'
					)
					// @formatter:on
				} catch {
					res.end(
						'Sorry, this code is invalid or has expired. Remember, email reversion codes expire after 24 hours.',
						'utf8'
					)
				}
			}
		}
	)

	return emailRouter
}

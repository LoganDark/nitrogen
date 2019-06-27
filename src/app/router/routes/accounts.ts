import * as express      from 'express'
import {Response}        from 'express'
import {equals}          from 'typescript-is'
import {HexazineApi}     from '../../../lib/api'
import {makeDebug}       from '../../../lib/logger'
import {Bodies}          from '../../../types/bodies'
import {ApiRequest}      from '../../../types/hexazine'
import {passwordPattern} from '../../../types/shared-vars'

const debug = makeDebug('routes:accounts', 3)

export = async function(
	router: express.Router,
	api: HexazineApi
): Promise<express.Router> {
	const accountsRouter = express.Router()

	accountsRouter.post(
		'/accounts/auth',
		async (
			req: ApiRequest,
			res: Response
		) => {
			const body = req.body

			if (equals<Bodies.Accounts.Auth>(body)) {
				try {
					res.json(await api.authenticate(
						body.username,
						body.password
					))
				} catch {
					res.json(null)
				}
			} else {
				res.json(null)
			}
		}
	)

	accountsRouter.get(
		'/accounts/check',
		async (
			req: ApiRequest,
			res: Response
		) => {
			// this is not in the noAuthRoutes list, so the authorization check
			// will automatically return null for us if the token's invalid

			res.json(true)
		}
	)

	accountsRouter.post(
		'/accounts/new',
		async (
			req: ApiRequest,
			res: Response
		) => {
			const body = req.body

			if (equals<Bodies.Accounts.New>(body) &&
			    passwordPattern.test(body.password)) {
				try {
					const account = await api.createAccount(
						body.username,
						body.password
					)

					res.json(await api.token(account.id))
				} catch {
					res.json(null)
				}
			} else {
				res.json(null)
			}
		}
	)

	accountsRouter.post(
		'/accounts/logout',
		async (
			req: ApiRequest,
			res: Response
		) => {
			try {
				res.json(await api.logoutAccount(req.account.username))
			} catch {
				res.json(false)
			}
		}
	)

	accountsRouter.post(
		'/accounts/delete',
		async (
			req: ApiRequest,
			res: Response
		) => {
			const body = req.body

			if (equals<Bodies.Accounts.Delete>(body)) {
				try {
					await api.validateCredentials(
						req.account.username,
						body.password
					)

					res.json(await api.deleteAccount(req.account.username))
				} catch {}
			}

			res.json(false)
		}
	)

	accountsRouter.post(
		'/accounts/changePassword',
		async (
			req: ApiRequest,
			res: Response
		) => {
			if (equals<Bodies.Accounts.ChangePassword>(req.body) &&
			    passwordPattern.test(req.body.password)) {
				api.getOwner(<string> req.headers.token).then(
					(
						accountId: string
					) => {
						const json = res.json.bind(res)

						api.changePassword(
							accountId,
							req.body.oldPassword,
							req.body.password
						).then(json).catch(json)
					}
				).catch(
					() => res.json(false)
				)
			} else {
				res.json(false)
			}
		}
	)

	accountsRouter.post(
		'/accounts/changeUsername',
		async (
			req: ApiRequest,
			res: Response
		) => {
			if (equals<Bodies.Accounts.ChangeUsername>(req.body)) {
				try {
					res.json(await api.changeUsername(
						req.account.username,
						req.body.username,
						req.body.password
					))

					return
				} catch {}
			}

			res.json(false)
		}
	)

	accountsRouter.post(
		'/accounts/checkPassword',
		async (
			req: ApiRequest,
			res: Response
		) => {
			if (equals<Bodies.Accounts.CheckPassword>(req.body)) {
				try {
					res.json(await api.validateCredentials(
						req.account.username,
						req.body.password
					))

					return
				} catch {}
			}

			res.json(null)
		}
	)

	accountsRouter.post(
		'/accounts/email',
		async (
			req: ApiRequest,
			res: Response
		) => {
			if (equals<Bodies.Accounts.Email>(req.body)) {
				try {
					res.json(!!await api.verifyEmail(
						req.account.id,
						req.body.email
					))

					return
				} catch (e) {
					debug('email verification error: %o', e)
				}
			}

			res.json(false)
		}
	)

	accountsRouter.get(
		'/accounts/email',
		async (
			req: ApiRequest,
			res: Response
		) => {
			try {
				res.json(await api.emailStatus(req.account.id))
			} catch {
				res.json(null)
			}
		}
	)

	accountsRouter.post(
		'/accounts/email/revokeVerification',
		async (
			req: ApiRequest,
			res: Response
		) => {
			if (equals<{}>(req.body)) {
				await api.tryRevokeEmailVerificationForAccount(req.account)

				res.json(true)

				return
			}

			res.json(false)
		}
	)

	accountsRouter.get(
		'/accounts/settings',
		async (
			req: ApiRequest,
			res: Response
		) => {
			try {
				res.json(await api.getSettings(req.account.id))
			} catch {
				res.json(null)
			}
		}
	)

	accountsRouter.post(
		'/accounts/settings',
		async (
			req: ApiRequest,
			res: Response
		) => {
			if (equals<Bodies.Accounts.Settings>(req.body)) {
				try {
					res.json(await api.setSettings(
						req.account.id,
						req.body.settings
					))

					return
				} catch {}
			}

			res.json(false)
		}
	)

	accountsRouter.post(
		'/accounts/settings/reset',
		async (
			req: ApiRequest,
			res: Response
		) => {
			try {
				res.json(await api.resetSettings(req.account.id))
			} catch {
				res.json(false)
			}
		}
	)

	return accountsRouter
}

import * as express       from 'express'
import {Request}          from 'express'
import {Account, ApiData} from './database'

export type Upgrades = ((data: ApiData) => Promise<void>)[]

export interface HexazineConfig {
	/**
	 * The port the server runs on. If this is zero, port 80 will be used for
	 * HTTP.
	 *
	 * If HTTPS is enabled and this is nonzero, it will use 443. Else, it will
	 * run a proxy server on `port`, and `port + 1` and `port + 2` will be the
	 * real servers.
	 *
	 * Those two extra servers will run on localhost, but `port` will be
	 * available to other systems on your network (and the outside world if you
	 * use a dedicated IP or port forwarding).
	 */
	port: number

	/**
	 * GitHub secret. **Leave this blank** if you're not going to use a GitHub
	 * webhook to auto-update Nitrogen when a new commit is pushed.
	 */
	secret: string

	/**
	 * The branch to trigger the auto-update. The update script pulls from the
	 * upstream branches of the repositories Hexazine is located inside, but
	 * only triggers on webhooks representing pushes to this particular branch.
	 */
	branch: string

	/**
	 * A host to reverse proxy to. Basically tells the app to use a URL for the
	 * Nitrogen frontend rather than serving it from the app directory.
	 * Mostly for development.
	 */
	reverse_proxy: string

	/**
	 * API base. For example, https://app.nitrogenedit.com/api/
	 *
	 * Leading slash is required, as routes will be appended directly to it.
	 */
	api_base: string

	/**
	 * Host header required for regular Nitrogen.
	 *
	 * **If this is set incorrectly, Nitrogen will never be exposed, and Custom
	 * Domains will always be triggered**
	 */
	host: string

	/**
	 * Mailgun private key for sending emails.
	 */
	mailgun_private_key: string

	/**
	 * Mailgun publishable key for validating email addresses.
	 */
	mailgun_public_key: string

	/**
	 * Domain to send emails from using Mailgun. This should be a *verified*
	 * domain.
	 */
	mailgun_domain: string

	/**
	 * Stripe publishable key. For payments support.
	 */
	stripe_pk: string

	/**
	 * Stripe secret key. For payments support.
	 */
	stripe_sk: string

	/**
	 * The ID (i.e. "plan_XXXXXXXXXXXXXX") for the plan to use for custom
	 * domains.
	 */
	stripe_custom_domain_plan: string
}

export type MailgunEmailTemplate =
	'email_added'
	| 'email_changed'
	| 'email_removed'
	| 'email_verification'
	| 'email_reverted'
	| 'password_changed'
	| 'password_reset'

export interface ApiRequest extends Request {
	account?: Account,
	rawBody?: string
}
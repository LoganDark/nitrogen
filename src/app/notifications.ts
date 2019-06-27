import * as requestPromise    from 'request-promise-native'
import {Account}              from '../types/database'
import {MailgunEmailTemplate} from '../types/hexazine'

let config: {apiKey: string, publicApiKey: string, domain: string, apiBase: string}

export class HexazineNotifications {
	constructor(apiKey: string, publicApiKey: string, domain: string) {
		config = {
			apiKey      : apiKey,
			publicApiKey: publicApiKey,
			domain      : domain,
			apiBase     : 'https://api.mailgun.net/v3'
		}
	}

	async api(
		method: string,
		path: string,
		body: string,
		data: object,
		headers: object
	) {
		return await requestPromise({
			method             : method,
			url                : config.apiBase + path,
			body               : body,
			formData           : data,
			headers            : headers,
			removeRefererHeader: true,
			auth               : {
				username: 'api',
				password: config.apiKey
			}
		})
	}

	async sendEmail(
		email: string,
		account: Account,
		templateName: MailgunEmailTemplate,
		subject: string,
		variables: object
	) {
		variables['account'] = {
			username: account.username,
			isAdmin : account.isAdmin,
			data    : account.data
		}

		const data = {
			from                   : `Nitrogen <nitrogen@${config.domain}>`,
			to                     : email,
			subject                : subject,
			template               : templateName,
			'h:X-Mailgun-Variables': JSON.stringify(variables),
			'o:tag'                : templateName
		}

		return await this.api(
			'POST', `/${config.domain}/messages`, '', data,
			{}
		)
	}

	async emailVerification(
		email: string,
		account: Account,
		verifyLink: string
	) {
		return await this.sendEmail(
			email,
			account,
			'email_verification',
			`${account.username}, verify your email address`,
			{verify_link: verifyLink}
		)
	}

	async emailAdded(account: Account, email: string) {
		return await this.sendEmail(
			email,
			account,
			'email_added',
			`${account.username}, you have successfully added your email`,
			{}
		)
	}

	async emailChanged(account: Account, oldEmail: string, revertLink: string) {
		return await this.sendEmail(
			account.data.email,
			account,
			'email_changed',
			`${account.username}, your email has been changed`,
			{
				old_email  : oldEmail,
				revert_link: revertLink
			}
		)
	}

	async emailReverted(account: Account, oldEmail: string) {
		return await this.sendEmail(
			oldEmail,
			account,
			'email_reverted',
			`${account.username}, your email has been reverted`,
			{old_email: oldEmail}
		)
	}
}

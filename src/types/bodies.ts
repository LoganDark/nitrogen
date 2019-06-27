import {AccountSettings, ProjectType} from './database'

export module Headers {
	export interface HasToken {
		token: string
	}

	export interface GitHub {
		'x-gitHub-event': string
		'x-gitHub-delivery': string
		'x-hub-signature': string
		'user-agent': string
	}
}

export module Bodies {
	export module Accounts {
		export interface HasPassword {
			password: string
		}

		/**
		 * used for censoring
		 */
		export interface HasOldPassword {
			oldPassword: string
		}

		export interface HasUsername {
			username: string
		}

		export type UsernamePassword = HasPassword & HasUsername

		/**
		 * /accounts/auth
		 */
		export type Auth = UsernamePassword

		/**
		 * /accounts/new
		 */
		export type New = UsernamePassword

		/**
		 * /accounts/delete
		 */
		export type Delete = HasPassword

		/**
		 * /accounts/changePassword
		 */
		export interface ChangePassword extends HasPassword {
			oldPassword: string
		}

		/**
		 * /accounts/changeUsername
		 */
		export type ChangeUsername = UsernamePassword

		/**
		 * /accounts/checkPassword
		 */
		export type CheckPassword = HasPassword

		/**
		 * /accounts/email
		 */
		export interface Email extends HasPassword {
			email: string
		}

		/**
		 * /accounts/settings
		 */
		export interface Settings {
			settings: AccountSettings
		}
	}

	export module Projects {
		/**
		 * /projects/new
		 */
		export interface New {
			name: string
			type: ProjectType
		}

		/**
		 * /projects/rename
		 */
		export interface Rename {
			name: string
		}

		/**
		 * /projects/import
		 */
		export interface Import {
			url: string
		}

		/**
		 * /projects/:id
		 */
		export interface UpdateCode {
			code: string
		}

		/**
		 * /projects/move/:id
		 */
		export interface Move {
			newPos: number
		}
	}

	/**
	 * /bugReport
	 */
	export interface BugReport {
		title: string
		summary: string
		steps: string
		comments: string
	}

	/**
	 * /starterCode/:type
	 */
	export interface StarterCode {
		code: string
	}
}

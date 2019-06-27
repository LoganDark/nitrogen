import IEditorConstructionOptions = monaco.editor.IEditorConstructionOptions

export interface AccountSettings {
	editor: IEditorConstructionOptions
}

export interface AccountData {
	email: string
	stripe_customer: string
	email_verify_code: string
	email_revert_codes: string[]
}

export interface Account {
	activeToken?: string
	id: string
	username: string
	password: string
	projects: string[]
	settings: AccountSettings
	data: AccountData
	isAdmin: boolean
}

/**
 * 0: HTML
 * 1: Markdown
 */
export type ProjectType = 0 | 1

export interface Project {
	account: string
	name: string
	code: string
	publishToken?: string
	type: ProjectType
	id: string
}

export interface PublishToken {
	project: string
}

export interface BugReport {
	account: string
	title: string
	summary: string
	steps: string
	comments: string
	read: boolean
}

export type EmailVerificationStatus = 'unset'
	| 'unverified'
	| 'verified'
	| 'pending_change'

export interface EmailStatus {
	verify_status: EmailVerificationStatus
	current_email: string
	pending_email: string
}

export interface EmailChangeCode {
	account: string
	email: string
	time: number
	code: string
}

export interface CustomDomainRoute {
	name: string
	children: CustomDomainRoute[]
}

export interface CustomDomainRootRoute extends CustomDomainRoute {
	name: ''
}

export interface CustomDomain {
	account: string
	root: CustomDomainRootRoute
}

export interface ApiData {
	version: number

	accounts: {[id: string]: Account}
	accountUsernames: {[username: string]: string}
	activeTokens: {[token: string]: string}

	projects: {[id: string]: Project}
	publishTokens: {[token: string]: PublishToken}

	starterCodes: string[]
	bugReports: BugReport[]

	emails: {[email: string]: string}
	emailVerifyCodes: {[verifyCode: string]: EmailChangeCode}
	emailRevertCodes: {[revertCode: string]: EmailChangeCode}

	customDomains: {[accountId: string]: CustomDomain}
	customDomainsLookup: {[domain: string]: string}
}


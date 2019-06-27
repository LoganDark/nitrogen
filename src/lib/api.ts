import * as crypto                     from 'crypto'
import {readFile, writeFile}           from 'fs-extra'
import {assertType}                    from 'typescript-is'
import * as uuid                       from 'uuid'
import {HexazineNotifications}         from '../app/notifications'
import {
	Account,
	AccountSettings,
	ApiData,
	BugReport,
	EmailChangeCode,
	EmailStatus,
	EmailVerificationStatus,
	Project,
	ProjectType,
	PublishToken
}                                      from '../types/database'
import {
	MinimalAccount,
	ProjectData
}                                      from '../types/datatypes'
import {HexazineConfig}                from '../types/hexazine'
import {
	DECRYPTION_CONFIRMATION_HEADER,
	usernamePattern
}                                      from '../types/shared-vars'
import {dataLocation, starterSettings} from '../types/vars'
import {makeDebug}                     from './logger'
import {upgradeData}                   from './upgrade'

const debug = makeDebug('api', 4)

const hashFunctions: {
	[version: string]: (
		account: Account,
		password: string
	) => string
} = {
	v1: function(
		account: Account,
		password: string
	): string {
		debug(
			'calculating v1 hash for %o',
			account.username
		)

		return crypto.createHash('sha256').update(
			password,
			'utf8'
		).digest('hex')
	},

	v2: function(
		account: Account,
		password: string
	): string {
		debug(
			'calculating v2 hash for %o',
			account.username
		)

		return crypto.createHmac(
			'sha256',
			password
		).update(
			password,
			'utf8'
		).digest('hex')
	},

	v3: function(
		account: Account,
		password: string
	): string {
		debug(
			'calculating v3 hash for %o',
			account.username
		)

		return crypto.createHmac(
			'sha256',
			account.username
		).update(
			password,
			'utf8'
		).digest('hex')
	}
}

const currentHashVersion = 'v3'

export class HexazineApi {
	private apiBase = ''
	private notifications: HexazineNotifications
	private data: ApiData

	constructor(
		public config: HexazineConfig
	) {}

	async init() {
		debug('initializing')

		const apiData = await this.getData()

		await upgradeData(apiData)
		await this.saveData(apiData)

		this.data = apiData
	}

	initNotifications(
		apiKey: string,
		publicApiKey: string,
		domain: string,
		apiBase: string
	) {
		this.notifications =
			new HexazineNotifications(apiKey, publicApiKey, domain)

		this.apiBase = apiBase
	}

	async getData(): Promise<ApiData> {
		debug('loading data')

		try {
			const parsed = JSON.parse(await readFile(dataLocation, 'utf8'))

			debug('no error in loading data')

			return parsed
		} catch (e) {
			debug('error in loading data: %O', e)

			throw e
		}
	}

	async saveData(data?: ApiData): Promise<boolean> {
		debug('saving data')

		try {
			await writeFile(
				dataLocation,
				JSON.stringify(
					data || this.data,
					undefined,
					'\t'
				)
			)
		} catch (e) {
			debug(
				'error in saving data: %O',
				e
			)

			throw false
		}

		debug('no error in saving data')

		return true
	}

	validateToken(
		token: string
	): Promise<boolean> {
		return new Promise((
			accept,
			reject
			) => {
				debug(
					'validating token'
				)

				if (this.data.activeTokens.hasOwnProperty(token)) {
					debug(
						'token belongs to %o',
						this.data.activeTokens[token]
					)

					accept(true)
				} else {
					debug('inactive or fake token')
					reject(false)
				}
			}
		)
	}

	async createAccount(
		username: string,
		password: string,
		makeAdmin = false
	): Promise<Account> {
		debug('creating account %o', username)

		if (this.data.accountUsernames[username]) {
			throw false
		}

		if (usernamePattern.test(username)) {
			const id = uuid.v4()

			const account = {
				id      : id,
				username: username,
				password: '',
				projects: [],
				settings: starterSettings,
				isAdmin : makeAdmin,
				data    : {
					email             : '',
					stripe_customer   : '',
					email_verify_code : '',
					email_revert_codes: []
				}
			}

			this.data.accounts[id] = account
			this.data.accountUsernames[username] = id

			account.password = currentHashVersion + '!' +
			                   hashFunctions[currentHashVersion](
				                   account,
				                   password
			                   )

			await this.saveData()

			return account
		} else {
			debug(
				'username %o is too exotic',
				username
			)

			throw false
		}
	}

	token(accountId: string): Promise<string> {
		return new Promise<string>((
			accept,
			reject
			) => {
				debug(
					'creating token for %o',
					accountId
				)

				this.getAccount(accountId).then(
					(account: Account) => {
						if (account.activeToken) {
							debug('token already exists')
							accept(account.activeToken)
						} else {
							debug('generating token')
							const token = uuid.v4()

							debug('activating token')
							account.activeToken = token
							this.data.activeTokens[token] = accountId

							this.saveData().then(
								() => accept(token)
							).catch(
								() => reject(null)
							)
						}
					}
				).catch(
					() => reject(null)
				)
			}
		)
	}

	validateCredentials(
		username: string,
		password: string
	): Promise<boolean> {
		return new Promise<boolean>(
			(
				accept,
				reject
			) => {
				debug(
					'validating credentials for %o',
					username
				)

				this.getAccountByUsername(username).then(
					(account: Account) => {
						const hashed = account.password.split('!')
						let algorithm = 'v1'

						if (hashed.length !== 1) { // length === 1 means v1, before hashes were versioned
							debug('account is using v1 hash')

							algorithm = hashed[0]
						}

						if (hashFunctions[algorithm](
							account,
							password
						) === hashed[hashed.length - 1]) {
							debug('credentials are valid')

							this.upgradeHash(
								account.id,
								password
							).then(
								accept
							).catch(
								reject
							)
						} else {
							debug('credentials are invalid')

							reject(false)
						}
					}
				).catch(
					() => reject(false)
				)
			}
		)
	}

	authenticate(
		username: string,
		password: string
	): Promise<string> {
		return new Promise<string>(
			(
				accept,
				reject
			) => {
				debug(
					'authenticating %o',
					username
				)

				this.validateCredentials(
					username,
					password
				).then(
					() => {
						this.getAccountByUsername(username).then(
							(account: Account) => {
								let token: string

								if (account.activeToken) {
									debug('account has active token')

									token = account.activeToken
								} else {
									debug('account has no token')
								}

								if (token) {
									accept(token)
								} else {
									this.token(account.id).then(
										accept
									).catch(
										reject
									)
								}
							}
						).catch(
							reject
						)
					}
				).catch(
					() => reject(null)
				)
			}
		)
	}

	logoutAccount(
		username: string
	): Promise<boolean> {
		return new Promise<boolean>(
			(
				accept,
				reject
			) => {
				debug(
					'logging out %o',
					username
				)

				this.getAccountByUsername(username).then(
					(account: Account) => {
						if (!account.activeToken) {
							debug('account has no active token')

							accept(true)
						} else {
							debug('deactivating token')

							delete this.data.activeTokens[account.activeToken]
							delete account.activeToken

							this.saveData().then(
								accept
							).catch(
								reject
							)
						}
					}
				).catch(
					reject
				)
			}
		)
	}

	getProjects(accountId: string): Promise<Project[]> {
		return new Promise((
			accept,
			reject
			) => {
				debug(
					'getting projects for %o',
					accountId
				)

				this.getAccount(accountId).then(
					(account: Account) => {
						accept(
							account.projects
								.map(id => this.data.projects[id])
								.map(project => {
									return {
										account     : project.account,
										name        : project.name,
										code        : '',
										publishToken: project.publishToken,
										type        : project.type,
										id          : project.id
									}
								})
						)
					}
				).catch(
					() => reject(null)
				)
			}
		)
	}

	async getProjectData(projectId: string): Promise<ProjectData> {
		const project = this.data.projects[projectId]

		assertType<Project>(project)

		const obj: ProjectData = {
			name: project.name,
			id  : project.id
		}

		if (project.publishToken) {
			obj.publishToken = project.publishToken
		}

		return obj
	}

	async getProjectsData(accountId: string): Promise<ProjectData[]> {
		const account = await this.getAccount(accountId)

		assertType<Account>(account)

		return await Promise.all(
			account.projects.map(id => this.getProjectData(id))
		)
	}

	getOwner(
		token: string
	): Promise<string> {
		return new Promise((
			accept,
			reject
			) => {
				debug('getting owner of token')

				this.validateToken(token).then(
					() => {
						accept(this.data.activeTokens[token])
					}
				).catch(
					() => reject(null)
				)
			}
		)
	}

	newProject(
		accountId: string,
		name: string,
		type: ProjectType,
		code?: string
	): Promise<boolean> {
		return new Promise((
			accept,
			reject
			) => {
				debug(
					'creating new project for %o with name %o',
					accountId,
					name
				)

				this.getAccount(accountId).then(
					(account: Account) => {
						const projectId = uuid.v4()

						this.data.projects[projectId] = {
							name   : name,
							type   : type,
							code   : DECRYPTION_CONFIRMATION_HEADER +
							         (code || this.data.starterCodes[type]),
							account: accountId,
							id     : projectId
						}

						account.projects.push(projectId)

						this.saveData().then(
							accept
						).catch(
							reject
						)
					}
				).catch(
					reject
				)
			}
		)
	}

	renameProject(
		accountId: string,
		id: string,
		name: string
	): Promise<boolean> {
		return new Promise((
			accept,
			reject
			) => {
				debug(
					'renaming project with id %o to %o for %o',
					id,
					name,
					accountId
				)

				this.getAccount(accountId).then(
					(account: Account) => {
						if (account.projects.indexOf(id) > -1) {
							this.data.projects[id].name = name

							this.saveData().then(
								accept
							).catch(
								reject
							)
						} else {
							debug(
								'invalid project id %d',
								id
							)

							reject(false)
						}
					}
				).catch(
					reject
				)
			}
		)
	}

	deleteProject(
		accountId: string,
		id: string
	): Promise<boolean> {
		return new Promise((
			accept,
			reject
			) => {
				debug(
					'deleting project %o for %o',
					id,
					accountId
				)

				this.getAccount(accountId).then(
					(account: Account) => {
						if (account.projects.indexOf(id) > -1) {
							const project = this.data.projects[id]

							if (project.hasOwnProperty('publishToken')) {
								delete this.data.publishTokens[project.publishToken]
							}

							account.projects.splice(account.projects.indexOf(id), 1)
							delete this.data.projects[id]

							this.saveData().then(
								accept
							).catch(
								reject
							)
						} else {
							debug(
								'invalid project id %o',
								id
							)

							reject(false)
						}
					}
				).catch(
					reject
				)
			}
		)
	}

	moveProject(
		accountId: string,
		id: string,
		newPos: number
	): Promise<boolean> {
		return new Promise((
			accept,
			reject
			) => {
				debug(
					'moving project %d to %d for %o',
					id, newPos,
					accountId
				)

				this.getAccount(accountId).then(
					(account: Account) => {
						if (newPos < account.projects.length) {
							const index = account.projects.indexOf(id)

							account.projects.splice(index, 1)
							account.projects.splice(newPos, 0, id)

							this.saveData().then(
								accept
							).catch(
								reject
							)
						} else {
							debug(
								'moving to an invalid project pos %d',
								newPos
							)

							reject(false)
						}
					}
				).catch(
					reject
				)
			}
		)
	}

	getProject(
		accountId: string,
		id: string
	): Promise<Project> {
		return new Promise((
			accept,
			reject
			) => {
				debug(
					'getting project %o for %o',
					id,
					accountId
				)

				this.getAccount(accountId).then(
					(account: Account) => {
						if (account.projects.indexOf(id) > -1) {
							accept(this.data.projects[id])
						} else {
							debug(
								'invalid project id %o',
								id
							)

							reject(null)
						}
					}
				).catch(
					() => reject(null)
				)
			}
		)
	}

	setProjectCode(
		accountId: string,
		id: string,
		code: string
	): Promise<boolean> {
		return new Promise((
			accept,
			reject
			) => {
				debug(
					'setting project %d code for %o',
					id,
					accountId
				)

				this.getAccount(accountId).then(
					(account: Account) => {
						if (account.projects.indexOf(id) > -1) {
							this.data.projects[id].code = code

							this.saveData().then(
								accept
							).catch(
								reject
							)
						} else {
							debug(
								'invalid project id %d',
								id
							)

							reject(false)
						}
					}
				).catch(
					reject
				)
			}
		)
	}

	getSettings(
		accountId: string
	): Promise<AccountSettings> {
		return new Promise((
			accept,
			reject
			) => {
				debug(
					'getting settings for %o',
					accountId
				)

				this.getAccount(accountId).then(
					(account: Account) => {
						accept(account.settings)
					}
				).catch(
					() => reject(null)
				)
			}
		)
	}

	setSettings(
		accountId: string,
		options: AccountSettings
	): Promise<boolean> {
		return new Promise((
			accept,
			reject
			) => {
				debug(
					'setting editor options for %o',
					accountId
				)

				this.getAccount(accountId).then(
					(account: Account) => {
						account.settings = options

						this.saveData().then(
							accept
						).catch(
							reject
						)
					}
				).catch(
					reject
				)
			}
		)
	}

	submitBugReport(
		accountId: string,
		bugReport: BugReport
	): Promise<boolean> {
		return new Promise((
			accept,
			reject
			) => {
				debug(
					'submitting bug report for %o',
					accountId
				)

				this.data.bugReports.push(bugReport)

				this.saveData().then(
					accept
				).catch(
					reject
				)
			}
		)
	}

	deleteAccount(
		accountId: string
	): Promise<boolean> {
		return new Promise((
			accept,
			reject
			) => {
				debug(
					'deleting account of %o',
					accountId
				)

				this.getAccount(accountId).then(
					(account: Account) => {
						debug('removing account from list')
						delete this.data.accounts[accountId]

						debug('wiping active token')
						if (account.hasOwnProperty('activeToken')) {
							delete this.data.activeTokens[account.activeToken]
						}

						debug('wiping projects')
						account.projects.forEach((id: string) => {
								const project = this.data.projects[id]

								if (project.hasOwnProperty('publishToken')) {
									delete this.data.publishTokens[project.publishToken]
								}

								delete this.data.projects[id]
							}
						)

						this.saveData().then(
							accept
						).catch(
							reject
						)
					}
				).catch(
					() => reject(false)
				)
			}
		)
	}

	getPublished(
		publishToken: string
	): Promise<Project> {
		return new Promise((
			accept,
			reject
			) => {
				debug(
					'getting published project for %o',
					publishToken
				)

				if (this.data.publishTokens.hasOwnProperty(publishToken)) {
					debug(
						'project at %o exists',
						publishToken
					)

					const token: PublishToken = this.data.publishTokens[publishToken]

					accept(this.data.projects[token.project])
				} else {
					debug(
						'project at %o does not exist',
						publishToken
					)

					reject(null)
				}
			}
		)
	}

	publish(
		accountId: string,
		id: string
	): Promise<string> {
		return new Promise((
			accept,
			reject
			) => {
				debug(
					'publishing project %d for %o',
					id,
					accountId
				)

				this.getAccount(accountId).then(
					(
						account: Account
					) => {
						if (account.projects.indexOf(id) > -1) {
							const project = this.data.projects[id]

							if (!project.publishToken) {
								debug('generating publish token')
								const publishToken = uuid.v4()

								debug('activating publish token')
								project.publishToken = publishToken
								this.data.publishTokens[publishToken] = {
									project: id
								}

								this.saveData().then(
									() => accept(publishToken)
								).catch(
									() => reject(null)
								)
							} else {
								debug('project already published')

								reject(null)
							}
						} else {
							debug(
								'invalid project id %d',
								id
							)

							reject(null)
						}
					}
				).catch(
					reject
				)
			}
		)
	}

	unpublish(
		accountId: string,
		id: string
	): Promise<boolean> {
		return new Promise((
			accept,
			reject
			) => {
				debug(
					'unpublishing project %o for %o',
					id,
					accountId
				)

				this.getAccount(accountId).then(
					(account: Account) => {
						if (account.projects.indexOf(id) > -1) {
							const project = this.data.projects[id]

							if (project.hasOwnProperty('publishToken')) {
								debug('deactivating publish token')

								delete this.data.publishTokens[project.publishToken]
								delete project.publishToken

								this.saveData().then(
									accept
								).catch(
									reject
								)
							} else {
								debug('project is not published')

								reject(false)
							}
						} else {
							debug(
								'invalid project id %d',
								id
							)

							reject(false)
						}
					}
				).catch(
					() => reject(false)
				)
			}
		)
	}

	resetSettings(
		accountId: string
	): Promise<boolean> {
		return new Promise((
			accept,
			reject
			) => {
				debug(
					'resetting editor options for %o',
					accountId
				)

				this.getAccount(accountId).then(
					(account: Account) => {
						account.settings = starterSettings

						this.saveData().then(
							accept
						).catch(
							reject
						)
					}
				).catch(
					() => reject(false)
				)
			}
		)
	}

	upgradeHash(
		id: string,
		password: string
	): Promise<boolean> {
		return new Promise(
			(
				accept,
				reject
			) => {
				debug(
					'upgrading hash for account id %o',
					id
				)

				this.getAccount(id).then(
					(account: Account) => {
						account.password =
							currentHashVersion + '!' +
							hashFunctions[currentHashVersion](account, password)
						this.saveData().then(
							accept
						).catch(
							reject
						)
					}
				).catch(
					() => reject(false)
				)
			}
		)
	}

	changePassword(
		accountId: string,
		oldPassword: string,
		newPassword: string
	): Promise<boolean> {
		return new Promise(
			(
				accept,
				reject
			) => {
				debug(
					'changing password for %o',
					accountId
				)

				this.getAccount(
					accountId
				).then(
					(
						account: Account
					) => {
						this.validateCredentials(
							account.username,
							oldPassword
						).then(
							() => {
								account.password =
									currentHashVersion + '!' +
									hashFunctions[currentHashVersion](
										account,
										newPassword
									)

								this.saveData().then(
									accept
								).catch(
									() => reject(false)
								)
							}
						).catch(
							reject
						)
					}
				).catch(
					() => reject(false)
				)
			}
		)
	}

	async changeUsername(
		oldUsername: string,
		newUsername: string,
		password: string
	): Promise<boolean> {
		debug(
			'changing username of %o to %o',
			oldUsername,
			newUsername
		)

		if (!this.data.accounts.hasOwnProperty(newUsername) &&
		    usernamePattern.test(newUsername)) {
			await this.validateCredentials(oldUsername, password)
			const account = await this.getAccountByUsername(oldUsername)

			debug('setting username')
			account.username = newUsername
			account.password = currentHashVersion + '!' +
			                   hashFunctions[currentHashVersion](
				                   account,
				                   password
			                   )

			debug('migrating account to new username')
			delete this.data.accountUsernames[oldUsername]
			this.data.accountUsernames[newUsername] = account.id

			await this.saveData()

			return true
		} else {
			throw false
		}
	}

	isAdmin(
		username: string
	): Promise<boolean> {
		return new Promise<boolean>(
			(
				accept,
				reject
			) => {
				debug(
					'checking if %o is admin',
					username
				)

				this.getAccountByUsername(username).then(
					(account: Account) => {
						accept(account.isAdmin)
					}
				).catch(
					() => reject(false)
				)
			}
		)
	}

	getAccounts(): Promise<MinimalAccount[]> {
		return new Promise<MinimalAccount[]>(
			accept => {
				debug('getting accounts')

				accept(Object.keys(this.data.accounts).map(
					(id: string) => {
						return {
							username: this.data.accounts[id].username,
							id      : id,
							isAdmin : this.data.accounts[id].isAdmin
						}
					}
				))
			}
		)
	}

	async getAccount(
		id: string
	): Promise<Account> {
		debug(
			'getting account id %o',
			id
		)

		if (this.data.accounts.hasOwnProperty(id)) {
			debug('account exists')

			return this.data.accounts[id]
		} else {
			debug('account does not exist')

			throw null
		}
	}

	async getAccountByUsername(username: string) {
		debug('getting account by username %o', username)

		return await this.getAccount(this.data.accountUsernames[username])
	}

	/*setAccount(
		username: string,
		account: Account
	): Promise<boolean> {
		return new Promise<boolean>(
			(
				accept,
				reject
			) => {
				debug(
					'setting data of account %o to %O',
					username,
					account
				)

				if (this.data.accounts.hasOwnProperty(username)) {
					debug('account exists')

					this.data.accounts[username] = account

					this.saveData().then(
						accept
					).catch(
						reject
					)
				} else {
					debug('account exists')

					reject(false)
				}
			}
		)
	}*/

	getBugReports(): Promise<BugReport[]> {
		return new Promise<BugReport[]>(
			accept => {
				debug('getting bug reports')

				accept(this.data.bugReports)
			}
		)
	}

	setBugReport(
		id: number,
		bugReport: BugReport
	): Promise<boolean> {
		return new Promise<boolean>(
			(
				accept,
				reject
			) => {
				debug(
					'setting bug report %d to %O',
					id,
					bugReport
				)

				this.data.bugReports[id] = bugReport

				this.saveData().then(
					accept
				).catch(
					reject
				)
			}
		)
	}

	getStarterCode(type: number): Promise<string> {
		return new Promise<string>(
			(accept) => accept(this.data.starterCodes[type])
		)
	}

	setStarterCode(
		type: number,
		code: string
	): Promise<boolean> {
		return new Promise<boolean>(
			(
				accept,
				reject
			) => {
				this.data.starterCodes[type] = code

				this.saveData().then(
					accept
				).catch(
					reject
				)
			}
		)
	}

	async generateEmailChangeCode(
		account: Account,
		email: string
	): Promise<{code: string, obj: EmailChangeCode}> {
		debug('generating email change code for %o', account.username)

		const newCode = uuid.v4()

		debug('new code is %o', newCode)

		return {
			code: newCode,
			obj : {
				account: account.id,
				email  : email,
				time   : +new Date(),
				code   : newCode
			}
		}
	}

	async verifyEmail(accountId: string, email: string) {
		debug('verifying email %o for %o', email, accountId)

		const account = await this.getAccount(accountId)

		if (email === account.data.email) {
			return false
		}

		const gen = await this.generateEmailChangeCode(account, email)

		try {
			await this.notifications.emailVerification(
				email,
				account,
				`${this.apiBase}verifyEmail/${gen.code}`
			)
		} catch (e) {
			return false
		}

		debug('applying to account')

		this.data.emailVerifyCodes[gen.code] = gen.obj
		account.data.email_verify_code = gen.code

		await this.saveData()

		return true
	}

	async emailVerifyStatus(accountId: string): Promise<EmailVerificationStatus> {
		debug('checking email verification status for %o', accountId)

		const accData = (await this.getAccount(accountId)).data

		if (accData.email_verify_code) {
			debug('account has email verify code')

			const emailVerifyCode = this.data.emailVerifyCodes[accData.email_verify_code]

			if (!await this.validateChangeCode(emailVerifyCode)) {
				await this.invalidateEmailVerifyCode(emailVerifyCode)
			}
		}

		let status: EmailVerificationStatus

		if (accData.email === '') {
			status = accData.email_verify_code === ''
			         ? 'unset'
			         : 'unverified'
		} else {
			status = accData.email_verify_code === ''
			         ? 'verified'
			         : 'pending_change'
		}

		debug('verification status is %o', status)

		return status
	}

	async emailStatus(accountId: string): Promise<EmailStatus> {
		debug('getting email status for %o', accountId)

		const account = await this.getAccount(accountId)
		const verifyStatus = await this.emailVerifyStatus(accountId)
		const toReturn: EmailStatus = {
			verify_status: verifyStatus,
			current_email: account.data.email,
			pending_email: ''
		}

		if (account.data.email_verify_code) {
			const code = this.data.emailVerifyCodes[account.data.email_verify_code]

			debug(
				'account has email verify code %o',
				account.data.email_verify_code
			)

			if (await this.validateChangeCode(code)) {
				toReturn.pending_email = code.email
			} else {
				await this.invalidateEmailVerifyCode(code)
			}
		}

		return toReturn
	}

	async onEmailChanged(account: Account, oldEmail: string) {
		debug('generating email change notification for %o', account.username)

		const gen = await this.generateEmailChangeCode(account, oldEmail)

		try {
			await this.notifications.emailChanged(
				account, oldEmail,
				`${this.apiBase}api/revertEmail/${gen.code}`
			)
		} catch {}

		debug('applying revert code')

		this.data.emailRevertCodes[gen.code] = gen.obj
		account.data.email_revert_codes.push(gen.code)

		await this.saveData()
	}

	async validateChangeCode(
		changeCode: EmailChangeCode
	): Promise<boolean> {
		const valid = +new Date() - changeCode.time < 1000 * 60 * 60 * 24

		debug('code %o is valid? %o', changeCode.code, valid)

		return valid
	}

	async invalidateEmailVerifyCode(verifyCode: EmailChangeCode) {
		debug('invalidating email verify code %o', verifyCode.code)

		const account = await this.getAccount(verifyCode.account)

		delete this.data.emailVerifyCodes[verifyCode.code]
		account.data.email_verify_code = ''

		await this.saveData()

		return true
	}

	async processEmailChangeCode(
		changeCode: EmailChangeCode,
		notify = true
	): Promise<EmailChangeCode> {
		debug(
			'processing email change code %o for account %o',
			changeCode.code,
			changeCode.account
		)

		if (this.data.emails[changeCode.email]) {
			debug('...but email already exists')

			throw false
		}

		const account = await this.getAccount(changeCode.account)
		const oldEmail = account.data.email

		if (notify) {
			debug('notifying')

			if (oldEmail === '') {
				await this.notifications.emailAdded(account, changeCode.email)
			} else {
				await this.onEmailChanged(account, oldEmail)
			}
		}

		debug('setting email')

		delete this.data.emails[oldEmail]
		account.data.email = changeCode.email
		this.data.emails[changeCode.email] = account.id

		await this.saveData()

		return changeCode
	}

	async invalidateEmailRevertCodesBefore(
		revertCode: EmailChangeCode,
		save = true
	): Promise<EmailChangeCode> {
		debug(
			'invalidating revert code %o for account %o',
			revertCode.code,
			revertCode.account
		)

		const account = await this.getAccount(revertCode.account)
		const revCodes = account.data.email_revert_codes
		const index = revCodes.indexOf(revertCode.code)
		const length = revCodes.length

		if (index === 0) {
			delete this.data.emailRevertCodes[revertCode.code]

			for (let i = 1; i < length; i++) {
				revCodes[i - 1] = revCodes[i]
			}

			delete revCodes[length - 1]
		} else {
			for (let i = 0; i <= index; i++) {
				const subRevertCode = this.data.emailRevertCodes[revCodes[0]]

				await this.invalidateEmailRevertCodesBefore(
					subRevertCode, false)
			}
		}

		if (save) {
			await this.saveData()
		}

		return revertCode
	}

	async invalidateEmailRevertCodesAfter(revertCode: EmailChangeCode) {
		debug(
			'invalidating used revert code %o for account %o',
			revertCode.code,
			revertCode.account
		)

		const account = await this.getAccount(revertCode.account)
		const revCodes = account.data.email_revert_codes
		const index = revCodes.indexOf(revertCode.code)
		const length = revCodes.length

		for (let i = index; i < length; i++) {
			delete this.data.emailRevertCodes[revCodes[i]]
			delete revCodes[i]
		}

		await this.saveData()

		return revertCode
	}

	async useEmailRevertCode(revertCode: EmailChangeCode): Promise<EmailChangeCode> {
		debug(
			'using email revert code %o for account id %o', revertCode.code,
			revertCode.account
		)

		const account = await this.getAccount(revertCode.account)
		const valid = await this.validateChangeCode(revertCode)

		if (!valid) {
			await this.invalidateEmailRevertCodesBefore(revertCode)

			throw valid
		}

		const oldEmail = account.data.email

		try {
			await this.processEmailChangeCode(
				revertCode,
				false
			)
		} catch (e) {
			throw false
		}

		await this.notifications.emailReverted(account, oldEmail)

		return revertCode
	}

	async tryUseEmailVerifyCodeString(code: string): Promise<EmailChangeCode> {
		debug('trying email verify code %o', code)

		const emailVerifyCode = this.data.emailVerifyCodes[code]

		const isValid = await this.validateChangeCode(emailVerifyCode)

		if (!isValid) {
			await this.invalidateEmailVerifyCode(emailVerifyCode)

			throw false
		}

		await this.processEmailChangeCode(emailVerifyCode)
		await this.invalidateEmailVerifyCode(emailVerifyCode)

		await this.saveData()

		return emailVerifyCode
	}

	async tryUseEmailRevertCodeString(code: string): Promise<EmailChangeCode> {
		debug('trying email revert code %o', code)

		const emailRevertCode = this.data.emailRevertCodes[code]

		const isValid = await this.validateChangeCode(emailRevertCode)

		if (!isValid) {
			await this.invalidateEmailRevertCodesBefore(emailRevertCode)

			throw false
		}

		await this.useEmailRevertCode(emailRevertCode)
		await this.invalidateEmailRevertCodesAfter(emailRevertCode)

		await this.saveData()

		return emailRevertCode
	}

	async tryRevokeEmailVerificationForAccount(account: Account) {
		await this.invalidateEmailVerifyCode(
			this.data.emailVerifyCodes[account.data.email_verify_code])
	}

	uFromId(accountId: string) {
		return this.data.accounts[accountId].username
	}
}

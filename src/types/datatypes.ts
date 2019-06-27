export interface MinimalAccount {
	username: string
	id: string
	isAdmin: boolean
}

export interface ProjectData {
	name: string
	id: string
	publishToken?: string
}

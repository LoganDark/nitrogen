import {Component, OnInit}                    from '@angular/core'
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {ActivatedRoute, Router}               from '@angular/router'
import {Account}                              from '../../../../../backend/src/types/database'
import {ApiService}                           from '../../../api.service'

@Component({
	selector   : 'app-admin-dashboard-user',
	templateUrl: './admin-dashboard-user.component.html',
	styleUrls  : ['./admin-dashboard-user.component.css']
})
export class AdminDashboardUserComponent implements OnInit {
	username: string = this.route.snapshot.paramMap.get('username')
	account: Account
	working = true

	constructor(
		private route: ActivatedRoute,
		private api: ApiService,
		private snackbar: MatSnackBar,
		private dialog: MatDialog,
		private router: Router
	) {}

	ngOnInit() {
		this.refresh()
	}

	refresh() {
		this.working = true
		this.account = null

		this.api.getAccount(
			this.username
		).subscribe(
			(account: Account) => {
				this.account = account
				this.working = false
			}
		)
	}

	getSettings() {
		return JSON.stringify(
			this.account.settings,
			undefined,
			'\t'
		)
	}

	saveChanges() {
		this.snackbar.open(
			'Saving is disabled due to security issues. Sorry'
		)
	}

	deleteAccount() {
		this.working = true

		this.dialog.open(UserDeleteAccountDialogComponent)
			.afterClosed().subscribe(
			(del: boolean) => {
				if (del) {
					this.api.deleteOtherAccount(this.username).subscribe(
						(success: boolean) => {
							if (!success) {
								this.snackbar.open(
									'The account could not be deleted.'
								)

								this.working = false
							} else {
								this.router.navigateByUrl('/admin/users')
							}
						}
					)
				} else {
					this.working = false
				}
			}
		)
	}
}

@Component({
	selector   : 'app-user-delete-account-dialog',
	templateUrl: './dialogs/user-delete-account-dialog.component.html'
})
export class UserDeleteAccountDialogComponent {
	constructor(
		public dialogRef: MatDialogRef<UserDeleteAccountDialogComponent>
	) {}
}
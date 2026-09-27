import type { BooleanInput } from '@angular/cdk/coercion';
import type { ComponentType } from '@angular/cdk/portal';
import { NgComponentOutlet } from '@angular/common';
import { booleanAttribute, ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideX } from '@ng-icons/lucide';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButton } from '@spartan-ng/helm/button';

import { classes } from '@spartan-ng/helm/utils';
import { HlmDialogClose } from './hlm-dialog-close';

type HlmDialogContentContext = {
	$component?: ComponentType<unknown>;
	$dynamicComponentClass?: string;
	$showCloseButton?: boolean;
	$closeLabel?: string;
};

@Component({
	selector: 'hlm-dialog-content',
	imports: [NgComponentOutlet, HlmButton, HlmDialogClose, NgIcon],
	providers: [provideIcons({ lucideX })],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: {
		'data-slot': 'dialog-content',
		'[attr.data-state]': 'state()',
	},
	template: `
		@if (component) {
			<ng-container [ngComponentOutlet]="component" />
		} @else {
			<ng-content />
		}

		@if (showCloseButton()) {
			<button hlmBtn variant="ghost" size="icon" class="absolute end-3 top-3" hlmDialogClose>
				<span class="sr-only">{{ closeLabel() }}</span>
				<ng-icon name="lucideX" class="text-xl" />
			</button>
		}
	`,
})
export class HlmDialogContent {
	private readonly _dialogRef = inject(BrnDialogRef);
	private readonly _dialogContext = injectBrnDialogContext<HlmDialogContentContext | null>({ optional: true });

	public readonly showCloseButton = input<boolean, BooleanInput>(this._dialogContext?.$showCloseButton ?? true, {
		transform: booleanAttribute,
	});
	public readonly closeLabel = input<string>(this._dialogContext?.$closeLabel ?? 'Fechar');

	public readonly state = computed(() => this._dialogRef?.state() ?? 'closed');

	public readonly component = this._dialogContext?.$component;
	private readonly _dynamicComponentClass = this._dialogContext?.$dynamicComponentClass;

	constructor() {
		// Uzusis: o painel do CDK encolhe ao conteúdo, então w-full/100% dava 304 px a 390; a largura vem do viewport.
		classes(() => ['bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 ring-foreground/10 grid max-w-none gap-6 rounded-xl p-6 text-sm ring-1 duration-100 sm:max-w-md relative mx-auto w-[calc(100vw-2rem)] outline-none sm:mx-0', this._dynamicComponentClass]);
	}
}

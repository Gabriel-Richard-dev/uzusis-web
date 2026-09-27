import { Directive } from '@angular/core';
import { BrnFieldControlDescribedBy } from '@spartan-ng/brain/field';
import { BrnTextarea } from '@spartan-ng/brain/textarea';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
	selector: '[hlmTextarea]',
	hostDirectives: [{ directive: BrnTextarea, inputs: ['id', 'forceInvalid'] }, BrnFieldControlDescribedBy],
	host: { 'data-slot': 'textarea' },
})
export class HlmTextarea {
	constructor() {
		classes(
			() =>
				'border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring data-[matches-spartan-invalid=true]:ring-destructive/20 dark:data-[matches-spartan-invalid=true]:ring-destructive/40 data-[matches-spartan-invalid=true]:border-destructive dark:data-[matches-spartan-invalid=true]:border-destructive/50 rounded-md border bg-card px-3 py-2 text-base shadow-xs transition-[color,box-shadow] focus-visible:ring-2 data-[matches-spartan-invalid=true]:ring-2 md:text-sm placeholder:text-muted-foreground flex field-sizing-content min-h-16 w-full outline-none disabled:cursor-not-allowed disabled:opacity-50',
		);
	}
}

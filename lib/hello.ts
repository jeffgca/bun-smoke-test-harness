export interface HelloOptions {
	[key: string]: string | number | boolean
}

export class Hello {
	options: HelloOptions

	constructor(options?: HelloOptions) {
		this.options = options || {}
	}

	greet(name: string): string {
		return `Hello ${name} from Bun!`
	}
}

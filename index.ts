import { Hello, type HelloOptions } from './lib/hello.js'
import packageJson from './package.json' with { type: 'json' }
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

const version =
	typeof packageJson.version === 'string' ? packageJson.version : '0.0.0'

yargs(hideBin(process.argv)).version(version).alias('v', 'version').parse()

const hello = new Hello({
	greeting: 'Hi',
} as HelloOptions)

console.log(hello.greet('Jeff'))

import { expect, test, describe } from 'bun:test'
import { Hello } from '../lib/hello'

describe('Hello', () => {
	test('should create an instance with default options', () => {
		const hello = new Hello()
		expect(hello).toBeInstanceOf(Hello)
		expect(hello.options).toEqual({})
	})

	test('should create an instance with provided options', () => {
		const options = { lang: 'en', verbose: true }
		const hello = new Hello(options)
		expect(hello.options).toEqual(options)
	})

	test('should greet with the provided name', () => {
		const hello = new Hello()
		const result = hello.greet('World')
		expect(result).toBe('Hello World from Bun!')
	})

	test('should greet different names correctly', () => {
		const hello = new Hello()
		expect(hello.greet('Alice')).toBe('Hello Alice from Bun!')
		expect(hello.greet('Bob')).toBe('Hello Bob from Bun!')
	})

	test('should handle empty string as name', () => {
		const hello = new Hello()
		const result = hello.greet('')
		expect(result).toBe('Hello  from Bun!')
	})
})

'use strict'

const sheath = require('../../../src/sheath')



describe('sheath()', () => {
	it('asserts that the name is a string', () => {
		expect(sheath.bind(null, {}, () => {})).toThrowError(/expects .* a string/i)
	})
	
	it('asserts that a function is passed', () => {
		expect(sheath.bind(null, 'invalid', 'func')).toThrowError(/expects .*a function/i)
		expect(sheath.bind(null, 'invalid', [], 'func')).toThrowError(/expects .*a function/i)
	})
	
	it('asserts that the deps is a string or array', () => {
		expect(sheath.bind(null, 'invalid', {}, () => {})).toThrowError(/string or array/i)
		expect(sheath.bind(null, 'valid1', [], () => {})).not.toThrow()
		console.warn = jest.fn()
		expect(sheath.bind(null, 'valid2', 'deps', () => {})).not.toThrow()
		expect(sheath.bind(null, 'valid3', () => {})).not.toThrow()
	})
	
	it('creates a module', () => {
		return new Promise((resolve) => {
			sheath('module1', () => {
				resolve('module created')
				return 'visage1'
			})
		}).then((result) => {
			expect(result).toBe('module created')
		})
	})
	
	it('injects a module', () => {
		return new Promise((resolve) => {
			sheath('module2', 'module1', (module1) => {
				resolve(module1)
				return 'visage2'
			})
		}).then((visage) => {
			expect(visage).toBe('visage1')
		})
	})
	
	it('waits for dependencies to be defined before injecting', () => {
		return new Promise((resolve) => {
			sheath('module3', 'module3b', (module3b) => {
				resolve(module3b)
				return 'visage3'
			})
			
			sheath('module3b', () => 'visage3b')
		}).then((visage) => {
			expect(visage).toBe('visage3b')
		})
	})
	
	it('injects multiple modules', () => {
		return new Promise((resolve) => {
			sheath('module4', ['module1', 'module3'], (module1, module3) => {
				resolve(module1 + module3)
				return 'visage4'
			})
		}).then((result) => {
			expect(result).toBe('visage1visage3')
		})
	})
	
	it('loads undeclared modules asynchronously', () => {
		return new Promise((resolve) => {
			sheath('module5', 'test/async-module', (module) => {
				resolve(module)
				return 'visage5'
			})
		}).then((result) => {
			expect(result).toBe('async-visage')
		})
	})
	
	it('cannot declare two modules with the same name', () => {
		return new Promise((resolve) => {
			setTimeout(resolve)
		}).then((result) => {
			expect(sheath.bind(null, 'module5', () => {})).toThrowError(/multiple modules .*same name/i)
		})
	})
})

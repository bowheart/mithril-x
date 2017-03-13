'use strict'

const sheath = require('../../../src/sheath')



describe('sheath.lib()', () => {
	sheath.config.mode('dev')
	
	it('asserts the moduleName is a string', () => {
		expect(sheath.lib.bind(null, {})).toThrowError(/expects.*a string/i)
	})
	
	it('asserts the globalName is a string', () => {
		expect(sheath.lib.bind(null, 'lib1', {})).toThrowError(/expects.*global.*to be a string/i)
	})
	
	it('asserts the fileName is a string', () => {
		expect(sheath.lib.bind(null, 'lib1', 'lib1Ident', {})).toThrowError(/expects.*file name.*to be a string/i)
	})
	
	it('asserts that the moduleName does not start with the separator', () => {
		return new Promise(resolve => {
			sheath.run(resolve)
		}).then(result => {
			expect(sheath.lib.bind(null, '/invalid')).toThrowError(/cannot start with the separator/i)
		})
	})
	
	it('asserts that the moduleName does not start with "."', () => {
		return new Promise(resolve => {
			sheath.run(resolve)
		}).then(result => {
			expect(sheath.lib.bind(null, '../invalid')).toThrowError(/cannot be relative/i)
		})
	})
	
	it('asserts that the moduleName does not contain the accessor', () => {
		return new Promise(resolve => {
			sheath.run(resolve)
		}).then(result => {
			expect(sheath.lib.bind(null, 'invalid.module')).toThrowError(/cannot contain the accessor/i)
		})
	})
	
	it('finds a pre-declared global variable and creates a module', () => {
		return new Promise(resolve => {
			global.lib1 = 'lib1'
			sheath.lib('lib1', 'lib1')
			sheath.run('lib1', resolve)
		}).then(result => {
			expect(result).toBe('lib1')
		})
	})
	
	it('sets the globalName to the moduleName, if no globalName is specified', () => {
		return new Promise(resolve => {
			global.lib2 = 'lib2'
			sheath.lib('lib2')
			sheath.run('lib2', resolve)
		}).then(result => {
			expect(result).toBe('lib2')
		})
	})
	
	it('lazy-loads a file, if one is specified and the globalName does not exist on the global scope', () => {
		return new Promise(resolve => {
			sheath.lib('testLib', 'testLib', 'test/test-lib.js')
			sheath.run('testLib', resolve)
		}).then(result => {
			expect(typeof result).toBe('object')
			expect(result.a).toBe(1)
			expect(result.b).toBe(2)
		})
	})
	
	it('does not lazy-load a given file if the globalName already exists on the global scope', () => {
		global.lib3 = 'lib3'
		sheath.lib('lib3', 'lib3-file.js')
		expect(sheath.forest('lib3')).toHaveLength(1)
	})
	
	it('sets the fileName to the globalName, if globalName is a url', () => {
		return new Promise(resolve => {
			sheath.lib('testLib2', 'test/test-lib2.js')
			sheath.run('testLib2', resolve)
		}).then(result => {
			expect(typeof result).toBe('function')
			expect(result()).toBe('testLib2')
		})
	})
	
	it('logs a warning if the lib could not be loaded', () => {
		return new Promise(resolve => {
			console.warn = resolve
			sheath.lib('nonexistentLib', 'test/nonexistentLib.js')
		}).then(result => {
			expect(result).toMatch(/failed to find module/i)
		})
	})
	
	it('cannot declare the same lib twice', () => {
		expect(sheath.lib.bind(null, 'lib1')).toThrowError(/multiple modules.*same name/i)
	})
})

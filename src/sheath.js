/*
	Sheath.js
	Another library by Joshua Claunch -- https://github.com/bowheart
*/
(function(outside, inBrowser) {
	/*
		Sheath -- a private utility to keep track of modules.
		Moves all modules through this process:
		[declaration received] -> [added to 'declaredModules' list] -> [dependencies defined] -> [definitionFunction called] -> [added to 'definedModules' list]
	*/
	var Sheath = {
		addDeclaredModule: function(module) {
			if (this.declaredModules[module.name]) throw new Error('Sheath.js Error: Multiple modules with the same name found. Name: "' + module.name + '"')
			if (this.phase === 'config') this.toPhase('sync')
			this.declaredModules[module.name] = module
		},
		
		addDefinedModule: function(module) {
			this.definedModules[module.name] = module
			
			if (!this.moduleDependents[module.name]) return // nothing more to do
			
			var dependents = this.moduleDependents[module.name]
			for (var i = 0; i < dependents.length; i++) {
				var dependent = dependents[i]
				dependent.resolveDep(module)
			}
		},
		
		addDependent: function(module, depName) {
			// If the dep is already met, check it off the module's list.
			if (this.definedModules[depName]) return module.resolveDep(this.definedModules[depName])
			
			if (!this.moduleDependents[depName]) this.moduleDependents[depName] = []
			this.moduleDependents[depName].push(module)
			
			this.loadAsync(depName)
		},
		
		async: function(val) {
			if (typeof val === 'undefined') return this.asyncEnabled
			
			this.asyncEnabled = Boolean(val)
			this.loadAsync(this.undeclaredModules()) // attempt to clean up undeclaredModules every time async loading is turned on
		},
		
		/*
			asyncResolver() -- takes a module's name and returns the filename--the `src` attribute of an async <script> tag to request this module.
			This is just the default! It is meant to be overridden using sheath.asyncResolver() (below).
		*/
		asyncResolver: function(module) {
			// The default async filename resolver just assumes that the module name is the filepath minus the '.js' extension.
			return module + '.js'
		},
		
		export: function(key, val) {
			if (!this.tasks.length) return console.warn('Sheath.js Warning: No module is currently being defined. Export ignored.')
			
			this.tasks[this.tasks.length - 1].export(key, val)
		},
		
		// loadAsync() -- Creates a <script> tag for each of the module names passed in (if one hasn't been created).
		loadAsync: function(names) {
			if (this.phase !== 'async' || !this.asyncEnabled) return // lazy-loading is disabled
			if (!Array.isArray(names)) names = [names]
			
			for (var i = 0; i < names.length; i++) {
				var name = names[i]
				if (this.declaredModules[name]) continue // we've already found a declaration for this module
				
				var filename = this.asyncResolver(name)
				if (!filename || names.filter.call(document.scripts, function(script) { return script.getAttribute('src') === filename }).length) {
					continue // no file found for this module OR this script has already been loaded
				}
				
				var script = document.createElement('script')
				script.onerror = function() {
					console.warn('Sheath.js Warning: Attempt to fetch module "' + name + '" failed. Potential hang situation.')
				}
				script.src = filename
				document.body.appendChild(script)
			}
		},
		
		taskEnd: function() {
			this.tasks.pop()
		},
		
		taskStart: function(task) {
			this.tasks.push(task)
		},
		
		toPhase: function(phase) {
			this.phase = phase
			if (phase === 'sync') {
				
				return
			}
			// async phase
			this.loadAsync(this.undeclaredModules())
		},
		
		// Turn all own properties of an object into their property descriptors
		toPropertyDescriptors: function(obj) {
			var propertyDescriptors = {}
			Object.keys(obj).forEach(function(key) {
				propertyDescriptors[key] = Object.getOwnPropertyDescriptor(obj, key)
			})
			return propertyDescriptors
		},
		
		// undeclaredModules() -- Returns the list of all modules that have been listed as dependencies but never declared.
		undeclaredModules: function() {
			var declaredModules = this.declaredModules
			
			return Object.keys(this.moduleDependents).filter(function(module) {
				return !declaredModules[module]
			})
		},
		
		fragmentAccessor: '.', // by default, a period accesses a module fragment
		asyncEnabled: inBrowser, // utilize async loading if we're in a browser environment
		phase: 'config', // Sheath begins in Sync Phase; Async Phase will begin once all initial scripts are loaded
		declaredModules: {}, // keeps track of all module declarations we've encountered throughout the lifetime of this app
		definedModules: {},
		moduleDependents: {}, // map module names to all dependents found for that module; this turns defining a module into a simple lookup
		tasks: []
	}
	
	
	/*
		Module -- a thing with a name, dependencies, and a definition function (all optional)
	*/
	var Module = function(name, deps, defFunc) {
		this.name = name
		this.deps = deps
		this.defFunc = defFunc
		this.depsLeft = deps.length
		this.resolvedDeps = []
		this.exports = {}
		
		this.mapDeps()
		this.addAsDependent()
		this.declare()
		this.define() // attempt to define this module synchronously, in case there are no deps
	}
	Module.prototype = {
		addAsDependent: function() {
			for (var i = 0; i < this.deps.length; i++) {
				Sheath.addDependent(this, this.deps[i].name)
			}
		},
		
		declare: function() {
			Sheath.addDeclaredModule(this)
		},
		
		define: function() {
			if (this.depsLeft > 0) return // there are more dependencies to resolve
			
			Sheath.taskStart(this)
			this.visage = this.defFunc.apply(null, this.resolvedDeps) || {}
			Sheath.taskEnd()
			
			if (this.name) Sheath.addDefinedModule(this) // doesn't apply to nameless modules (modules added via sheath.run())
		},
		
		export: function(key, val) {
			this.exports[key] = val
		},
		
		// replace the array of deps with a map of depName -> depInfo
		mapDeps: function() {
			var mappedDeps = {}
			for (var i = 0; i < this.deps.length; i++) {
				var dep = this.deps[i],
					isImport = Sheath.fragmentAccessor && ~dep.indexOf(Sheath.fragmentAccessor),
					pieces = dep.split(Sheath.fragmentAccessor)
				
				var mappedDep = {
					index: i,
					import: isImport ? pieces.pop() : false,
					name: pieces.join(Sheath.fragmentAccessor)
				}
				Sheath.addDependent(this, mappedDep.name)
				mappedDeps[mappedDep.name] = mappedDep
			}
			this.deps = mappedDeps
		},
		
		resolveDep: function(resolvedDep) {
			var dep = this.deps[resolvedDep.name]
			
			// if the resolvedDep is actually supposed to be a submodule, grab that, otherwise, grab the resolvedDep's visage
			resolvedDep = dep.import
				? resolvedDep.visage[dep.import] || resolvedDep.exports[dep.import]
				: resolvedDep.visage
			
			this.resolvedDeps[dep.index] = resolvedDep
			
			this.depsLeft--
			this.define()
		}
	}
	
	
	
	
	/*
		sheath() -- A utility for organized, encapsulated module definition and dependency injection.
		
		Parameters:
			name : string -- required -- The name of this module.
			deps : string | array -- optional -- The module or list of modules required by this module.
				Each of these must be the name of another module defined somewhere.
				If any dep in this list is not declared in the app and cannot be found by the async loader, the app will 'hang' (see below).
				These will be 'injected' into the defFunc.
			defFunc : function -- required -- The function that will be called to define this module.
				The parameters of this function will be this module's dependencies, in the order they were listed.
				Whatever is 'return'ed by this function will be injected into any modules that require this one.
	*/
	var sheath = outside.sheath = function(name, deps, defFunc) {
		// arg swapping -- deps is optional; if 'defFunc' doesn't exist, move it down
		if (!defFunc) {
			defFunc = deps
			deps = []
		}
		if (typeof deps === 'string') deps = [deps] // if 'deps' is a string, make it the only dependency
		new Module(name, deps, defFunc)
	}
	
	
	/*
		sheath.async() -- a getter/setter to see/define the status of the async loader.
		A config shorthand.
		Pass true to activate async loading, false to deactivate.
		Async loading is turned on by default.
	*/
	sheath.async = Sheath.async.bind(Sheath)
	
	
	/*
		sheath.asyncResolver(function) -- The default async filename resolver doesn't do much. Use this guy to beef it up.
		A config shorthand.
	*/
	sheath.asyncResolver = function(newResolver) {
		if (typeof newResolver !== 'function') throw new TypeError('Sheath.js Error: Custom asyncResolver must be a function')
		
		Sheath.asyncResolver = newResolver
	}
	
	
	/*
		sheath.baseModel() -- A getter/setter for the baseModel to be used by sheath.model() as the default parent prototype.
		A config shorthand.
	*/
	sheath.baseModel = function(baseModel) {
		if (!baseModel) return Sheath.baseModel
		
		if (Sheath.phase !== 'config') {
			throw new Error('Sheath.js Error: baseModel can only be set in the config phase.')
		}
		if (!~['function', 'object'].indexOf(typeof baseModel)) {
			throw new TypeError('Sheath.js Error: baseModel must be a function, an object, or null. Found "' + typeof baseModel + '"')
		}
		
		return Sheath.baseModel = baseModel
	}
	
	
	/*
		sheath.baseObject() -- A getter/setter for the baseObject to be used by sheath.object() as the default parent prototype.
		A config shorthand.
	*/
	sheath.baseObject = function(baseObject) {
		if (!baseObject) return Sheath.baseObject
		
		if (Sheath.phase !== 'config') {
			throw new Error('Sheath.js Error: baseObject can only be set in the config phase.')
		}
		if (typeof baseObject !== 'object') {
			throw new TypeError('Sheath.js Error: baseObject must be an object or null. Found "' + typeof baseObject + '"')
		}
		
		return Sheath.baseObject = baseObject
	}
	
	
	sheath.config = function(key, val) {
		if (typeof key === 'string') {
			// TODO: finish this function
		}
	}
	
	
	/*
		sheath.const() -- Use to declare/fetch universal constants -- immutable values that the whole app should have access to.
	*/
	sheath.const = function(key, val) {
		if (typeof key === 'string') {
			if (typeof val === 'undefined') return Sheath.constants[key]
			return Sheath.constants[key] = val
		}
		if (typeof key !== 'object') throw new TypeError('Sheath.js Error: sheath.const() expects either a key and a value, or an object. Received: "' + typeof key + '"')
		Object.keys(key).forEach(function(prop) {
			Sheath.constants[prop] = key[prop]
		})
	}
	
	
	/*
		sheath.export() -- Create a submodule on the module currently being defined.
		Can be injected into other modules via sheath.import()
	*/
	sheath.export = Sheath.export.bind(Sheath)
	
	
	/*
		sheath.fragmentAccessor() -- A getter/setter for Sheath.fragmentAccessor -- the char sequence used to access a module fragment.
		A config shorthand.
	*/
	sheath.fragmentAccessor = function(val) {
		if (!val) return Sheath.fragmentAccessor
		
		if (Sheath.phase !== 'config') {
			throw new Error('Sheath.js Error: fragmentAccessor can only be set in the config phase.')
		}
		return Sheath.fragmentAccessor = val
	}
	
	
	/*
		sheath.import() -- Import a piece or submodule of a module.
		This is a more readable alias for an array with containing these two elements (name and submodule name).
	*/
	sheath.import = function(name, submodule) {
		return [name, submodule]
	}
	
	
	/*
		sheath.model() -- An easy interface for declaring JavaScript 'classes' with inheritance.
		
		Params:
			parent : object|function -- optional -- The prototype, or function whose prototype this model will inherit.
			model : object -- required -- The class definition. If the object has an 'init()' property (optional), it will become the class constructor.
	*/
	sheath.model = function(parent, model) {
		// Arg swapping -- 'parent' is optional; if 'model' doesn't exist, move it down.
		if (!model) {
			model = parent
			parent = Sheath.baseModel || null
		}
		var parentPrototype = typeof parent === 'function' ? parent.prototype : parent
		
		// Make sure the model param is valid.
		if (typeof model !== 'object') throw new TypeError('Sheath.js Error: Model must be an object')
		
		// Make sure the parent param is valid, if it was given.
		if (parent && !~['function', 'object'].indexOf(typeof parent)) {
			throw new TypeError('Sheath.js Error: Parent must be a constructor function or an object')
		}
		
		// Use the init() property of the model as the constructor (if it exists), otherwise use the parent's (if there's a parent)
		var constructor = model.init || parent && parentPrototype.init && function() {
			return parentPrototype.init.apply(this, arguments)
		} || new Function()
		
		// Implement the inheritance (if user gave a parent model) and make the rest of the model the prototype
		constructor.prototype = Object.create(parentPrototype, Sheath.toPropertyDescriptors(model))
		
		return constructor
	}
	
	
	/*
		sheath.object() -- An easy interface for declaring JavaScript objects with custom and inheriting prototypes.
		
		Params:
			parent : object -- optional -- The prototype object from which this object will inherit.
			object : object -- required -- The new object you want created.
	*/
	sheath.object = function(parent, object) {
		// Arg swapping -- 'parent' is optional; if 'object' doesn't exist, move it down.
		if (!object) {
			object = parent
			parent = Sheath.baseObject || null
		}
		
		// Make sure the object param is valid.
		if (typeof object !== 'object') throw new TypeError('sheath.object() error: object must be an object')
		
		// Make sure the parent param is valid, if it was given.
		if (parent && typeof parent !== 'object') {
			throw new TypeError('sheath.object() error: parent must be an object')
		}
		
		// Make the parent the object's prototype.
		if (parent) object = Object.create(parent, Sheath.toPropertyDescriptors(object))
		
		return object
	}
	
	
	/*
		sheath.phase() -- A debugging utility. This will return the life phase that Sheath is currently in.
		Use this to familiarize yourself with Sheath's life cycle.
	*/
	sheath.phase = function() {
		return Sheath.phase
	}
	
	
	/*
		sheath.run() -- run some code that leverages Sheath's dependency injection, but without declaring a module.
		The 'deps' arg is optional, so this can also be used for just arbitrary encapsulation -- replacing an IIFE, for example.
	*/
	sheath.run = function(deps, func) {
		// arg swapping -- deps is optional; if 'func' doesn't exist, move it down.
		if (!func) {
			func = deps
			deps = []
		}
		if (typeof deps === 'string') deps = [deps] // if 'deps' is a string, make it the only dependency
		new Module('', deps, defFunc)
	}
	
	
	/*
		sheath.waitingOn() -- returns the names of all the modules the app is waiting on.
		These are modules that have been listed as dependencies of other modules, but that haven't been declared yet.
		Call this from the console when you suspect the app is hanging.
	*/
	sheath.waitingOn = function() {
		return Sheath.undeclaredModules()
	}
	
	
	// Once all the initial scripts have been loaded, turn on asychronous loading and request any not-yet-declared modules.
	window.onload = Sheath.toPhase.bind(Sheath, 'async')
})(window || typeof module === 'object' && typeof module.exports === 'object' && module.exports || this, typeof window === 'object')

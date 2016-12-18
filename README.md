[![build status](https://travis-ci.org/bowheart/sheath.js.svg?branch=master)](https://travis-ci.org/bowheart/sheath.js)
[![Test Coverage](https://codeclimate.com/github/bowheart/sheath.js/badges/coverage.svg)](https://codeclimate.com/github/bowheart/sheath.js/coverage)
[![Issue Count](https://img.shields.io/codeclimate/issues/github/bowheart/sheath.js.svg)](https://codeclimate.com/github/bowheart/sheath.js/issues)
[![Code Climate](https://codeclimate.com/github/bowheart/sheath.js/badges/gpa.svg)](https://codeclimate.com/github/bowheart/sheath.js)

# Sheath.js

Sheath is a utility library for modular applications. It's *the* module library.

Check out Sheath's coolness list:

- A clean, overly simplistic interface for creating modules.
- Dependency injection.
- Asynchronous script loading.
- Utilities for easily creating common types of modules.
- A flow that works well with MVC frameworks such as Backbone, React, and Mithril.
- Awesome debugging tools, including opt-in circular dependency detection.
- Even awesomer dependency graph analysis tools available server-side for easy automation.
- Highly optimized code. Most of Sheath's algorithms are simple lookups &ndash; O(1) time.

## A simple example

Let's create a module.

```javascript
sheath('dagger', function() {
	return 'a dagger'
})
```

Simple as that. Let's break down what happened here:

- We *declared* a module named 'dagger'.
- Sheath called our function. This *defined* our module.
- We exposed the string 'a dagger' as our module's *visage*. The visage is the public face of our module &ndash; it's what will get injected into dependents.

Alright. Cool, I guess. Now what was the point of that?

Let's create another module:

```javascript
sheath('assassin', ['dagger'], function(dagger) {
	return 'A deadly assassin. Weapon: ' + dagger
})
```

Let's break this one down:

- We declared a module named 'assassin' with one dependency, 'dagger'.
- Sheath ensured that the 'dagger' module was loaded before:
- Sheath called our function, passing ("injecting") the dagger module's visage as the first argument. This defined our module.
- We exposed a new string concatenated with the dagger module's visage as our module's visage.

Every module goes through this basic life cycle.

## To Be Continued...

That's really all you need to get started! Take a look at the [github wiki](https://github.com/bowheart/sheath.js/wiki) for a more in-depth rundown and the full API documentation.

## Bugs, Pull Requests, Feedback, Just Everything

Bugs can be reported at the [github issues page](https://github.com/bowheart/sheath.js/issues). All suggestions and feedback are so super welcome. Also feel free to fork and pull request &ndash; just make sure the tests pass (`npm test`) and try to keep the tests at ~100% coverage. Happy coding!

## License

The [MIT License](LICENSE)

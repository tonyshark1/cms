// Supported operations:
// "render" renders page
// "render-multiple" renders multiple pages (uses "render")
// "breadcrumb" creates bredcrumb (uses "render")
// "clear" clears database

// Supported workflows
// "create-url"

NEWSCHEMA('Page').make(function(schema) {

	schema.define('id', 'String(20)');
	schema.define('parent', 'String(20)');
	schema.define('template', 'String(30)');
	schema.define('language', 'Lower(3)');
	schema.define('url', 'String(200)');
	schema.define('keywords', 'String(200)');
	schema.define('icon', 'String(20)');
	schema.define('navigations', '[String]');
	schema.define('partial', '[String]');      // A partial content
	schema.define('widgets', '[String]');      // Widgets lists, contains Array of ID widget
	schema.define('settings', '[String]');     // Widget settings (according to widgets array index)
	schema.define('tags', '[String]');
	schema.define('pictures', '[String]')      // URL addresses for first 5 pictures
	schema.define('name', 'String(50)');
	schema.define('perex', 'String(500)');
	schema.define('search', 'String(2000)');
	schema.define('title', 'String(100)', true);
	schema.define('priority', Number);
	schema.define('ispartial', Boolean);
	schema.define('body', String);
	schema.define('datecreated', Date);

	// Sets default values
	schema.setDefault(function(name) {
		switch (name) {
			case 'datecreated':
				return new Date();
		}
	});

	// Gets listing
	schema.setQuery(function(error, options, callback) {

		// options.search {String}
		// options.navigation {String}
		// options.language {String}
		// options.ispartial {Boolean}
		// options.page {String or Number}
		// options.max {String or Number}

		options.page = U.parseInt(options.page) - 1;
		options.max = U.parseInt(options.max, 20);

		if (options.page < 0)
			options.page = 0;

		var take = U.parseInt(options.max);
		var skip = U.parseInt(options.page * options.max);

		// Prepares searching
		if (options.search)
			options.search = options.search.keywords(true, true).join(' ');

		var sql = DB(error);
		var filter = sql.$;

		filter.where('isremoved', false);

		// Checks partial content
		if (options.ispartial)
			filter.where('ispartial', options.ispartial);

		// Checks language
		if (options.language)
			filter.where('language', options.language);

		// Checks navigations
		if (options.navigation)
			filter.like('navigations', options.navigation, '*');

		// Searchs in "title"
		// @TODO: improve full-text search
		if (options.search)
			filter.like('search', options.search, '*');

		sql.select('items', 'tbl_page').make(function(builder) {
			builder.replace(filter);
			builder.fields('id', 'name', 'parent', 'url', 'navigations', 'ispartial', 'priority', 'language', 'icon');
			builder.sort('name');
			builder.skip(skip);
			builder.take(take);
		});

		sql.count('count', 'tbl_page', 'id').make(function(builder) {
			builder.replace(filter);
		});

		sql.exec(function(err, response) {

			if (err)
				return callback();

			var empty = [];

			for (var i = 0, length = response.items.length; i < length; i++) {
				var item = response.items[i];
				if (item.navigations)
					item.navigations = item.navigations.split(';');
				else
					item.navigations = empty;

				if (item.tags)
					item.tags = item.tags.split(';');
				else
					item.tags = empty;

				if (item.pictures)
					item.pictures = item.pictures.split(';');
				else
					item.pictures = empty;
			}

			var data = {};
			data.count = response.count;
			data.items = response.items;
			data.limit = options.max;
			data.pages = Math.ceil(data.count / options.max);

			if (!data.pages)
				data.pages = 1;

			data.page = options.page + 1;
			callback(data);
		});
	});

	// Gets a specific page
	schema.setGet(function(error, model, options, callback) {

		// options.url {String}
		// options.id {String}
		// options.language {String}

		var sql = DB(error);

		sql.select('item', 'tbl_page').make(function(builder) {
			builder.where('isremoved', false);
			if (options.url)
				builder.where('url', options.url);
			if (options.language)
				builder.where('language', options.language);
			if (options.id)
				builder.where('id', options.id);
			builder.first();
		});

		sql.validate('item', 'error-404-page');

		sql.select('widgets', 'tbl_page_widget').make(function(builder) {
			builder.where('idpage', sql.expected('item', 'id'));
			builder.fields('idwidget', 'settings');
		});

		sql.exec(function(err, response) {

			if (err)
				return callback();

			var item = response.item;

			item.pictures = item.pictures ? item.pictures.split(';').trim() : [];
			item.partial = item.partial ? item.partial.split(';').trim() : [];
			item.navigations = item.navigations ? item.navigations.split(';').trim() : [];
			item.tags = item.tags ? item.tags.split(';').trim() : [];

			item.widgets = [];
			item.settings = [];

			for (var i = 0, length = response.widgets.length; i < length; i++) {
				var widget = response.widgets[i];
				item.widgets.push(widget.idwidget);
				item.settings.push(widget.settings);
			}

			callback(item);
		});
	});

	// Removes a specific page
	schema.setRemove(function(error, id, callback) {

		var sql = DB(error);

		sql.update('item', 'tbl_page').make(function(builder) {
			builder.where('id', id);
			builder.set('isremoved', true);
		});

		sql.exec(function(err) {
			callback(SUCCESS(true));

			if (err)
				return;

			// Refreshes internal information e.g. sitemap
			setTimeout(refresh, 1000);
		});
	});

	// Saves the page into the database
	schema.setSave(function(error, model, options, callback) {

		// options.id {String}
		// options.url {String}

		if (!model.name)
			model.name = model.title;

		var count = 0;
		var isNew = model.id ? false : true;

		if (!model.id)
			model.id = UID();

		// Sanitizes URL
		if (model.url[0] !== '#' && !model.url.startsWith('http:') && !model.url.startsWith('https:')) {
			model.url = U.path(model.url);
			if (model.url[0] !== '/')
				model.url = '/' + model.url;
		}

		// Removes unnecessary properties (e.g. SchemaBuilder internal properties and methods)
		var clean = model.$clean();

		clean.pictures = clean.pictures.join(';');
		clean.tags = clean.tags.join(';');
		clean.partial = clean.partial.join(';');
		clean.navigations = clean.navigations.join(';');

		if (clean.search)
			clean.search = ((clean.title || '') + ' ' + (clean.keywords || '') + ' ' + clean.search).keywords(true, true).join(' ').max(2000);

		delete clean.settings;
		delete clean.widgets;

		// settings
		// widgets

		var sql = DB(error);

		sql.save('item', 'tbl_page', isNew, function(builder, isNew) {
			builder.set(clean);
			if (isNew)
				return;
			builder.set('dateupdated', new Date());
			builder.rem('id');
			builder.rem('datecreated');
			builder.where('id', clean.id);
		});

		if (!isNew)
			sql.remove('tbl_page_widget').where('idpage', model.id);

		for (var i = 0, length = model.widgets.length; i < length; i++) {
			sql.insert('tbl_page_widget').make(function(builder) {
				builder.set('idpage', model.id);
				builder.set('idwidget', model.widgets[i]);
				builder.set('settings', model.settings[i]);
				builder.primary('idpage');
			});
		}

		sql.exec(function(err) {

			// Returns response
			callback(SUCCESS(true));

			if (err)
				return;

			F.emit('pages.save', model);

			// Refreshes internal information e.g. categories
			setTimeout(refresh, 1000);
		});
	});

	schema.addWorkflow('create-url', function(error, model, options, callback) {

		if (!model.parent) {
			model.url = model.title.slug();
			return callback();
		}

		var options = {};
		options.id = model.parent;

		// Gets Parent
		schema.get(options, function(err, response) {

			if (err) {
				model.url = model.title.slug();
				return callback();
			}

			// Gets parent URL and adds current page title
			model.url = response.url + model.title.slug() + '/';
			callback();
		});
	});

	// Renders page
	schema.addOperation('render', function(error, model, options, callback) {

		// options.id {String}
		// options.url {String}

		if (typeof(options) === 'string') {
			var tmp = options;
			options = {};
			options.id = options.url = tmp;
		}

		// Gets the page
		schema.get(options, function(err, response) {

			if (err) {
				error.push(err);
				return callback();
			}

			if (!response) {
				error.push('error-404-page');
				return callback();
			}

			// Loads breadcrumb
			var key = (response.language ? response.language + ':' : '') + response.url;
			schema.operation('breadcrumb', key, function(err, breadcrumb) {

				if (breadcrumb && breadcrumb.length > 0)
					breadcrumb[0].first = true;

				response.breadcrumb = breadcrumb;

				if (response.body)
					response.body = response.body.replace(' id="CMS"', '');

				if (!response.widgets)
					return callback(response);

				var Widget = GETSCHEMA('Widget');

				// Loads widgets
				Widget.workflow('load', null, response.widgets, function(err, widgets) {
					var index = 0;
					response.widgets.wait(function(key, next) {
						// INIT WIDGET
						var custom = {};
						custom.settings = response.settings[index++];
						custom.page = response;
						custom.controller = options.controller;

						if (!widgets[key]) {
							F.error(new Error('Widget # ' + key + ' not found'), 'Page: ' + response.name, response.url);
							return next();
						}

						// Executes transform
						Widget.transform(key, widgets[key], custom, function(err, content) {

							if (err) {
								F.error(err, 'Widget: ' + widgets[key].name + ' - ' + key + ' (page: ' + response.name + ')', response.url);
								return next();
							}

							response.body = response.body.replace('data-id="' + key + '">', '>' + content);
							next();
						}, true);

					}, function() {
						// DONE
						if (response.language)
							response.body = F.translator(response.language, response.body);

						response.body = U.minifyHTML(response.body.replace(/<br>/g, '<br />'));

						// cleaner
						response.body = response.body.replace(/(\s)class\=\".*?\"/g, function(text) {

							var is = text[0] === ' ';
							var arr = text.substring(is ? 8 : 7, text.length - 1).split(' ');
							var builder = '';

							for (var i = 0, length = arr.length; i < length; i++) {
								var cls = arr[i];
								if (cls[0] === 'C' && cls[3] === '_' && cls !== 'CMS_hidden')
									continue;
								builder += (builder ? ' ' : '') + cls;
							}

							return builder ? (is ? ' ' : '') + 'class="' + builder + '"' : '';
						});

						if (response.partial && response.partial.length) {
							schema.operation2('render-multiple', { id: response.partial }, function(err, partial) {

								if (err) {
									error.push(err);
									return callback();
								}

								var arr = [];
								var keys = Object.keys(partial);
								for (var i = 0, length = keys.length; i < length; i++)
									arr.push(partial[keys[i]]);
								response.partial = arr;
								callback(response);
							});
							return
						}

						callback(response);
					});
				}, true);
			});
		});
	});

	// Renders multiple page
	schema.addOperation('render-multiple', function(error, model, options, callback) {

		// options.id {String Array}
		// options.url {String Array}
		// options.language {String}

		var output = {};
		var pending = [];

		if (options.url instanceof Array) {
			for (var i = 0, length = options.url.length; i < length; i++) {
				(function(id) {
					pending.push(function(next) {
						var custom = {};
						custom.url = id;
						custom.language = options.language;
						schema.operation('render', custom, function(err, response) {
							output[id] = response;
							next();
						});
					});
				})(options.url[i]);
			}
		}

		if (options.id instanceof Array) {
			for (var i = 0, length = options.id.length; i < length; i++) {
				(function(id) {
					pending.push(function(next) {
						var custom = {};
						custom.id = id;
						custom.language = options.language;
						schema.operation('render', custom, function(err, response) {
							output[id] = response;
							next();
						});
					});
				})(options.id[i]);
			}
		}

		pending.async(function() {
			callback(output);
		});
	});

	// Loads breadcrumb according to URL
	schema.addOperation('breadcrumb', function(error, model, url, callback) {

		var arr = [];

		while (true) {
			var item = F.global.sitemap[url];
			if (!item)
				break;
			arr.push(item);
			url = item.parent;
		};

		arr.reverse();
		callback(arr);
	});

	// Clears database
	schema.addWorkflow('clear', function(error, model, options, callback) {
		var sql = DB(error);
		sql.remove('tbl_page');
		sql.exec(function(err) {

			callback(SUCCESS(true));

			// Refreshes internal information e.g. sitemap
			if (!err)
				setTimeout(refresh, 1000);
		});
	});

});

// Refreshes internal informations (sitemap and navigations)
function refresh() {

	var sitemap = {};
	var helper = {};
	var navigation = {};
	var partial = [];

	var sql = DB();

	sql.select('pages', 'tbl_page').make(function(builder) {
		builder.where('isremoved', false);
		builder.fields('id', 'url', 'name', 'title', 'parent', 'language', 'icon', 'ispartial', 'navigations', 'tags', 'priority');
	});

	sql.exec(function(err, response) {

		for (var i = 0, length = response.pages.length; i < length; i++) {
			var page = response.pages[i];

			// A partial content is skipped from the sitemap
			if (page.ispartial) {
				partial.push({ id: page.id, url: page.url, name: page.name, title: page.title, language: page.language, icon: page.icon, tags: page.tags, priority: page.priority });
				continue;
			}

			// Prepares navigations
			page.navigations = page.navigations ? page.navigations.split(';') : [];

			var key = (page.language ? page.language + ':' : '') + page.url;
			helper[page.id] = key;
			sitemap[key] = page;

			if (!page.navigations.length)
				continue;

			for (var j = 0, jl = page.navigations.length; j < jl; j++) {
				var name = page.navigations[j];
				if (!navigation[name])
					navigation[name] = [];
				navigation[name].push({ url: page.url, name: page.name, title: page.title, priority: page.priority, language: page.language, icon: page.icon, tags: page.tags });
			}
		}

		// Pairs parents by URL
		Object.keys(sitemap).forEach(function(key) {
			var parent = sitemap[key].parent;
			if (parent)
				sitemap[key].parent = helper[parent];
		});

		// Sorts navigation according to priority
		Object.keys(navigation).forEach(function(name) {
			navigation[name].sort(function(a, b) {
				if (a.priority > b.priority)
					return -1;
				return a.priority < b.priority ? 1 : 0;
			});
		});

		partial.sort((a, b) => a.priority > b.priority ? -1 : a.priority === b.priority ? 0 : 1);

		F.global.navigations = navigation;
		F.global.sitemap = sitemap;
		F.global.partial = partial;
	});
}

// Creates Controller.prototype.page()
F.eval(function() {

	Controller.prototype.render = function(url, view, model, cache) {
		var self = this;
		var key = (self.language ? self.language + ':' : '') + url;
		var page = F.global.sitemap[key];

		if (!page) {
			self.throw404();
			return self;
		}

		self.page(self.url, view, model, cache);
		return self;
	};

	Controller.prototype.partial = function(url, callback) {
		var self = this;
		var page = F.global.partial.find(n => n.url === url && n.language === (self.language || ''));

		if (!page) {
			callback(new ErrorBuilder().push('error-404-page'));
			return;
		}

		var options = {};
		options.id = page.id;

		GETSCHEMA('Page').operation('render', options, callback);
		return self;
	};

	Controller.prototype.page = function(url, view, model, cache, partial) {

		var self = this;
		var tv = typeof(view);

		if (tv === 'object') {
			model = view;
			view = undefined;
		} else if (tv === 'boolean') {
			cache = view;
			view = undefined;
			model = null;
		}

		if (typeof(model) === 'boolean') {
			cache = model;
			model = null;
		}

		if (cache === undefined)
			cache = true;

		if (!partial) {
			if (self.language)
				url = self.language + ':' + url;

			if (!F.global.sitemap[url]) {
				self.status = 404;
				self.plain(U.httpStatus(404, true));
				return self;
			}
		}

		self.memorize('cache.' + url, '1 minute', DEBUG || cache !== true, function() {

			var options = {};

			options.url = self.url;
			options.language = self.language;
			options.controller = self;

			GETSCHEMA('Page').operation('render', options, function(err, response) {

				if (err) {
					self.status = 404;
					self.plain(U.httpStatus(404, true));
					return;
				}

				self.repository.cms = true;
				self.repository.render = true;
				self.repository.page = response;

				self.sitemap(response.breadcrumb);
				self.title(response.title);

				if (!view)
					view = '/cms/' + response.template;

				self.view(view, model);
			});
		});

		return self;
	};
});

// Renders page and stores into the repository
F.middleware('page', function(req, res, next, options, controller) {

	if (!controller) {
		res.throw404();
		return;
	}

	controller.memorize('cache.' + controller.url, '1 minute', DEBUG, function() {
		controller.page(controller.url);
	});
});

F.on('settings', refresh);
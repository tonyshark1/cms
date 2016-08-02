var Fs = require('fs');
var filename = F.path.databases('settings.json');

NEWSCHEMA('SuperUser').make(function(schema) {

	schema.define('login', String, true);
	schema.define('password', String, true);
	schema.define('roles', '[String]');

});

NEWSCHEMA('Settings').make(function(schema) {

	schema.define('currency', String, true);
	schema.define('currency_entity', String);
	schema.define('emailcontactform', 'Email', true);
	schema.define('emailorderform', 'Email', true);
	schema.define('emailreply', 'Email', true);
	schema.define('emailsender', 'Email', true);
	schema.define('emailuserform', 'Email', true);
	schema.define('url', 'Lower', true);
	schema.define('templates', '[String]');
	schema.define('posts', '[String]');
	schema.define('navigations', '[String]');
	schema.define('deliverytypes', '[String]');
	schema.define('defaultorderstatus', String);
	schema.define('users', '[SuperUser]');
	schema.define('languages', '[String(2)]');

	// PayPal account
	schema.define('paypaluser', String);
	schema.define('paypalpassword', String);
	schema.define('paypalsignature', String);
	schema.define('paypaldebug', Boolean);

	// OAuth2
	schema.define('oauth2_facebook_key', String);
	schema.define('oauth2_facebook_secret', String);
	schema.define('oauth2_google_key', String);
	schema.define('oauth2_google_secret', String);
	schema.define('oauth2_instagram_key', String);
	schema.define('oauth2_instagram_secret', String);
	schema.define('oauth2_yahoo_key', String);
	schema.define('oauth2_yahoo_secret', String);
	schema.define('oauth2_live_key', String);
	schema.define('oauth2_live_secret', String);
	schema.define('oauth2_dropbox_key', String);
	schema.define('oauth2_dropbox_secret', String);
	schema.define('oauth2_vk_key', String);
	schema.define('oauth2_vk_secret', String);
	schema.define('oauth2_linkedin_key', String);
	schema.define('oauth2_linkedin_secret', String);

	// Saves settings into the file
	schema.setSave(function(error, model, options, callback) {
		var settings = U.extend({}, model.$clean());

		if (settings.url.endsWith('/'))
			settings.url = settings.url.substring(0, settings.url.length - 1);

		settings.datebackuped = new Date();
		DB('settings_backup').insert(JSON.parse(JSON.stringify(settings)));
		delete settings.datebackuped;

		// Writes settings into the file
		Fs.writeFile(filename, JSON.stringify(settings), function() {

			F.emit('settings.save', settings);

			// Returns response
			callback(SUCCESS(true));
		});
	});

	// Gets settings
	schema.setGet(function(error, model, options, callback) {
		Fs.readFile(filename, function(err, data) {
			var settings = {};

			if (!err) {
				settings = JSON.parse(data.toString('utf8'));
				callback(settings);
				return;
			}

			settings['manager-superadmin'] = 'admin:admin';
			settings.currency = 'EUR';
			settings.currency_entity = '&euro;';

			callback(settings);
		});
	});

	// Loads settings + rewrites framework configuration
	schema.addWorkflow('load', function(error, model, options, callback) {
		schema.get(null, function(err, settings) {

			F.config.custom = settings;

			// Refreshes internal informations
			if (!F.config.custom.users)
				F.config.custom.users = [];

			// Adds an admin (service) account
			var sa = CONFIG('manager-superadmin').split(':');
			F.config.custom.users.push({ login: sa[0], password: sa[1], roles: [], sa: true });

			// Optimized for the performance
			var users = {};
			for (var i = 0, length = F.config.custom.users.length; i < length; i++) {
				var user = F.config.custom.users[i];
				var key = (user.login + ':' + user.password).hash();
				users[key] = user;
			}

			F.config.custom.users = users;

			// Rewrites internal framework settings
			F.config['mail.address.from'] = F.config.custom.emailsender;
			F.config['mail.address.reply'] = F.config.custom.emailreply;

			if (!F.config.custom.languages)
				F.config.custom.languages = [];

			// Currency settings
			switch (F.config.custom.currency.toLowerCase()) {
				case 'eur':
					F.config.custom.currency_entity = '&euro; {0}';
					break;
				case 'usd':
					F.config.custom.currency_entity = '&dollar; {0}';
					break;
				case 'gbp':
					F.config.custom.currency_entity = '{0} &pound;';
					break;
				case 'jpy':
					F.config.custom.currency_entity = '&yen; {0}';
					break;
				case 'czk':
					F.config.custom.currency_entity = '{0} Kč';
					break;
				case 'brl':
					F.config.custom.currency_entity = 'R&dollar; {0}';
					break;
				default:
					F.config.custom.currency_entity = '{0} ' + F.config.custom.currency;
					break;
			}

			F.emit('settings', settings);

			// Returns response
			callback(SUCCESS(true));
		});
	});
});

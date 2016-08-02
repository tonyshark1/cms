[![MIT License][license-image]][license-url]

[![Support](https://www.totaljs.com/img/button-support.png)](https://www.totaljs.com/support/) [![Donate](https://www.totaljs.com/img/button-donate.png)](https://www.totaljs.com/#make-a-donation)

# Node.js Eshop and CMS

Please do not change the code, just create a new issues. I solve all problems as soon as possible. Do you want special upgrades? Contact me <petersirka@gmail.com>.

__IMPORTANT: PLEASE DON'T CHANGE DATA IN MONGODB AND POSTGRESQL DATABASES. CREATE YOUR OWN BACKUP AND RESTORE IT ON YOU SERVERS OR CLOUD.__

- New version: `v6.0.0` (works only with __Total.js 2.0__)
- [Documentation](http://docs.totaljs.com/eshop-cms/latest.html)

---

## The source-code

- `cms` NoSQL embedded version
- `eshop` NoSQL embedded version
- `eshop-postgresql` PostgreSQL version
- `eshop-mongodb` MongoDB version
- `backup` contains backup of MongoDB and PostgreSQL database


---

## Installation

- install `npm install total.js`
- install `npm install paypal-express-checkout`

### MongoDB version only

- install `npm install sqlagent`
- install `npm install mongodb`
- __note__: cloud database www.mongolab.com
- __important__: binary files are too slow because I have a free billing plan and the servers are in USA

### PostgreSQL version only

- install `npm install sqlagent`
- install `npm install pg`
- install `npm install pg-large-object`
- __note__: cloud database www.elephantsql.com
- __important__: binary files are too slow because I have a free billing plan and the servers are in USA

---

## Do you need VPS hosting for your eshops?

Sign up on <https://www.webhostingy.com/en/totaljs>

- you can provide more than 5 eshops
- price around 15 EUR per month
- easy configuration (DNS, Mail / SMTP, FTP, SFTP, etc.)
- ddos prevention
- everything under control

![VPS hosting](https://www.totaljs.com/img/eshop-vps-hosting.jpg)

[license-image]: https://img.shields.io/badge/license-MIT-blue.svg?style=flat
[license-url]: license.txt

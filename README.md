semo-plugin-sequelize
------------------------

A Semo plugin to privide sequelize integration in Semo way.

## CLI Usage

```
npm i semo-plugin-sequelize

semo sql cli <dbKey>                               Connect with pgcli/mycli/sqlite3 connector
semo sql describe <dbKey> <tableName>              Sequelize db table describe                      [aliases: d, desc]
semo sql generate <dbKey> <tableName> [fieldName]  Sequelize db migration generator               [aliases: g, create]
semo sql list <dbKey>                              List all table of specific database                [aliases: l, ls]
semo sql query <dbKey> <sql>                       Execute SQL, only support SELECT                       [aliases: q]
```

## Programming way

```
npm i @semo/core semo-plugin-sequelize
semo init
```

### Add migration config and dbConfig in .semorc.yml

```yml

# Useful for migration
migrationMakeDir: src/migrations
migrationDir: lib/migrations

semo-plugin-sequelize:
  defaultConnection: dbKeyStyle1 # if provided, commands do not need --db-key
  connection:
    dbKeyStyle1:
      database: d8
      username: d8
      password: d8
      host: localhost
      port: 5432
      dialect: postgres
    dbKeyStyle2: postgres://d8:d8@localhost:5432/d8
```

Except adding db connection info in .semorc.yml, also we can declare that info in hook_sequelize_connection.

```js
// src/hooks/index.ts

const export hook_sequelize_connection = async () => {
  return {
    dbKeyStyle1: {
      database: 'd8',
      username: 'd8',
      password: 'd8',
      host: 'localhost',
      port: 5432,
      dialect: 'postgres'
    }
  }
}
```

You may have noticed, there is a `async` for the hook_sequelize_connection, it's useful for fetching db config from config center.

This plugin support 3 dialects: `mysql`, `postgres`, `sqlite`, and support 2 style's config format: literal object and DSN.

### Add .sequelizerc file for migration

```js
const path = require('path');

const SequelizeOps = process.argv.slice(2).join(' ')

// Operations with care
if (SequelizeOps.indexOf('undo') > -1 && process.env.NODE_ENV === 'production') {
  throw new Error('Sequelize undo disabled on production')
}

module.exports = {
  'config': path.resolve('config.db.js'),
  'migrations-path': path.resolve('lib/migrations'),
}
```

### Add config.db.js for migration to connnect to db

```js
/**
 * @file
 *
 * For Sequelize Cli db connection
 */

module.exports = require('semo-plugin-sequelize').sequelize.db.getConfig('dbKey')
```

Here, sequelize-cli only can choose to use one database to migrate.

### Access db instance and table model.

```js
import { Utils } from '@semo/core'

const { sequelize } = await Utils.invokeHook('component')
const { Op, Sequelize } = sequelize
const { db, models: { YourModel } } = await sequelize.db.load('dbKey)
const count = await YourModel.count({
  where: {
    id: {
      [Op.gt]: 3
    }
  }
})
```

### To use cli command, you need to install related cli tools. This is an example on MacOS

```sh
brew install pgcli # For PostgresSQL
brew install mycli # For MySQL
```

### Access database in REPL

This plugin has expose objects and methods to REPL, so you can assess db data from REPL.

```js
$ semo repl --hook
>>> const { models: { YourModel } } = await Semo.sequelize.db.load('dbKey')
>>> YourModel.count()
2
```

## License

MIT



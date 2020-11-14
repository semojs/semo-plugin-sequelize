import fs from 'fs'
import path from 'path'
import { UtilsType } from '@semo/core'
import { DatabaseLoader } from '../../common/DatabaseLoader'

export const plugin = 'sequelize'
export const command = 'list [dbKey]'
export const desc = 'List all table of specific database'
export const aliases = ['l', 'ls']

export const builder = function(yargs: any) {
  yargs.option('db-key', { describe: 'Set db connection key', alias: 'key' })
}

export const handler = async function(argv: any) {
  const Utils:UtilsType = argv.$semo.Utils
  const dbKey = Utils.pluginConfig('defaultConnection', argv.dbKey)

  try {
    const { sequelize } = await Utils.invokeHook<{ sequelize: DatabaseLoader }>('semo:component')
    let db, dbConfig
    if (dbKey) {
      let databaseLoaded = await sequelize.load(dbKey, { associate: false })
      db = databaseLoaded.db
      dbConfig = await sequelize.getConfig(dbKey)
    } else {
      const currentPath = process.cwd()
      if (fs.existsSync(path.resolve(currentPath, '.sequelizerc'))) {
        const sequelizerc = require(path.resolve(currentPath, '.sequelizerc'))
        const getConfig = sequelizerc.config
        dbConfig = await getConfig
        let databaseLoaded = await sequelize.load(dbConfig, { associate: false })
        db = databaseLoaded.db
      } else {
        throw new Error('Semo sequelize do not know db connection.')
      }
    }

    const queryInterface = db.getQueryInterface()
    const tables = await queryInterface.showAllTables()

    tables.forEach(function(table: string) {
      console.log(table)
    })
    process.exit(0)
  } catch (e) {
    Utils.error(e.stack)
  }
}

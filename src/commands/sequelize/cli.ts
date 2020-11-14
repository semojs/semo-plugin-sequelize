import DSNParser from '../../common/DSNParser'
import fs from 'fs'
import path from 'path'
import { UtilsType } from '@semo/core'
import { DatabaseLoader } from '../../common/DatabaseLoader'

export const plugin = 'sequelize'
export const command = 'cli [dbKey]'
export const desc = 'Connect with pgcli/mycli/sqlite3 connector'

export const builder = function(yargs: any) {
  yargs.option('db-key', { describe: 'Set db connection key', alias: 'key' })
}

export const handler = async function(argv: any) {
  const Utils:UtilsType = argv.$semo.Utils
  const dbKey = Utils.pluginConfig('defaultConnection', argv.dbKey)
  let dbConfig
  
  try {
    const { sequelize } = await Utils.invokeHook<{ sequelize: DatabaseLoader }>('semo:component')
    if (dbKey) {
      dbConfig = await sequelize.getConfig(dbKey)
    } else {
      const currentPath = process.cwd()
      if (fs.existsSync(path.resolve(currentPath, '.sequelizerc'))) {
        const sequelizerc = require(path.resolve(currentPath, '.sequelizerc'))
        if (Utils._.isString(sequelizerc.config)) {
          const getConfig = require(sequelizerc.config)
          dbConfig = await getConfig
        } else {
          dbConfig = sequelizerc.config
        }
      } else {
        throw new Error('Semo sequelize do not know db connection.')
      }
    }
  } catch (e) {
    Utils.error(e.stack)
  }

  if (Utils._.isString(dbConfig)) {
    let parser = new DSNParser(dbConfig)
    dbConfig = parser.getParts()
  }

  let cmd 
  let connectionString
  if (dbConfig.dialect === 'sqlite') {
    if (!dbConfig.storage) {
      Utils.error('sqlite storage config not exist!')
      return
    }
    cmd = 'sqlite3'
    connectionString = dbConfig.storage
    
  } else {
    cmd = dbConfig.dialect === 'mysql' || dbConfig.port === 3306 ? 'mycli' : 'pgcli'

    if (!Utils.shell.which(cmd)) {
      Utils.error(`Sorry, ${cmd} needs to be installed first!`)
    }

    // This feature require port to be in config explicitly
    if (!dbConfig.username || !dbConfig.host || !dbConfig.port || !dbConfig.database) {
      Utils.error('Db config in Consul is missing some key info! (host, port, database, username are required)')
    }

    const dialect = dbConfig.dialect || (cmd === 'mycli' ? 'mysql' : 'postgres')
    connectionString = `${dialect}://${dbConfig.username}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`
    
  }

  if (!Utils.shell.which(cmd)) {
    Utils.error(`Command ${cmd} not found, please install it first!`)
    return
  }

  Utils.exec(`${cmd} '${connectionString}'`)

  
}

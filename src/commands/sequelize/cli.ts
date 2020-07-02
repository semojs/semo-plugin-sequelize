import DSNParser from '../../common/DSNParser'

export const plugin = 'sequelize'
export const command = 'cli'
export const desc = 'Connect with pgcli/mycli/sqlite3 connector'

export const builder = function(yargs: any) {
  yargs.option('db-key', { describe: 'Set db connection key', alias: 'key' })
}

export const handler = async function(argv: any) {
  const { Utils } = argv.$semo
  const dbKey = Utils.pluginConfig('defaultConnection')
  const { sequelize } = await Utils.invokeHook('component')
  let dbConfig = await sequelize.db.getConfig(dbKey)

  if (!dbConfig) {
    Utils.error('Invalid db key!')
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

  Utils.exec(`${cmd} ${connectionString}`)

  
}

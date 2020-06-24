export const command = 'list'
export const desc = 'List all table of specific database'
export const aliases = ['l', 'ls']

export const builder = function(yargs: any) {
  yargs.option('db-key', { describe: 'Set db connection key', alias: 'key' })
}

export const handler = async function(argv: any) {
  const { Utils } = argv.$semo
  const dbKey = Utils.pluginConfig('defaultConnection', argv.dbKey)

  try {
    const { sequelize } = await Utils.invokeHook('component')
    let { db } = await sequelize.db.load(dbKey)

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

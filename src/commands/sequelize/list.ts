import { Utils } from '@semo/core'

export const command = 'list <dbKey>'
export const desc = 'List all table of specific database'
export const aliases = ['l', 'ls']

export const builder = function(yargs: any) {}

export const handler = async function(argv: any) {
  try {
    const { sequelize } = await Utils.invokeHook('component')
    let { db } = await sequelize.db.load(argv.dbKey)

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

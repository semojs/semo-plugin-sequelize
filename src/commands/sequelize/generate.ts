import fs from 'fs'
import path from 'path'
import * as migration from '../../common/migration'

export const command = 'generate <tableName> [fieldName]'
export const desc = 'Sequelize db migration generator'
export const aliases = ['g', 'create']

export const builder = function(yargs: any) {
  yargs.option('db-key', { describe: 'Set db connection key', alias: 'key' })
  yargs.option('attributes', { default: false, describe: 'Define attributes for table/field', alias: 'attrs' })
  yargs.option('rename', { describe: 'Rename table/field name' })
  yargs.option('modify', { describe: 'Modify field defination' })
  yargs.option('disable-timestamps', { describe: 'Do not add createdAt and updatedAt fields when creating table' })

  yargs.option('only-up', { describe: 'Empty down process' })
  yargs.option('simulate', { describe: 'Only output in stdout', alias: 'dry-run' })
  yargs.option('reverse', { describe: 'Reverse up and down' })
  yargs.option('migration-dir', { default: false, describe: 'Migration dir' })

  yargs.option('file-suffix', {
    default: false,
    describe: 'Migration file suffix name, override the auto generated name'
  })
  yargs.option('index', { describe: 'Add index' })

  yargs.option('typescript', { describe: 'Typescript format migration file', alias: 'ts' })
}

export const handler = async function(argv: any) {
  const { Utils } = argv.$semo
  const dbKey = Utils.pluginConfig('defaultConnection', argv.dbKey)

  try {
    const { sequelize } = await Utils.invokeHook('component')
    let { db } = await sequelize.db.load(dbKey)
    const dbConfig = await sequelize.db.getConfig(dbKey)

    let tableName =
      dbConfig.prefix && argv.tableName.indexOf(dbConfig.prefix) !== 0
        ? dbConfig.prefix + argv.tableName
        : argv.tableName

    let code
    if (argv.fieldName) {
      code = await migration.genMigrationForField(tableName, argv.fieldName, db, dbConfig, argv)
    } else {
      code = await migration.genMigrationForTable(tableName, db, dbConfig, argv)
    }

    const migrationDir = argv.migrationMakeDir || argv.migrationDir
    if (!migrationDir) {
      Utils.error('"migrationDir" missing in config file!')
    }
    Utils.fs.ensureDirSync(migrationDir)
    
    if (argv.simulate) {
      console.log(code)
    } else {
      const fileName = migration.genFileSuffix(argv)
      const filePrefix = Utils.day().format('YYYYMMDDHHmmssSSS')
      const migrationFile = path.resolve(
        migrationDir,
        `${filePrefix}_${Utils._.kebabCase(fileName)}.${argv.typescript ? 'ts' : 'js'}`
      )
      if (fs.existsSync(migrationFile)) {
        Utils.error('File exist!')
      }

      if (!fs.existsSync(migrationFile)) {
        fs.writeFileSync(migrationFile, code)
        console.log(Utils.chalk.green(`${migrationFile} created!`))
      }
    }

    process.exit(0)
  } catch (e) {
    Utils.error(e.stack)
  }
}

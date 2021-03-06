import { parse, stringify } from 'node-sqlparser'
import fs from 'fs'
import path from 'path'
import { UtilsType } from '@semo/core'
import { DatabaseLoader } from '../../common/DatabaseLoader'

const MAX_FIELDS_RENDER_TABLE = 6
const MAX_SELECT_ROWS = 1000

export const plugin = 'sequelize'
export const command = 'query <sql> [dbKey]'
export const desc = 'Execute SQL, only support SELECT'
export const aliases = ['q']

export const builder = function(yargs: any) {
  yargs.option('db-key', { describe: 'Set db connection key', alias: 'key' })
  yargs.option('fields', { describe: 'pick fields from query results' })
  yargs.option('pipe', { describe: 'output result using TSV format' })
  yargs.option('raw', { describe: 'output raw result' })
  yargs.option('header', { default: true, describe: 'show fields header or not' })
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
        if (Utils._.isString(sequelizerc.config)) {
          const getConfig = require(sequelizerc.config)
          dbConfig = await getConfig
        } else {
          dbConfig = sequelizerc.config
        }
        let databaseLoaded = await sequelize.load(dbConfig, { associate: false })
        db = databaseLoaded.db
      } else {
        throw new Error('Semo sequelize do not know db connection.')
      }
    }

    let ast
    try {
      ast = parse(argv.sql)
      if (ast.type && ast.type !== 'select') {
        Utils.error('Only support select statement query!')
      }
    } catch (e) {
      Utils.error(e.message)
    }

    if (ast.limit) {
      if (ast.limit[1].value > MAX_SELECT_ROWS) {
        Utils.error('Your query limitation must be less than 1000!')
      }

      if (ast.limit[0].value !== 0) {
        Utils.error('Limitation offset not supported!')
      }
    } else {
      ast.limit = [{ type: 'number', value: 0 }, { type: 'number', value: '10' }]
    }

    const sql = stringify(ast, { offset: false })
    const results = await db.query(sql, {
      type: db.QueryTypes.SELECT
    })

    if (results.length > 0) {
      const fields = argv.fields ? argv.fields.replace(/,/g, ' ').split(/\s+/) : Object.keys(results[0])
      const filteredResults = results.map(function(row: any) {
        let newRow: any = {}
        Object.keys(row).forEach(function(field) {
          if (fields.indexOf(field) > -1) {
            newRow[field] = row[field]
          }
        })
        return newRow
      })

      if (argv.raw) {
        Utils.log(filteredResults)
      }
      else if (argv.pipe) {
        filteredResults.forEach(function(row: any) {
          console.log(
            fields
              .map(function(field: string) {
                return row[field]
              })
              .join('\t')
          )
        })
      } else {
        if (fields.length > MAX_FIELDS_RENDER_TABLE) {
          Utils.log(filteredResults)
        } else {
          let rows = argv.header ? [fields.map(item => Utils.chalk.green.bold(item))] : []
          filteredResults.forEach(function(row: any) {
            rows.push(
              fields.map(function(field: string) {
                return row[field]
              })
            )
          })
          Utils.outputTable(rows)
        }
      }
    } else {
      argv.pipe || Utils.warn('Query result is empty!')
    }

    process.exit(0)
  } catch (e) {
    Utils.error(e.stack)
  }
}

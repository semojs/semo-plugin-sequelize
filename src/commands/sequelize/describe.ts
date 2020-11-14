import { Utils } from '@semo/core'
import fs from 'fs'
import path from 'path'
import { UtilsType } from '@semo/core'
import { DatabaseLoader } from '../../common/DatabaseLoader'

const getPostgresFieldsCommentContent = async (db: any, tableName: string) => {
  const result = await db.query(
    'SELECT A.attnum,' +
      ' A.attname AS name,' +
      ' format_type ( A.atttypid, A.atttypmod ) AS type,' +
      ' A.attnotnull AS notnull,' +
      ' COALESCE ( P.indisprimary, FALSE ) AS primarykey,' +
      ' pg_get_expr(f.adbin, f.adrelid) AS defaultvalue,' +
      ' d.description AS comment ' +
      ' FROM' +
      ' pg_attribute' +
      ' A LEFT JOIN pg_index P ON P.indrelid = A.attrelid ' +
      ' AND A.attnum = ANY ( P.indkey )' +
      ' LEFT JOIN pg_description d ON d.objoid = A.attrelid ' +
      ' AND d.objsubid = A.attnum' +
      ' LEFT JOIN pg_attrdef f ON f.adrelid = A.attrelid ' +
      ' AND f.adnum = A.attnum ' +
      ' WHERE' +
      ' A.attnum > 0 ' +
      ' AND NOT A.attisdropped ' +
      ` AND A.attrelid = '${tableName}' :: regclass -- table may be schema-qualified ORDER BY A.attnum;`,
    {
      type: db.QueryTypes.SELECT
    }
  )
  const set = new Set()
  return result
    .map((item: any) => {
      let content: any = {}

      // 内容
      content.key = item.name
      if (set.has(item.name)) {
        return null
      }
      set.add(item.name)
      // 注释
      content.comment = item.comment
      if (content.key === 'createdAt') {
        content.comment = '创建时间'
      }
      if (content.key === 'updatedAt') {
        content.comment = '更新时间'
      }
      if (content.key === 'deletedAt') {
        content.comment = '删除时间'
      }

      // 类型转换映射,如果说枚举值不够后续再修改
      switch (item.type) {
        case 'integer':
          content.type = 'number'
          break
        case 'text':
          content.type = 'text'
          break
        case 'json':
          content.type = 'json'
          break
        case 'integer[]':
          content.type = 'number[]'
          break
        case 'text[]':
          content.type = 'text[]'
          break
        default:
          if (/timestamp/.test(item.type)) {
            content.type = 'date'
          } else if (/character/.test(item.type)) {
            let length = item.type.match(/\d+/)[0]
            content.type = length ? `text(${length})` : 'text'
          } else if (/boolean/.test(item.type)) {
            content.type = 'boolean'
          } else if (/double/.test(item.type)) {
            content.type = 'double'
          } else if (/float/.test(item.type)) {
            content.type = 'float'
          }
      }

      // 可以为空
      content.require = item.notnull ? true : false
      content.primaryKey = item.primarykey ? true : false
      content.defaultValue =
        item.defaultvalue && `${item.defaultvalue}_`.indexOf('nextval') !== -1 ? '默认自增' : item.defaultvalue
      return content
    })
    .filter(Utils._.identity)
}

export const plugin = 'sequelize'
export const command = 'describe <tableName> [dbKey]'
export const desc = 'Sequelize db table describe'
export const aliases = ['d', 'desc']

export const builder = function(yargs: any) {
  yargs.option('db-key', { describe: 'Set db connection key', alias: 'key' })
  yargs.option('quiet', { describe: 'Only show field name', alias: 'q' })
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

    const queryInterface = db.getQueryInterface()
    const tables = await queryInterface.showAllTables()

    let tableName = argv.tableName

    // If support this feature, dbConfig should include prefix
    if (tables.indexOf(tableName) === -1 && dbConfig.prefix) {
      tableName = dbConfig.prefix + tableName
      if (tables.indexOf(tableName) === -1) {
        Utils.error('Table not found')
      }
    }

    const tableDescribed = await queryInterface.describeTable(tableName)
    let fieldsCommentContent: any
    if (dbConfig.dialect === 'postgresql' || dbConfig.dialect === 'postgres') {
      fieldsCommentContent = await getPostgresFieldsCommentContent(db, tableName)
    }

    let outputTable = [['field', 'type', 'allowNull', 'defaultValue', 'primaryKey', 'comment'].map(item => Utils.chalk.green.bold(item))]
    Object.keys(tableDescribed).forEach(function(field) {
      const info = tableDescribed[field]
      const foundField = fieldsCommentContent && Utils._.find(fieldsCommentContent, { key: field })
      const line = [field, info.type, info.allowNull, info.defaultValue, info.primaryKey]

      if (foundField) {
        line.push(foundField.comment ? foundField.comment : '')
      } else {
        line.push('')
      }

      outputTable.push(line)
    })

    if (argv.quiet) {
      outputTable.slice(1).forEach(function(field) {
        console.log(field[0])
      })
    } else {
      Utils.outputTable(outputTable)
    }

    process.exit(0)
  } catch (e) {
    Utils.error(e.stack)
  }
}

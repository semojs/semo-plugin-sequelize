import { Sequelize, Op } from 'sequelize'
import { Utils } from '@semo/core'

import DSNParser from './DSNParser'

class DatabaseLoader {
  lastInstance: any
  options: { [propName: string]: any }
  instances: { [propName: string]: any }
  constructor(options: { [propName: string]: any }) {
    this.options = Object.assign(
      {},
      {
        readonly: false
      },
      options
    )
    this.instances = {}
  }

  get Sequelize() {
    return Sequelize
  }

  get Op(): typeof Op {
    return Op
  }

  get defaultConnection() {
    const appConfig = Utils.getApplicationConfig()
    return Utils._.get(appConfig, 'semo-plugin-sequelize.defaultConnection')
  }

  async getConfigs() {
    const appConfig = Utils.getApplicationConfig()
    const rcSequelizeConfig = Utils._.get(appConfig, 'semo-plugin-sequelize.connection')
    const hookSequelizeConfig = await Utils.invokeHook('sequelize_connection')
    const finalSequelizeConfig = Utils._.merge(rcSequelizeConfig, hookSequelizeConfig)
    return finalSequelizeConfig
  }

  async getConfig(dbKey) {
    const dbConfigs = await this.getConfigs()

    const dbConfig = dbConfigs[dbKey]
    if (!dbConfig) {
      throw new Error(`${dbKey} not found in db config`)
    }

    return dbConfig
  }

  // Load database instance by db key
  async load(dbKey: string | { [propName: string]: any }, opts: any = {}) {
    let that: DatabaseLoader = this
    opts = Utils._.merge({
      raw: undefined,
      logging: undefined,
      modelKey: ''
    }, opts)

    try {
      const instanceKey: string = Utils._.isString(dbKey) ? <string>dbKey : Utils.md5(JSON.stringify(dbKey))

      // init db only once
      if (that.instances[instanceKey]) {
        return { db: that.instances[instanceKey], models: that.instances[instanceKey].models, instance: that}
      }

      let dbConfig: any
      if (Utils._.isObject(dbKey)) {
        dbConfig = dbKey
      } else {
        dbConfig = await this.getConfig(dbKey)
      }

      if (!dbConfig) {
        throw new Error('dbKey not exist')
      }

      let sequelize
      if (Utils._.isObject(dbConfig)) {
        opts = Utils._.merge(dbConfig, opts)
      } else if (Utils._.isString((dbConfig))) {
        let parser = new DSNParser(dbConfig)
        dbConfig = parser.getParts()
        opts = Utils._.merge(dbConfig, opts)
      }

      
      if (!Utils._.isNull(opts.raw)) {
        if (opts.query && Utils._.isObject(opts.query)) {
          opts.query.raw = opts.row
        } else {
          opts.query = { raw: opts.raw }
        }
      }

      sequelize = new Sequelize(opts)

      function forbiddenMethod() {
        throw new Error('Dangerous method forbidden!')
      }

      // 防止误操作，删除、清空整个库
      sequelize.drop = forbiddenMethod // 删除所有的表
      sequelize.truncate = forbiddenMethod // 清空所有的表
      sequelize.dropAllSchemas = forbiddenMethod // 删除所有的 postgres schema，即删掉整个数据库
      sequelize.dropSchema = forbiddenMethod // 删除一个 postgres schema，一般也相当于删掉整个数据库

      await sequelize.authenticate()

      that.instances[instanceKey] = sequelize
      that.lastInstance = sequelize

      const queryInterface = sequelize.getQueryInterface()
      const tables = await queryInterface.showAllTables()
      const tableInfos = await Promise.all(
        tables.map((table: string) => {
          return queryInterface.describeTable(table).catch(() => false);
        })
      )

      const combinedTableInfos = Utils._.zipObject(tables, tableInfos)
      Object.keys(combinedTableInfos).forEach(table => {
        const tableInfo: any = combinedTableInfos[table]
        if (!tableInfo) return
        const newTableInfo: { [propName: string]: any } = {}
        const newTableFields: any[] = []
        let tableAutoIncrementFieldExisted = false
        Object.keys(tableInfo).map(field => {
          const newField = field.replace(/(_.)/g, function(word) {
            return word[1].toUpperCase()
          })

          tableInfo[field].field = field

          // Only one autoincrement field allowed, we should put autoIncrement at the first of the table
          if (tableAutoIncrementFieldExisted && tableInfo[field].autoIncrement) {
            delete tableInfo[field].autoIncrement
          }

          // for PG, check autoIncrement rule
          if (/^nextval\(.*?::regclass\)$/.test(tableInfo[field].defaultValue)) {
            delete tableInfo[field].defaultValue
            tableInfo[field].autoIncrement = true
            tableAutoIncrementFieldExisted = true
          }

          newTableInfo[newField] = tableInfo[field]
          newTableFields.push(newField)
        })

        if (!tableAutoIncrementFieldExisted && newTableInfo.id) {
          newTableInfo.id.allowNull = true
        }

        const modelName =
          table.indexOf(dbConfig.prefix) > -1
            ? table.substring(dbConfig.prefix.length).replace(/(_.)/g, function(word) {
                return word[1].toUpperCase()
              })
            : table.replace(/(_.)/g, function(word) {
                return word[1].toUpperCase()
              })
        const modelNameUpper = modelName.replace(/( |^)[a-z]/g, L => L.toUpperCase())
        try {
          let options: any = {
            tableName: table,
            modelName: modelNameUpper,
            sequelize
          }

          if (newTableFields.indexOf('createdAt') === -1) {
            options.createdAt = false
          } else {
            options.createdAt = newTableInfo['createdAt'].field
          }

          if (newTableFields.indexOf('updatedAt') === -1) {
            options.updatedAt = false
          } else {
            options.updatedAt = newTableInfo['updatedAt'].field
          }

          const appConfig = Utils.getApplicationConfig()
          const modelDir = appConfig.modelDir
          let model, modelFilePath

          if (modelDir) {
            try {
              modelFilePath = require.resolve(`${modelDir}/${opts.modelKey ? opts.modelKey + '/' : ''}${modelNameUpper}`)
            } catch (e) {
              if (e.code !== 'MODULE_NOT_FOUND') {
                console.error(e.message)
              }
            }
            if (Utils._.isString(modelDir) && modelFilePath && Utils.fs.existsSync(modelFilePath)) {
              model = (require(modelFilePath)).init(newTableInfo, options)
            } else {
              model = sequelize.define(modelNameUpper, newTableInfo, options)
            }
          } else {
            model = sequelize.define(modelNameUpper, newTableInfo, options)
          }
         

          model.drop = forbiddenMethod // 以防误删表
          model.sync = forbiddenMethod

          if (that.options.readonly && Utils.getNodeEnv() === 'production') {
            model.upsert = forbiddenMethod
            model.truncate = forbiddenMethod
            model.destroy = forbiddenMethod
            model.restore = forbiddenMethod
            model.update = forbiddenMethod
            model.create = forbiddenMethod
            model.findOrCreate = forbiddenMethod
            model.bulkCreate = forbiddenMethod
            model.removeAttribute = forbiddenMethod
          }
        } catch (e) {
          Utils.warn(e.message)
        }
      })

      // trigger association
      Object.keys(sequelize.models).forEach(function (modelName) {
        let model: any = sequelize.models[modelName]
        if (Utils._.isFunction(model.associate)) {
          model.associate(sequelize.models)
        }
      })

      return { db: that.instances[instanceKey], models: that.instances[instanceKey].models, instance: that}
    } catch (e) {
      throw new Error(e.stack)
    }
  }

}

export = DatabaseLoader

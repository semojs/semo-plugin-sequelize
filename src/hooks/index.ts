import { Utils } from '@semo/core'
import DatabaseLoader from '../common/DatabaseLoader'

export const hook_hook = new Utils.Hook('semo', {
  connection: 'Define db connections, used by Sequelize'
})

export const hook_repl: any = new Utils.Hook('semo', () => {
  const dbLoaderForRepl = new DatabaseLoader({
    readonly: true
  })

  
  return {
    sequelize: {
      db: dbLoaderForRepl,
      Op: dbLoaderForRepl.Op,
      Sequelize: dbLoaderForRepl.Sequelize
    }
  }
})

export const hook_component: any = new Utils.Hook('semo', () => {
  const dbLoaderForComponent = new DatabaseLoader({
    readonly: false
  })

  return {
    sequelize: {
      db: dbLoaderForComponent,
      Op: dbLoaderForComponent.Op,
      Sequelize: dbLoaderForComponent.Sequelize
    }
  }
})

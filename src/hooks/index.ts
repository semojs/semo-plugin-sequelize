import DatabaseLoader from '../common/DatabaseLoader'

export const hook_hook = {
  sequelize_connection: 'Define db connections, used by Sequelize'
}

export const hook_repl: any = () => {
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
}

export const hook_component: any = () => {
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
}

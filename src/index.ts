import DatabaseLoader from './common/DatabaseLoader'

const dbLoaderForComponent = new DatabaseLoader({
  readonly: false
})

export const sequelize: any = dbLoaderForComponent 
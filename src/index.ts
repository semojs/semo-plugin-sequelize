import DatabaseLoader from './common/DatabaseLoader'

const dbLoaderForComponent = new DatabaseLoader({
  readonly: false
})

export const sequelize: any = {
  db: dbLoaderForComponent,
  Op: dbLoaderForComponent.Op,
  Sequelize: dbLoaderForComponent.Sequelize
}
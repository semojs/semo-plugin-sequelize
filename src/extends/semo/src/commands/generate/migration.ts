import * as migrationCommand from '../../../../../commands/sequelize/generate'

export const command = 'migration <dbKey> <tableName> [fieldName]'
export const desc = 'Generate a Sequelize migration'
export const aliases = ['mig']

export const builder = migrationCommand.builder
export const handler = migrationCommand.handler

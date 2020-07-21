import * as migrationCommand from '../../../../../commands/sequelize/generate'

export const plugins = 'sequelize'
export const command = 'migration <tableName> [fieldName]'
export const desc = 'Generate a Sequelize migration'
export const aliases = ['mig']

export const builder = migrationCommand.builder
export const handler = migrationCommand.handler

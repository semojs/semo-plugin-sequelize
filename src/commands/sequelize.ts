import { Utils } from '@semo/core'

export const command = 'sequelize <op>'
export const desc = 'Sequelize tools'
export const aliases = 'sql'

export const builder = function(yargs: any) {
  Utils.extendSubCommand('sequelize', 'semo-plugin-sequelize', yargs, __dirname)
}

export const handler = function(argv: any) {}

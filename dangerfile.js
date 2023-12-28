/* global schedule, warn, message */
import { defaultTo, includes, uniq } from 'ramda'
import { existsSync } from 'fs'

import npmOutdated from 'danger-plugin-npm-outdated'
import spellcheck from 'danger-plugin-spellcheck'
import dependencies from '@seadub/danger-plugin-dependencies'
import todos from 'danger-plugin-todos'

const wrapLink = (link, name) => `<a href="${link}">${name}</a>`

const run = async () => {
  if (!danger.github) {
    return
  }

  try {
    const path = process.env.PWD + '/dangerfile.local.js'
    if (existsSync(path)) {
      const locallyDefinedCommands = await import(path).default
      schedule(locallyDefinedCommands)
    }
  } catch (err) {
    console.error(err)
  }

  const hasPackageChanges = includes('package.json', danger.git.modified_files)
  const hasLockfileChanges = includes('package-lock.json', danger.git.modified_files)
  if (hasPackageChanges && !hasLockfileChanges) {
    warn('There are package.json changes with no corresponding lockfile changes!')
  }

  schedule(npmOutdated())
  schedule(dependencies({ type: 'npm' }))

  schedule(todos())

  spellcheck()

  const prTitle = danger.github.pr.title
  const ticketPattern = /FG-\d+/g
  const foundTicketInTitle = ticketPattern.test(prTitle)
  if (!foundTicketInTitle) {
    warn('🔍 I can\'t find a JIRA ticket in the PR title.')
  }

  const prBody = danger.github.pr.body

  const prText = prTitle + prBody
  const tickets = uniq(defaultTo([], prText.match(ticketPattern)))
  tickets.forEach(ticket => {
    const ticketURL = `https://yourguru.atlassian.net/browse/${ticket}`
    message(`JIRA link: ${wrapLink(ticketURL, ticket)}`)
  })

  // const reviewersCount = danger.github.requested_reviewers.users.length
  // if (reviewersCount === 0) {
  //   warn(`🕵I don't see any reviewers. Remember to add on so that they are notified.`)
  // }

  if (danger.github.pr.deletions > danger.github.pr.additions) {
    message('👏 More lines deleted than added. Thanks for keeping FitGrid lean!')
  }
}

export default run

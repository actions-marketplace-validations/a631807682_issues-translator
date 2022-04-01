import * as core from '@actions/core'
import * as github from '@actions/github'
import {EventType, Option} from './parse'
import type {IssueCommentEvent, IssuesEvent} from '@octokit/webhooks-types'
import {containsChinese, translate2English} from './translate'
import {Octokit} from '@octokit/rest'

export async function translateIssue(t: EventType, opt: Option): Promise<void> {
  core.info(`translateIssue event type: ${t}`)
  const {owner, repo} = github.context.repo

  if (t === EventType.IssueOpened) {
    if (opt.ModifyCommentSwitch) {
      // translate issue body
      const issueCommentPayload = github.context.payload as IssueCommentEvent
      const issueNumber = issueCommentPayload.issue.number
      const originComment = issueCommentPayload.issue.body

      await translateComment(
        owner,
        repo,
        opt.GithubToken,
        opt.CommentNote,
        issueNumber,
        originComment
      )
    }

    if (opt.ModifyTitleSwitch) {
      // translate issue title
      const issuePayload = github.context.payload as IssuesEvent
      const issueNumber = issuePayload.issue.number
      const originTitle = issuePayload.issue.title
      await translateTitle(
        owner,
        repo,
        opt.GithubToken,
        issueNumber,
        originTitle
      )
    }
  } else if (opt.ModifyCommentSwitch) {
    // translate issue comment body
    const issueCommentPayload = github.context.payload as IssueCommentEvent
    const issueNumber = issueCommentPayload.issue.number
    const originComment = issueCommentPayload.comment.body

    await translateComment(
      owner,
      repo,
      opt.GithubToken,
      opt.CommentNote,
      issueNumber,
      originComment
    )
  }
}

async function translateComment(
  owner: string,
  repo: string,
  token: string,
  note: string,
  issueNumber: number,
  originComment: string | null
): Promise<void> {
  // chinese less than than 20%
  if (!containsChinese(originComment, 0.2)) {
    return
  }

  const targetComment = await translate2English(originComment)
  core.info(
    `translate issues comment: ${targetComment} origin: ${originComment}`
  )

  const octokit = new Octokit({
    auth: token
  })

  const res = await octokit.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body: `
    > ${note}
    ----
    ${targetComment}
    `
  })

  core.info(`create issue comment status:${res.status}`)
}

async function translateTitle(
  owner: string,
  repo: string,
  token: string,
  issueNumber: number,
  originTitle: string
): Promise<void> {
  // has chiness
  if (!containsChinese(originTitle, 0)) {
    return
  }

  const targetTitle = await translate2English(originTitle)
  core.info(`translate issues title: ${targetTitle} origin: ${originTitle}`)

  const octokit = new Octokit({
    auth: token
  })

  const res = await octokit.issues.update({
    owner,
    repo,
    issue_number: issueNumber,
    title: targetTitle
  })

  core.info(`change issue title status:${res.status}`)
}

const yaml = require('js-yaml'),
  moment = require('moment'),
  fs = require('fs')

const issues = {}
issues.create = async (github, tmplName, userName, repoName, tmplValues) => {
  let tmpl = yaml.safeLoad(fs.readFileSync(`${__dirname}/../.github/template/${tmplName}.yml`, 'utf8'))
  if (tmplValues) {
    tmpl.title = Object.keys(tmplValues)
      .reduce((r, e) => {
        return r.replace(`{{${e}}}`, tmplValues[e])
      }, tmpl.title)
    tmpl.body = Object.keys(tmplValues)
      .reduce((r, e) => {
        return r.replace(`{{${e}}}`, tmplValues[e])
      }, tmpl.body)
  }
  const config = {
    owner: repoName[0].split('/')[0],
    repo: repoName[0].split('/')[1],
    title: tmpl.title,
    body: tmpl.body,
    assignees: [userName]
  }
  return github.issues.create(config)
}

const release = {}
release.create = async (github, userName, repoName, fileInfo) => {
  // 1. Create new release format : YYMMDD.HH.mm
  // 2. Check if "latest" tag exist
  // 2A. If the "latest" tag doesn't exist create it
  // 3. Transform the chunk
  // 4. Upload on the tag
  // 5. (Tweet to the userShare

  var tag_name = moment().format('YYMMDD.HH.mm')
  const _repo = repoName.split('/')
  const config = {
    owner: _repo[0],
    repo: _repo[1],
    tag_name,
    name: 'v' + tag_name,
    body: tag_name
  }

  try {
    var release = await github.repos.createRelease(config)
    const configLatest = {
      owner: config.owner,
      repo: config.repo,
      tag: 'latest'
    }
    try {
      var latest = await github.repos.getReleaseByTag(configLatest)
    } catch (e) {
      if (e.code === 404) {
        tag_name = 'latest'
        const newConfigLatest = {
          owner: config.owner,
          repo: config.repo,
          tag_name,
          name: 'Latest version',
          body: 'Release that keeps the last version up to date as an asset.'
        }
        latest = await github.repos.createRelease(newConfigLatest)
      }
    }
  } catch (error) {
    error.label = 'Impossible to create the release ' + tag_name
    throw error
  }

  // Delete the asset from the latest tag
  const deletes = latest.data.assets.map(asset => {
    const delConfig = {
      owner: config.owner,
      repo: config.repo,
      id: asset.id
    }
    return github.repos.deleteAsset(delConfig).catch(_ => _)
  })

  const resultDelete = await Promise.all(deletes)
  const deleteFailures = resultDelete.filter(result => (result.name || '').match(/error$/i))

  if (deleteFailures.length) {
    const err = new Error()
    err.label = 'Impossible to delete the asset on the latest tag'
    err.errors = deleteFailures
    throw err
  }

  // upload the assets
  const uploads = fileInfo.map(info => {
    const buff = info.data
    const defaultConfig = {
      contentLength: buff.byteLength,
      contentType: 'application/pdf',
      file: buff,
      name: info.file.replace('tex', 'pdf'),
      label: info.file.replace('.tex', '')
    }

    return [
      release.data.upload_url,
      latest.data.upload_url
    ].map(url => github.repos.uploadAsset({url, ...defaultConfig}).catch(_ => _))
  }).reduce((r, a) => r.concat(a), [])

  const result = await Promise.all(uploads)

  const resultFailures = result.filter(result => (result.name || '').match(/error$/i))
  if (resultFailures.length) {
    const tmplValues = { errors: resultFailures.map(_ => _.message)}
    issues.create(github, 'issue_uploadFailure', userName, [repoName], tmplValues)
  }
}

const pullRequest = {}
pullRequest.setupResume = () => {
  // Get files
  // Push file to setup branch
  // create pull request
}

module.exports = {
  issues,
  release,
  pullRequest
}

const yaml = require('js-yaml'),
      fs   = require('fs');

const issues = {};
issues.create = async (github, tmplName, userName, repoName, tmplValues) => {
  let tmpl = yaml.safeLoad(fs.readFileSync(`${__dirname}/../.github/template/${tmplName}.yml`, 'utf8'));
  if (tmplValues) {
    tmpl.title = Object.keys(tmplValues)
      .reduce((r,e) => {
        return r.replace(`{{${e}}}`, tmplValues[e]);
      }, tmpl.title);
    tmpl.body = Object.keys(tmplValues)
      .reduce((r,e) => {
        return r.replace(`{{${e}}}`, tmplValues[e]);
      }, tmpl.body);
  }
  const config = {
    owner : repoName[0].split('/')[0],
    repo : repoName[0].split('/')[1],
    title : tmpl.title,
    body: tmpl.body,
    assignees : [userName]
  };
  return github.issues.create(config);
};

const release = {};
release.create = async (github, userName, repoName, fileInfo) => {
  /*
  const _repo = payload.repository.full_name.split('/')
  const config = {
    owner: _repo[0],
    repo: _repo[1],
    path: 'resume.tex',
    tag_name: moment().format('YYMMDD.HH.mm'),
    name: 'my First release',
    body: 'New update on the resume'

  }
  const buff = Buffer.from(chunk)
  const release = await github.repos.createRelease(config)
  const result = await github.repos.uploadAsset({
    url: release.data.upload_url,
    contentLength: buff.byteLength,
    contentType: 'application/pdf',
    file: buff,
    name: 'resume.pdf',
    label: 'resume'
  })
  robot.log(result)
  */
};

const pullRequest = {};
pullRequest.setupResume = () => {
  // Get files
  // Push file to setup branch
  // create pull request
};

module.exports = {
  issues,
  release,
  pullRequest,
};

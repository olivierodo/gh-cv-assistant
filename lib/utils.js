const yaml = require('js-yaml'),
      fs   = require('fs');

const issues = {};
issues.create = (github, tmplName, userName, repoName, tmplValues) => {
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

const pullRequest = {};
pullRequest.setupResume = () => {
  // Get files
  // Push file to setup branch
  // create pull request
};

module.exports = {
  issues,
  pullRequest,
};

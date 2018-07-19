module.exports = function (robot) {
  // -> STEPS 1 : Check if the action is created
  // @TODO : check if the action is added
  // -> STEPS 2 : Check if there is only one repository
  // -> STEPS 2-1 : If installed on organisation create issue
  // -> STEPS 3 : Check if the repository is public
  // -> STEPS 3-1 : If repo is private create an issue.
  // -> STEPS 4 : Check if the a resume is already on the repository
  // @TODO -> STEPS 4 : Check if the .github/cv-assistant exist in the repository
  // -> STEPS 4-1 : If the repo is empty, Creates an issue to initialize the project
  // -> STEPS 4-2 : Create a pull request with the cv sample (repo : https://github.com/olivierodo/...)

  return async context => {
    const {payload, github} = context

    if (payload.action !== 'created') return // check action : run script only on installation created

    if (payload.repositories && payload.repositories.length === 0) {
      throw new Error('Please specify a repository')
    };

    context.payload.repository = payload.repositories[0]
    context.payload.repository.owner = payload.sender

    if (payload.repositories.length !== 1) {
      const repos = payload.repositories.map(_ => _.full_name)
      robot.utils.issues.create(github, 'issue_multiple_repositories', payload.sender.login, repos)
      throw new Error('Multiple repositories found')
    };

    const repository = payload.repositories[0]

    if (repository.private === true) {
      robot.utils.issues.create(github, 'issue_private_repository', payload.sender.login, [repository.full_name])
      throw new Error('Private repositories found')
    }

    // @TODO :  Switch the follow code with a simple verification of .github/cv-assistant

    const config = {
      tree_sha: 'master'
    }

    const REGEXP_RESUME_FILE = /resume(-.*|)\.tex/
    const gitTree = await github.repos.getTree(config)
    const empty = gitTree.tree.filter(_ => _.path.match(REGEXP_RESUME_FILE)).length === 0

    if (empty) {
      robot.utils.issues.create(github, 'issue_empty_repository', payload.sender.login, [repository.full_name])
      robot.utils.pullRequest.setupResume(github, payload.sender.login, [repository.full_name])
    }
  }
}

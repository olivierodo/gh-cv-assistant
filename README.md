# PLEASE NOTE, THIS PROJECT IS NO LONGER BEING MAINTAINED

Refer to the version using the GITHUB ACTION 🚀 : https://github.com/olivierodo/Awesome-CV-action
---




# Github-CV-Assistant

> A GitHub App built with [probot](https://github.com/probot/probot) that support you to keep your resume up to date.

[![Build Status](https://travis-ci.org/olivierodo/gh-cv-assistant.svg?branch=master)](https://travis-ci.org/olivierodo/gh-cv-assistant)

## Description

Inspired by the project [Awesome-CV](https://github.com/posquit0/Awesome-CV) from [posquit0](https://github.com/posquit0).
I just tought it would be cool to have a pipeline to deploy your resume.

Basically everytime you will push a change on your Latex resume the bot will :
* compile your resume into a .pdf
* create a tag and a git release
* Upload the resume as a pdf to the release.

Then your resume will be accessible from everywhere to the url https://github.com/{OWNER}/{REPO}/releases/download/latest/resume.pdf

## Usage

1. Create a new repository or fork cv-awesome repo : my [sample here]()
2. Configure the GitHub App: [github.com/apps/cv-assistant](https://github.com/apps/cv-assistant)
3. Setup the preference by creating the file `.github/cv-assistant`
4. If the setting file doesn't exist the bot will propse a sample to you by creating a pull request


## Setup

```sh
# Install dependencies
npm install

# Run the bot
npm start
```

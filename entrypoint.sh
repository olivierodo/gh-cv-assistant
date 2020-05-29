#!/bin/bash

set -e

main() {
  echo "" # see https://github.com/actions/toolkit/issues/168

  sanitize "${INPUT_ACCESS_TOKEN}" "access_token"
  sanitize "${INPUT_FILE_NAME}" "file_name"

  TAG_NAME=v$(date +%m-%d-%Y.%H.%M)


  INPUT_EXTENSION="tex"
  OUTPUT_EXTENSION="pdf"
  OUTPUT_FILE=${INPUT_FILE_NAME/$INPUT_EXTENSION/$OUTPUT_EXTENSION}

  echo "=====> INPUTS <====="
  echo "FILE_NAME: $INPUT_FILE_NAME"
  echo "GENERATED TAG_NAME: $TAG_NAME"
  echo "GITHUB REPOSITORY: $GITHUB_REPOSITORY"
  echo "INPUT_EXTENSION: $INPUT_EXTENSION"
  echo "OUTPUT_EXTENSION: $OUTPUT_EXTENSION"
  echo "OUTPUT_FILE: $OUTPUT_FILE"
  echo "=====> / INPUTS <====="
  echo ""

  #xelatex.sh $INPUT_FILE_NAME



  createRelease $GITHUB_REPOSITORY $INPUT_ACCESS_TOKEN $TAG_NAME $OUTPUT_FILE

  if usesBoolean "${INPUT_LATEST_TAG}"; then
    cleanLatest $GITHUB_REPOSITORY $INPUT_ACCESS_TOKEN
    createRelease $GITHUB_REPOSITORY $INPUT_ACCESS_TOKEN "latest" $OUTPUT_FILE
  fi

}

cleanLatest() {
  echo "====> CLEANING LATEST RELEASE <===="
  LATEST_RELEASE_ID=$(curl -s -X GET --url https://api.github.com/repos/$1/releases/tags/latest --header "authorization: token $2" | jq -r ".id")
  if [ ! -z "${LATEST_RELEASE_ID}" ]; then
    curl -sS -X DELETE --url https://api.github.com/repos/$1/git/refs/tags/latest --header "authorization: token $2" 
    curl -sS -X DELETE --url https://api.github.com/repos/$1/releases/$LATEST_RELEASE_ID --header "authorization: token $2" 
  fi
}

createRelease() {
  
  echo "==> CREATE TAG $3"
  OUTPUT_TAG="$(curl -sS -X POST --url https://api.github.com/repos/$1/git/refs --header "authorization: token $2" --header 'content-type: application/json' \
  --data '{
    "ref": "refs/tags/'"$3"'",
    "sha": "'"$GITHUB_SHA"'"
  }')"
  responseHandler "$OUTPUT_TAG" 

  echo "===> CREATE RELEASE $3"
  OUTPUT_RELEASE="$(curl -sS -X POST --url https://api.github.com/repos/$1/releases --header "authorization: token $2" --header 'content-type: application/json' \
  --data '{
    "tag_name": "'"$3"'",
    "name": "'"$3"'",
    "body": "Description to see"
  }')"
  responseHandler "$OUTPUT_RELEASE" 
  RELEASE_ID=$(echo $OUTPUT_RELEASE | jq -r '.id')

  echo "====> UPLOAD ASSET TO RELEASE $RELEASE_ID ($3)"
  UPLOAD_URL="https://uploads.github.com/repos/$1/releases/$RELEASE_ID/assets?name=$4"
  OUTPUT_UPLOAD=$(curl -sS -X POST --header "authorization: token $2" --header 'content-type: application/pdf' --url $UPLOAD_URL -F "data=@$4")
  responseHandler "$OUTPUT_UPLOAD" 

  ASSET_URL="https://github.com/$1/releases/download/$3/$4"

  ROCKET_EMOJI="🚀"

  echo -e "=====> $ROCKET_EMOJI -> Your Document is available at the addres $ASSET_URL"
}

responseHandler() {
  if echo "${1}" | jq -e 'has("message")' > /dev/null; then
    MSG=$(echo ${1} | jq -r '.message')
    >&2 echo -e "-> ERROR the receive message is : \\n ${MSG}"
    exit 1
  fi
}

uses() {
  [ ! -z "${1}" ]
}

usesBoolean() {
  [ ! -z "${1}" ] && [ "${1}" = "true" ]
}

sanitize() {
  if [ -z "${1}" ]; then
    >&2 echo "Unable to find the ${2}. Did you set with.${2}?"
    exit 1
  fi
}

main

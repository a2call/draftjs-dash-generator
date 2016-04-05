#!/bin/bash

GITHUB_RELEASE_REPO=remko/draftjs-dash-generator
GITHUB_DASH_DOCSET=DraftJS
GITHUB_DASH_BRANCH=draft-js
GITHUB_DASH_REPO=remko/Dash-User-Contributions

#########################################################################

GITHUB_DASH_REPO_URL=git@github.com:$GITHUB_DASH_REPO
GIT_DIR=dash-user-contributions
DOCSET_DIR=docsets/$GITHUB_DASH_DOCSET

VERSION=`git describe --exact-match HEAD`
if [ $? -ne 0 ]; then
	echo "No tag set, skipping publish"
	exit 0
fi

USER_CONTRIBUTION_URL=https://github.com/$GITHUB_DASH_REPO/releases/download/$VERSION/user-contribution.zip

set -x -e

if [ ! -d "$GIT_DIR" ]; then
	git clone $GITHUB_DASH_REPO_URL $GIT_DIR
	git -C $GIT_DIR remote add upstream https://github.com/Kapeli/Dash-User-Contributions.git
fi
git -C $GIT_DIR fetch upstream
git -C $GIT_DIR reset --hard upstream/master
git -C $GIT_DIR checkout -B $GITHUB_DASH_BRANCH 

# Prepare user contribution
if [ ! -d "$GIT_DIR/$DOCSET_DIR" ]; then
	mkdir -p "$GIT_DIR/$DOCSET_DIR"
fi
pushd $GIT_DIR/$DOCSET_DIR
curl -O -L https://github.com/$GITHUB_RELEASE_REPO/releases/download/$VERSION/user-contribution.zip
unzip -o user-contribution.zip
rm user-contribution.zip
popd
cp README.dash.md $GIT_DIR/$DOCSET_DIR/README.md

# Commit user contribution
git -C $GIT_DIR add $DOCSET_DIR
git -C $GIT_DIR commit -m "Update $GITHUB_DASH_DOCSET to $VERSION"
git -C $GIT_DIR push --force $GITHUB_DASH_REPO_URL $GITHUB_DASH_BRANCH:$GITHUB_DASH_BRANCH
git -C $GIT_DIR push --force $GITHUB_DASH_REPO_URL master:master

# Open PR interface
open https://github.com/Kapeli/Dash-User-Contributions/compare/master...remko:$GITHUB_DASH_BRANCH?expand=1

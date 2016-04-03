#!/bin/bash

eval "$(ssh-agent -s)"
chmod 600 .travis/deploy-key.pem
ssh-add .travis/deploy-key.pem
echo 'put build/feed/*' | sftp -o StrictHostKeyChecking=no travis@el-tramo.be:files/dash

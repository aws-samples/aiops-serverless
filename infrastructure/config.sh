#!/bin/bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
#
SKIPINPUT=${1:-N}
echo CONFIGURING THE ENVIRONMENT
echo this must run from the 'infrastructure' folder
echo #############################
## installing
source ./update-upgrade-install.sh
## Calling the environment configuration

if [ "$SKIPINPUT" == "N" ]; then 
    source ../envname.sh 
else
    source ../envname.sh skipinput
fi

echo ### DONE
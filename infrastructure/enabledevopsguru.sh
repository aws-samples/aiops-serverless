#!/bin/bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
#
echo ENABLING AMAZON DEVOPS GURU
echo this must run from the 'infrastructure' folder
echo #############################
## configuring
aws devops-guru update-resource-collection --action ADD --resource-collection CloudFormation={StackNames=[$envname]} 
echo AMAZON DEVOPS GURU ENABLED
echo ### DONE
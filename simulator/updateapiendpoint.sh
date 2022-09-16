#!/bin/bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
##
# This script updates the simulator file with api endpoint
#
##
apigtw=$(eval $(echo "aws cloudformation list-exports --query 'Exports[?contains(ExportingStackId,\`$envname\`) && contains(Name,\`apigtw\`)].Value | [0]' --region ${AWS_REGION} | xargs -I {} echo {}"))
apigtw=${apigtw::-1}
echo Updating $apigtw
sed -i -r "s#<API End point>#$apigtw#" simulator.yaml     
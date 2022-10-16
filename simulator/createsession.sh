#!/bin/bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
#
SESSIONDATA=${1:-defaultSession}
echo Creating session
echo #############################
## creating
echo $SESSIONDATA
if [ $SESSIONDATA == "defaultSession" ]; then 
    currentDate="$(date '+%Y-%m-%dT%H:%M:%S.%3NZ')"
    echo $currentDate
    sessionId="$(date '+%Y-%m-%dT%H:%M:%S')"
    echo $sessionId
    sessionData="{\"GameType\":\"MULTIPLE_TRIALS\",\"SessionId\":\"$sessionId\",\"OpeningTime\":\"$currentDate\",\"TotalSeats\":150}" 
else
    sessionData=$SESSIONDATA
fi
aws ssm put-parameter --name "/$envnameLowercase/session" --type "String" --value "$sessionData" --overwrite --region ${AWS_REGION}
echo ### DONE
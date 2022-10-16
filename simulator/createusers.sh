#!/bin/bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
##
# This script creates test users with password
#
##
SKIPINPUT=${1:-N}
_DEBUG="on"

function DEBUG() {
    [ "$_DEBUG" == "on" ]  && $@
}

function removeQuotes() {
    retval=$1
    retval=${retval#\"}
    retval=${retval%\"}
    echo "$retval"
}

echo "**************************************************************"
echo "This function will create and signup players"
echo "**************************************************************"
echo

if [ "$SKIPINPUT" == "N" ]; then 
    read -p "Number of players:" players
else
    players=20
fi


echo "#### Creating users in AWS Cognito..."
echo "username,password,emailid" >> players.csv

for (( i = 1; i <= $players; i++ )); do
    userid="player$i"
    userpassword="player$i@password"
    emailid="player$i@example.com"
    
    echo "$userid,$userpassword,$emailid" >>players.csv

    echo "#### Creating the user $userid"
    getUserPoolId=$(echo "aws cognito-idp list-user-pools --query 'UserPools[?Name == \`"$envname"\`]|[0].Id' --max-results=20")
    userPoolId=$( removeQuotes $( eval $getUserPoolId ) )
    # create the user
    aws cognito-idp admin-create-user --user-pool-id $userPoolId --username $userid --user-attributes Name=email,Value=$emailid Name=email_verified,Value=true Name=website,Value=aws.amazon.com
    aws cognito-idp admin-enable-user --user-pool-id $userPoolId --username $userid
    aws cognito-idp admin-set-user-password --user-pool-id $userPoolId --username $userid --password $userpassword  --permanent
    # add the user to the manager's group
    aws cognito-idp admin-add-user-to-group --user-pool-id $userPoolId --username $userid --group-name Players
    # deploy the fromt-end    
done










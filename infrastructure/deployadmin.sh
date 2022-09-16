#!/bin/bash
##
# This script deploys the whole infrastructure (with cdn) and creates an
# admin user with the provided username and password
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
echo "This function will deploy the Under The Sea environment"
echo "creating an Admin using the username and password that"
echo "you will provide"
echo "**************************************************************"
echo
username="admin"
password="admin@123"
password2="admin@123"


if [ "$SKIPINPUT" == "N" ]; then 
    read -p "Admin username:" username
    read -s -p "Admin password:" password
    printf '\n'
    read -s -p "Confirm Admin password:" password2
    printf '\n'
fi


if [ "$password" != "$password2" ]; then 
    echo "Passwords are not the same. Please re-run the script again"
else
    echo "#### Deploying the environment..."
    cd cdk
    cdk deploy -c envname=$envname -c sessionparameter=true -c kinesisintegration=true -c firehose=true --require-approval never
    cd ..
    echo "#### Fixing Cognito..."
    echo 
    source fixcognito.sh
    echo "#### Creating the user $username with the provided password"
    getUserPoolId=$(echo "aws cognito-idp list-user-pools --query 'UserPools[?Name == \`"$envname"\`]|[0].Id' --max-results=20 --region ${AWS_REGION}")
    userPoolId=$( removeQuotes $( eval $getUserPoolId ) )
    echo "User pool Id"
    echo $userPoolId
    # create the user
    aws cognito-idp admin-create-user --user-pool-id $userPoolId --username $username --region ${AWS_REGION}
    aws cognito-idp admin-enable-user --user-pool-id $userPoolId --username $username --region ${AWS_REGION}
    aws cognito-idp admin-set-user-password --user-pool-id $userPoolId --username $username --password $password  --permanent --region ${AWS_REGION}
    # add the user to the manager's group
    aws cognito-idp admin-add-user-to-group --user-pool-id $userPoolId --username $username --group-name Managers --region ${AWS_REGION}
    # deploy the fromt-end
    echo "#### Deploying the front-end"
    source deploy.frontend.sh
    echo "#### DONE"
fi









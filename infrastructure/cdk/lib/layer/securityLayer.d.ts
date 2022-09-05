import { Construct } from 'constructs';
import { ResourceAwareConstruct, IParameterAwareProps } from './../resourceawarestack';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { Role } from 'aws-cdk-lib/aws-iam';
import Cognito = require('aws-cdk-lib/aws-cognito');
export declare class SecurityLayer extends ResourceAwareConstruct {
    userPool: Cognito.UserPool;
    identityPool: Cognito.CfnIdentityPool;
    userPoolClient: Cognito.UserPoolClient;
    playersRole: Role;
    managersRole: Role;
    unauthenticatedRole: Role;
    postRegistrationTriggerFunction: Function;
    postRegistrationTriggerFunctionRole: Role;
    getUserPoolId(): string;
    getUserPoolUrl(): string;
    getUserPoolArn(): string;
    getUserPoolClient(): Cognito.UserPoolClient;
    getUserPoolClientId(): string;
    getIdentityPool(): Cognito.CfnIdentityPool;
    getIdentityPoolId(): string;
    constructor(parent: Construct, name: string, props: IParameterAwareProps);
    private createUserPool;
    private createIdentityPool;
    private createUserPoolGroups;
    private configureIdentityPoolRoles;
    private creatPostRegistrationLambdaTrigger;
}

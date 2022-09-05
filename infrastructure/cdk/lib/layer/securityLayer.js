"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityLayer = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const resourceawarestack_1 = require("./../resourceawarestack");
const aws_lambda_1 = require("aws-cdk-lib/aws-lambda");
const aws_iam_1 = require("aws-cdk-lib/aws-iam");
const Cognito = require("aws-cdk-lib/aws-cognito");
const path = require("path");
const lambdasLocation = path.join(__dirname, '..', '..', 'lambdas');
class SecurityLayer extends resourceawarestack_1.ResourceAwareConstruct {
    constructor(parent, name, props) {
        super(parent, name, props);
        this.creatPostRegistrationLambdaTrigger();
        this.createUserPool();
        this.createIdentityPool();
        this.createUserPoolGroups();
        this.configureIdentityPoolRoles();
    }
    getUserPoolId() {
        return this.userPool.userPoolId;
    }
    getUserPoolUrl() {
        let value = "cognito-idp." + this.properties.region + ".amazonaws.com/" + this.userPool.userPoolId;
        return value;
    }
    getUserPoolArn() {
        return this.userPool.userPoolArn;
    }
    getUserPoolClient() {
        return this.userPoolClient;
    }
    getUserPoolClientId() {
        return this.userPoolClient.userPoolClientId;
    }
    getIdentityPool() {
        return this.identityPool;
    }
    getIdentityPoolId() {
        return this.identityPool.ref;
    }
    createUserPool() {
        this.userPool = new Cognito.UserPool(this, this.properties.getApplicationName() + 'UserPool', {
            passwordPolicy: {
                minLength: 6,
                requireLowercase: false,
                requireUppercase: false,
                requireDigits: false,
                requireSymbols: false
            },
            userPoolName: this.properties.getApplicationName(),
            standardAttributes: {
                email: {
                    required: true,
                    mutable: true
                },
                website: {
                    mutable: true,
                    required: true
                }
            },
            lambdaTriggers: {
                postConfirmation: this.postRegistrationTriggerFunction
            },
            autoVerify: {
                email: true
            },
            signInAliases: {
                username: true,
                email: true
            },
            selfSignUpEnabled: true,
            userVerification: {
                emailSubject: `Under The Sea environment ${this.properties.getApplicationName()} sent your verification link`,
                emailBody: "Please click the link below to verify your email address. {##Verify Email##}",
                emailStyle: Cognito.VerificationEmailStyle.LINK
            }
        });
        this.userPool.addDomain(this.properties.getApplicationName().toLowerCase(), {
            cognitoDomain: {
                domainPrefix: this.properties.getApplicationName().toLowerCase()
            }
        });
        this.userPoolClient = new Cognito.UserPoolClient(this, this.properties.getApplicationName() + "Client", {
            userPool: this.userPool,
            generateSecret: false,
            userPoolClientName: this.properties.getApplicationName() + 'Website',
            authFlows: {
                userSrp: true
            }
        });
    }
    createIdentityPool() {
        this.identityPool = new Cognito.CfnIdentityPool(this, this.properties.getApplicationName() + 'IdentityPool', {
            identityPoolName: this.properties.getApplicationName(),
            allowUnauthenticatedIdentities: false,
            cognitoIdentityProviders: [
                {
                    clientId: this.userPoolClient.userPoolClientId,
                    providerName: this.userPool.userPoolProviderName,
                    serverSideTokenCheck: false
                }
            ]
        });
        this.identityPool.node.addDependency(this.userPool);
        this.addResource('security.identitypool', this.identityPool);
    }
    createUserPoolGroups() {
        // PLAYERS
        this.playersRole = new aws_iam_1.Role(this, this.properties.getApplicationName() + 'PlayersRole', {
            roleName: this.properties.getApplicationName() + 'PlayersRole',
            assumedBy: new aws_iam_1.FederatedPrincipal('cognito-identity.amazonaws.com', {
                "StringEquals": { "cognito-identity.amazonaws.com:aud": this.identityPool.ref },
                "ForAnyValue:StringLike": { "cognito-identity.amazonaws.com:amr": "authenticated" }
            }, "sts:AssumeRoleWithWebIdentity")
        });
        let playerStatement = new aws_iam_1.PolicyStatement({ effect: aws_iam_1.Effect.ALLOW, resources: ["*"] });
        playerStatement.addActions("mobileanalytics:PutEvents", "cognito-sync:*", "cognito-identity:*");
        this.playersRole.addToPolicy(playerStatement);
        this.addResource('security.playersrole', this.playersRole);
        new Cognito.CfnUserPoolGroup(this, this.properties.getApplicationName() + 'Players', {
            groupName: 'Players',
            description: 'Players of the game.',
            precedence: 9999,
            roleArn: this.playersRole.roleArn,
            userPoolId: this.userPool.userPoolId
        });
        // MANAGERS
        this.managersRole = new aws_iam_1.Role(this, this.properties.getApplicationName() + 'ManagersRole', {
            roleName: this.properties.getApplicationName() + 'ManagersRole',
            assumedBy: new aws_iam_1.FederatedPrincipal('cognito-identity.amazonaws.com', {
                "StringEquals": { "cognito-identity.amazonaws.com:aud": this.identityPool.ref },
                "ForAnyValue:StringLike": { "cognito-identity.amazonaws.com:amr": "authenticated" }
            }, "sts:AssumeRoleWithWebIdentity")
        });
        this.managersRole.addManagedPolicy({ managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonCognitoPowerUser' });
        let managersStatement = new aws_iam_1.PolicyStatement({ effect: aws_iam_1.Effect.ALLOW, resources: ["*"] });
        managersStatement.addActions("mobileanalytics:PutEvents", "cognito-sync:*", "cognito-identity:*");
        this.managersRole.addToPolicy(managersStatement);
        this.addResource('security.managersrole', this.managersRole);
        new Cognito.CfnUserPoolGroup(this, this.properties.getApplicationName() + 'Managers', {
            groupName: 'Managers',
            description: 'Managers of the game.',
            precedence: 0,
            roleArn: this.managersRole.roleArn,
            userPoolId: this.userPool.userPoolId
        });
    }
    configureIdentityPoolRoles() {
        this.unauthenticatedRole = new aws_iam_1.Role(this, this.properties.getApplicationName() + 'UnauthRole', {
            roleName: this.properties.getApplicationName() + 'UnauthRole',
            assumedBy: new aws_iam_1.FederatedPrincipal('cognito-identity.amazonaws.com', {
                "StringEquals": { "cognito-identity.amazonaws.com:aud": this.identityPool.ref },
                "ForAnyValue:StringLike": { "cognito-identity.amazonaws.com:amr": "unauthenticated" }
            })
        });
        let policyStatement = new aws_iam_1.PolicyStatement({ effect: aws_iam_1.Effect.ALLOW, resources: ["*"] });
        policyStatement.addActions("mobileanalytics:PutEvents", "cognito-sync:*", "cognito-identity:*");
        this.unauthenticatedRole.addToPolicy(policyStatement);
        new Cognito.CfnIdentityPoolRoleAttachment(this, this.properties.getApplicationName() + "IDPRoles", {
            identityPoolId: this.identityPool.ref,
            roles: {
                authenticated: this.playersRole.roleArn,
                unauthenticated: this.unauthenticatedRole.roleArn
            }
            // TO-DO Identify with the team from CDK how to implement this
            /*    ,roleMappings : {
                    type: "Rules",
                    ambiguousRoleResolution: "Deny",
                    rulesConfiguration: {
                        rules: [
                            {
                                claim: "cognito:preferred_role",
                                matchType: "Contains",
                                value: "Managers",
                                roleArn: this.managersRole
                            },
                            {
                                claim: "cognito:preferred_role",
                                matchType: "Contains",
                                value: "Players",
                                roleArn: this.playersRole
                            }
                        ]
                    }
                }
                */
        });
    }
    creatPostRegistrationLambdaTrigger() {
        this.postRegistrationTriggerFunctionRole = new aws_iam_1.Role(this, this.properties.getApplicationName() + 'PostRegistrationFn_Role', {
            roleName: this.properties.getApplicationName() + 'PostRegistrationFn_Role',
            assumedBy: new aws_iam_1.ServicePrincipal('lambda.amazonaws.com')
        });
        this.postRegistrationTriggerFunctionRole.addManagedPolicy({
            managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
        });
        this.postRegistrationTriggerFunctionRole.addToPolicy(new aws_iam_1.PolicyStatement({
            actions: [
                "cognito-idp:AdminAddUserToGroup"
            ],
            resources: [
                "*"
            ]
        }));
        this.postRegistrationTriggerFunction =
            new aws_lambda_1.Function(this, this.properties.getApplicationName() + 'PostRegistration', {
                runtime: aws_lambda_1.Runtime.NODEJS_14_X,
                handler: 'index.handler',
                code: aws_lambda_1.Code.fromAsset(path.join(lambdasLocation, 'postRegistration')),
                functionName: this.properties.getApplicationName() + 'PostRegistrationFn',
                description: 'This function adds an user to the Players group after confirmation',
                memorySize: 128,
                timeout: aws_cdk_lib_1.Duration.seconds(60),
                role: this.postRegistrationTriggerFunctionRole
            });
    }
}
exports.SecurityLayer = SecurityLayer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjdXJpdHlMYXllci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInNlY3VyaXR5TGF5ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBR0EsNkNBQXVDO0FBQ3ZDLGdFQUFzRjtBQUN0Rix1REFBaUU7QUFDakUsaURBQTBHO0FBRTFHLG1EQUFvRDtBQUVwRCw2QkFBOEI7QUFFOUIsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztBQUVwRSxNQUFhLGFBQWMsU0FBUSwyQ0FBc0I7SUEwQ3JELFlBQVksTUFBaUIsRUFBRSxJQUFZLEVBQUUsS0FBMkI7UUFDcEUsS0FBSyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDM0IsSUFBSSxDQUFDLGtDQUFrQyxFQUFFLENBQUM7UUFDMUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQ3RCLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1FBQzFCLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1FBQzVCLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDO0lBQ3RDLENBQUM7SUFyQ0QsYUFBYTtRQUNULE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUM7SUFDcEMsQ0FBQztJQUVELGNBQWM7UUFDVixJQUFJLEtBQUssR0FBRyxjQUFjLEdBQVksSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFPLEdBQUcsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUM7UUFDN0csT0FBTyxLQUFLLENBQUM7SUFDakIsQ0FBQztJQUdELGNBQWM7UUFDVixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFBO0lBQ3BDLENBQUM7SUFFRCxpQkFBaUI7UUFDYixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUM7SUFDL0IsQ0FBQztJQUVELG1CQUFtQjtR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U0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLGtCQUFrQixDQUFDLENBQUM7Z0JBQ2xFLFlBQVksRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLGtCQUFrQixFQUFFLEdBQUcsb0JBQW9CO2dCQUN6RSxXQUFXLEVBQUUsb0VBQW9FO2dCQUNqRixVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUUsc0JBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUM3QixJQUFJLEVBQUUsSUFBSSxDQUFDLG1DQUFtQzthQUNuRCxDQUFDLENBQUM7SUFDWCxDQUFDO0NBRUo7QUE1UEQsc0NBNFBDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IEFtYXpvbi5jb20sIEluYy4gb3IgaXRzIGFmZmlsaWF0ZXMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4vLyBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogTUlULTBcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHsgRHVyYXRpb24gfSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBSZXNvdXJjZUF3YXJlQ29uc3RydWN0LCBJUGFyYW1ldGVyQXdhcmVQcm9wcyB9IGZyb20gJy4vLi4vcmVzb3VyY2Vhd2FyZXN0YWNrJ1xuaW1wb3J0IHsgRnVuY3Rpb24gLCBDb2RlLCBSdW50aW1lIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSdcbmltcG9ydCB7IFJvbGUsIEVmZmVjdCwgUG9saWN5U3RhdGVtZW50LCBGZWRlcmF0ZWRQcmluY2lwYWwsIFNlcnZpY2VQcmluY2lwYWwgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcblxuaW1wb3J0IENvZ25pdG8gPSByZXF1aXJlKCdhd3MtY2RrLWxpYi9hd3MtY29nbml0bycpO1xuXG5pbXBvcnQgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcblxuY29uc3QgbGFtYmRhc0xvY2F0aW9uID0gcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uJywgJy4uJywgJ2xhbWJkYXMnKTtcblxuZXhwb3J0IGNsYXNzIFNlY3VyaXR5TGF5ZXIgZXh0ZW5kcyBSZXNvdXJjZUF3YXJlQ29uc3RydWN0IHtcblxuICAgIHVzZXJQb29sOiBDb2duaXRvLlVzZXJQb29sO1xuICAgIGlkZW50aXR5UG9vbDogQ29nbml0by5DZm5JZGVudGl0eVBvb2w7XG4gICAgdXNlclBvb2xDbGllbnQ6IENvZ25pdG8uVXNlclBvb2xDbGllbnQ7XG4gICAgcGxheWVyc1JvbGU6IFJvbGU7XG4gICAgbWFuYWdlcnNSb2xlOiBSb2xlO1xuICAgIHVuYXV0aGVudGljYXRlZFJvbGU6IFJvbGU7XG4gICAgcG9zdFJlZ2lzdHJhdGlvblRyaWdnZXJGdW5jdGlvbjogRnVuY3Rpb247XG4gICAgcG9zdFJlZ2lzdHJhdGlvblRyaWdnZXJGdW5jdGlvblJvbGU6IFJvbGU7XG5cblxuICAgIGdldFVzZXJQb29sSWQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnVzZXJQb29sLnVzZXJQb29sSWQ7XG4gICAgfVxuXG4gICAgZ2V0VXNlclBvb2xVcmwoKSB7XG4gICAgICAgIGxldCB2YWx1ZSA9IFwiY29nbml0by1pZHAuXCIgKyAoPHN0cmluZz50aGlzLnByb3BlcnRpZXMucmVnaW9uKSArIFwiLmFtYXpvbmF3cy5jb20vXCIgKyB0aGlzLnVzZXJQb29sLnVzZXJQb29sSWQ7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cblxuICAgIGdldFVzZXJQb29sQXJuKCkge1xuICAgICAgICByZXR1cm4gdGhpcy51c2VyUG9vbC51c2VyUG9vbEFyblxuICAgIH1cblxuICAgIGdldFVzZXJQb29sQ2xpZW50KCkge1xuICAgICAgICByZXR1cm4gdGhpcy51c2VyUG9vbENsaWVudDtcbiAgICB9XG5cbiAgICBnZXRVc2VyUG9vbENsaWVudElkKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLnVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQ7XG4gICAgfVxuXG4gICAgZ2V0SWRlbnRpdHlQb29sKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5pZGVudGl0eVBvb2xcbiAgICB9XG5cbiAgICBnZXRJZGVudGl0eVBvb2xJZCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaWRlbnRpdHlQb29sLnJlZlxuICAgIH1cblxuICAgIGNvbnN0cnVjdG9yKHBhcmVudDogQ29uc3RydWN0LCBuYW1lOiBzdHJpbmcsIHByb3BzOiBJUGFyYW1ldGVyQXdhcmVQcm9wcykge1xuICAgICAgICBzdXBlcihwYXJlbnQsIG5hbWUsIHByb3BzKTtcbiAgICAgICAgdGhpcy5jcmVhdFBvc3RSZWdpc3RyYXRpb25MYW1iZGFUcmlnZ2VyKCk7XG4gICAgICAgIHRoaXMuY3JlYXRlVXNlclBvb2woKTtcbiAgICAgICAgdGhpcy5jcmVhdGVJZGVudGl0eVBvb2woKTtcbiAgICAgICAgdGhpcy5jcmVhdGVVc2VyUG9vbEdyb3VwcygpO1xuICAgICAgICB0aGlzLmNvbmZpZ3VyZUlkZW50aXR5UG9vbFJvbGVzKCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBjcmVhdGVVc2VyUG9vbCgpIHtcbiAgICAgICAgdGhpcy51c2VyUG9vbCA9IG5ldyBDb2duaXRvLlVzZXJQb29sKHRoaXMsIHRoaXMucHJvcGVydGllcy5nZXRBcHBsaWNhdGlvbk5hbWUoKSArICdVc2VyUG9vbCcsIHtcbiAgICAgICAgICAgIHBhc3N3b3JkUG9saWN5IDoge1xuICAgICAgICAgICAgIG1pbkxlbmd0aCA6IDYsXG4gICAgICAgICAgICAgcmVxdWlyZUxvd2VyY2FzZSA6IGZhbHNlLFxuICAgICAgICAgICAgIHJlcXVpcmVVcHBlcmNhc2UgOiBmYWxzZSxcbiAgICAgICAgICAgICByZXF1aXJlRGlnaXRzIDogZmFsc2UsXG4gICAgICAgICAgICAgcmVxdWlyZVN5bWJvbHMgOiBmYWxzZVxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB1c2VyUG9vbE5hbWUgOiB0aGlzLnByb3BlcnRpZXMuZ2V0QXBwbGljYXRpb25OYW1lKCksXG4gICAgICAgICAgICBzdGFuZGFyZEF0dHJpYnV0ZXMgOiB7XG4gICAgICAgICAgICAgICAgZW1haWwgOiB7XG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkIDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgbXV0YWJsZSA6IHRydWVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHdlYnNpdGUgOiB7XG4gICAgICAgICAgICAgICAgICAgIG11dGFibGUgOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZCA6IHRydWVcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGFtYmRhVHJpZ2dlcnMgOiB7XG4gICAgICAgICAgICAgICAgcG9zdENvbmZpcm1hdGlvbiA6IHRoaXMucG9zdFJlZ2lzdHJhdGlvblRyaWdnZXJGdW5jdGlvblxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGF1dG9WZXJpZnkgOiB7XG4gICAgICAgICAgICAgICAgZW1haWwgOiB0cnVlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2lnbkluQWxpYXNlcyA6IHtcbiAgICAgICAgICAgICAgICB1c2VybmFtZSA6IHRydWUsXG4gICAgICAgICAgICAgICAgZW1haWwgOiB0cnVlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2VsZlNpZ25VcEVuYWJsZWQgOiB0cnVlLFxuICAgICAgICAgICAgdXNlclZlcmlmaWNhdGlvbiA6IHtcbiAgICAgICAgICAgICAgICBlbWFpbFN1YmplY3QgOiBgVW5kZXIgVGhlIFNlYSBlbnZpcm9ubWVudCAke3RoaXMucHJvcGVydGllcy5nZXRBcHBsaWNhdGlvbk5hbWUoKX0gc2VudCB5b3VyIHZlcmlmaWNhdGlvbiBsaW5rYCxcbiAgICAgICAgICAgICAgICBlbWFpbEJvZHkgOiBcIlBsZWFzZSBjbGljayB0aGUgbGluayBiZWxvdyB0byB2ZXJpZnkgeW91ciBlbWFpbCBhZGRyZXNzLiB7IyNWZXJpZnkgRW1haWwjI31cIixcbiAgICAgICAgICAgICAgICBlbWFpbFN0eWxlIDogQ29nbml0by5WZXJpZmljYXRpb25FbWFpbFN0eWxlLkxJTktcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMudXNlclBvb2wuYWRkRG9tYWluKHRoaXMucHJvcGVydGllcy5nZXRBcHBsaWNhdGlvbk5hbWUoKS50b0xvd2VyQ2FzZSgpLHtcbiAgICAgICAgICAgIGNvZ25pdG9Eb21haW4gOiB7XG4gICAgICAgICAgICAgICAgZG9tYWluUHJlZml4IDogdGhpcy5wcm9wZXJ0aWVzLmdldEFwcGxpY2F0aW9uTmFtZSgpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMudXNlclBvb2xDbGllbnQgPSBuZXcgQ29nbml0by5Vc2VyUG9vbENsaWVudCh0aGlzLHRoaXMucHJvcGVydGllcy5nZXRBcHBsaWNhdGlvbk5hbWUoKStcIkNsaWVudFwiLHtcbiAgICAgICAgICAgIHVzZXJQb29sIDogdGhpcy51c2VyUG9vbCxcbiAgICAgICAgICAgIGdlbmVyYXRlU2VjcmV0IDogZmFsc2UsXG4gICAgICAgICAgICB1c2VyUG9vbENsaWVudE5hbWUgOiB0aGlzLnByb3BlcnRpZXMuZ2V0QXBwbGljYXRpb25OYW1lKCkgKyAnV2Vic2l0ZScsXG4gICAgICAgICAgICBhdXRoRmxvd3MgOiB7XG4gICAgICAgICAgICAgICAgdXNlclNycCA6IHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBjcmVhdGVJZGVudGl0eVBvb2woKSB7XG4gICAgICAgIHRoaXMuaWRlbnRpdHlQb29sID0gbmV3IENvZ25pdG8uQ2ZuSWRlbnRpdHlQb29sKHRoaXMsIHRoaXMucHJvcGVydGllcy5nZXRBcHBsaWNhdGlvbk5hbWUoKSArICdJZGVudGl0eVBvb2wnLCB7XG4gICAgICAgICAgICBpZGVudGl0eVBvb2xOYW1lOiB0aGlzLnByb3BlcnRpZXMuZ2V0QXBwbGljYXRpb25OYW1lKCksXG4gICAgICAgICAgICBhbGxvd1VuYXV0aGVudGljYXRlZElkZW50aXRpZXM6IGZhbHNlLFxuICAgICAgICAgICAgY29nbml0b0lkZW50aXR5UHJvdmlkZXJzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBjbGllbnRJZDogdGhpcy51c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxuICAgICAgICAgICAgICAgICAgICBwcm92aWRlck5hbWU6IHRoaXMudXNlclBvb2wudXNlclBvb2xQcm92aWRlck5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHNlcnZlclNpZGVUb2tlbkNoZWNrOiBmYWxzZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfSlcbiAgICAgICAgdGhpcy5pZGVudGl0eVBvb2wubm9kZS5hZGREZXBlbmRlbmN5KHRoaXMudXNlclBvb2wpO1xuICAgICAgICB0aGlzLmFkZFJlc291cmNlKCdzZWN1cml0eS5pZGVudGl0eXBvb2wnLCB0aGlzLmlkZW50aXR5UG9vbCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBjcmVhdGVVc2VyUG9vbEdyb3VwcygpIHtcbiAgICAgICAgLy8gUExBWUVSU1xuICAgICAgICB0aGlzLnBsYXllcnNSb2xlID0gbmV3IFJvbGUodGhpcywgdGhpcy5wcm9wZXJ0aWVzLmdldEFwcGxpY2F0aW9uTmFtZSgpICsgJ1BsYXllcnNSb2xlJywge1xuICAgICAgICAgICAgcm9sZU5hbWU6IHRoaXMucHJvcGVydGllcy5nZXRBcHBsaWNhdGlvbk5hbWUoKSArICdQbGF5ZXJzUm9sZScsXG4gICAgICAgICAgICBhc3N1bWVkQnk6IG5ldyBGZWRlcmF0ZWRQcmluY2lwYWwoJ2NvZ25pdG8taWRlbnRpdHkuYW1hem9uYXdzLmNvbScsIHtcbiAgICAgICAgICAgICAgICBcIlN0cmluZ0VxdWFsc1wiOiB7IFwiY29nbml0by1pZGVudGl0eS5hbWF6b25hd3MuY29tOmF1ZFwiOiB0aGlzLmlkZW50aXR5UG9vbC5yZWYgfSxcbiAgICAgICAgICAgICAgICBcIkZvckFueVZhbHVlOlN0cmluZ0xpa2VcIjogeyBcImNvZ25pdG8taWRlbnRpdHkuYW1hem9uYXdzLmNvbTphbXJcIjogXCJhdXRoZW50aWNhdGVkXCIgfVxuICAgICAgICAgICAgfSwgXCJzdHM6QXNzdW1lUm9sZVdpdGhXZWJJZGVudGl0eVwiKVxuICAgICAgICB9KTtcbiAgICAgICAgbGV0IHBsYXllclN0YXRlbWVudCA9IG5ldyBQb2xpY3lTdGF0ZW1lbnQoeyBlZmZlY3Q6IEVmZmVjdC5BTExPVywgcmVzb3VyY2VzOiBbXCIqXCJdIH0pO1xuICAgICAgICBwbGF5ZXJTdGF0ZW1lbnQuYWRkQWN0aW9ucyhcbiAgICAgICAgICAgIFwibW9iaWxlYW5hbHl0aWNzOlB1dEV2ZW50c1wiLFxuICAgICAgICAgICAgXCJjb2duaXRvLXN5bmM6KlwiLFxuICAgICAgICAgICAgXCJjb2duaXRvLWlkZW50aXR5OipcIlxuICAgICAgICApO1xuICAgICAgICB0aGlzLnBsYXllcnNSb2xlLmFkZFRvUG9saWN5KHBsYXllclN0YXRlbWVudCk7XG4gICAgICAgIHRoaXMuYWRkUmVzb3VyY2UoJ3NlY3VyaXR5LnBsYXllcnNyb2xlJywgdGhpcy5wbGF5ZXJzUm9sZSk7XG5cbiAgICAgICAgbmV3IENvZ25pdG8uQ2ZuVXNlclBvb2xHcm91cCh0aGlzLCB0aGlzLnByb3BlcnRpZXMuZ2V0QXBwbGljYXRpb25OYW1lKCkgKyAnUGxheWVycycsIHtcbiAgICAgICAgICAgIGdyb3VwTmFtZTogJ1BsYXllcnMnLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQbGF5ZXJzIG9mIHRoZSBnYW1lLicsXG4gICAgICAgICAgICBwcmVjZWRlbmNlOiA5OTk5LFxuICAgICAgICAgICAgcm9sZUFybjogdGhpcy5wbGF5ZXJzUm9sZS5yb2xlQXJuLFxuICAgICAgICAgICAgdXNlclBvb2xJZDogdGhpcy51c2VyUG9vbC51c2VyUG9vbElkXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIE1BTkFHRVJTXG4gICAgICAgIHRoaXMubWFuYWdlcnNSb2xlID0gbmV3IFJvbGUodGhpcywgdGhpcy5wcm9wZXJ0aWVzLmdldEFwcGxpY2F0aW9uTmFtZSgpICsgJ01hbmFnZXJzUm9sZScsIHtcbiAgICAgICAgICAgIHJvbGVOYW1lOiB0aGlzLnByb3BlcnRpZXMuZ2V0QXBwbGljYXRpb25OYW1lKCkgKyAnTWFuYWdlcnNSb2xlJyxcbiAgICAgICAgICAgIGFzc3VtZWRCeTogbmV3IEZlZGVyYXRlZFByaW5jaXBhbCgnY29nbml0by1pZGVudGl0eS5hbWF6b25hd3MuY29tJywge1xuICAgICAgICAgICAgICAgIFwiU3RyaW5nRXF1YWxzXCI6IHsgXCJjb2duaXRvLWlkZW50aXR5LmFtYXpvbmF3cy5jb206YXVkXCI6IHRoaXMuaWRlbnRpdHlQb29sLnJlZiB9LFxuICAgICAgICAgICAgICAgIFwiRm9yQW55VmFsdWU6U3RyaW5nTGlrZVwiOiB7IFwiY29nbml0by1pZGVudGl0eS5hbWF6b25hd3MuY29tOmFtclwiOiBcImF1dGhlbnRpY2F0ZWRcIiB9XG4gICAgICAgICAgICB9LCBcInN0czpBc3N1bWVSb2xlV2l0aFdlYklkZW50aXR5XCIpXG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLm1hbmFnZXJzUm9sZS5hZGRNYW5hZ2VkUG9saWN5KHsgbWFuYWdlZFBvbGljeUFybjogJ2Fybjphd3M6aWFtOjphd3M6cG9saWN5L0FtYXpvbkNvZ25pdG9Qb3dlclVzZXInIH0pO1xuICAgICAgICBsZXQgbWFuYWdlcnNTdGF0ZW1lbnQgPSBuZXcgUG9saWN5U3RhdGVtZW50KHsgZWZmZWN0OiBFZmZlY3QuQUxMT1csIHJlc291cmNlczogW1wiKlwiXSB9KTtcbiAgICAgICAgbWFuYWdlcnNTdGF0ZW1lbnQuYWRkQWN0aW9ucyhcbiAgICAgICAgICAgIFwibW9iaWxlYW5hbHl0aWNzOlB1dEV2ZW50c1wiLFxuICAgICAgICAgICAgXCJjb2duaXRvLXN5bmM6KlwiLFxuICAgICAgICAgICAgXCJjb2duaXRvLWlkZW50aXR5OipcIlxuICAgICAgICApO1xuICAgICAgICB0aGlzLm1hbmFnZXJzUm9sZS5hZGRUb1BvbGljeShtYW5hZ2Vyc1N0YXRlbWVudCk7XG4gICAgICAgIHRoaXMuYWRkUmVzb3VyY2UoJ3NlY3VyaXR5Lm1hbmFnZXJzcm9sZScsIHRoaXMubWFuYWdlcnNSb2xlKTtcbiAgICAgICAgbmV3IENvZ25pdG8uQ2ZuVXNlclBvb2xHcm91cCh0aGlzLCB0aGlzLnByb3BlcnRpZXMuZ2V0QXBwbGljYXRpb25OYW1lKCkgKyAnTWFuYWdlcnMnLCB7XG4gICAgICAgICAgICBncm91cE5hbWU6ICdNYW5hZ2VycycsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ01hbmFnZXJzIG9mIHRoZSBnYW1lLicsXG4gICAgICAgICAgICBwcmVjZWRlbmNlOiAwLFxuICAgICAgICAgICAgcm9sZUFybjogdGhpcy5tYW5hZ2Vyc1JvbGUucm9sZUFybixcbiAgICAgICAgICAgIHVzZXJQb29sSWQ6IHRoaXMudXNlclBvb2wudXNlclBvb2xJZFxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGNvbmZpZ3VyZUlkZW50aXR5UG9vbFJvbGVzKCkge1xuICAgICAgICB0aGlzLnVuYXV0aGVudGljYXRlZFJvbGUgPSBuZXcgUm9sZSh0aGlzLCB0aGlzLnByb3BlcnRpZXMuZ2V0QXBwbGljYXRpb25OYW1lKCkgKyAnVW5hdXRoUm9sZScsIHtcbiAgICAgICAgICAgIHJvbGVOYW1lOiB0aGlzLnByb3BlcnRpZXMuZ2V0QXBwbGljYXRpb25OYW1lKCkgKyAnVW5hdXRoUm9sZScsXG4gICAgICAgICAgICBhc3N1bWVkQnk6IG5ldyBGZWRlcmF0ZWRQcmluY2lwYWwoJ2NvZ25pdG8taWRlbnRpdHkuYW1hem9uYXdzLmNvbScsIHtcbiAgICAgICAgICAgICAgICBcIlN0cmluZ0VxdWFsc1wiOiB7IFwiY29nbml0by1pZGVudGl0eS5hbWF6b25hd3MuY29tOmF1ZFwiOiB0aGlzLmlkZW50aXR5UG9vbC5yZWYgfSxcbiAgICAgICAgICAgICAgICBcIkZvckFueVZhbHVlOlN0cmluZ0xpa2VcIjogeyBcImNvZ25pdG8taWRlbnRpdHkuYW1hem9uYXdzLmNvbTphbXJcIjogXCJ1bmF1dGhlbnRpY2F0ZWRcIiB9XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KTtcbiAgICAgICAgbGV0IHBvbGljeVN0YXRlbWVudCA9IG5ldyBQb2xpY3lTdGF0ZW1lbnQoeyBlZmZlY3Q6IEVmZmVjdC5BTExPVywgcmVzb3VyY2VzOiBbXCIqXCJdIH0pO1xuICAgICAgICBwb2xpY3lTdGF0ZW1lbnQuYWRkQWN0aW9ucyhcbiAgICAgICAgICAgIFwibW9iaWxlYW5hbHl0aWNzOlB1dEV2ZW50c1wiLFxuICAgICAgICAgICAgXCJjb2duaXRvLXN5bmM6KlwiLFxuICAgICAgICAgICAgXCJjb2duaXRvLWlkZW50aXR5OipcIlxuICAgICAgICApO1xuICAgICAgICB0aGlzLnVuYXV0aGVudGljYXRlZFJvbGUuYWRkVG9Qb2xpY3kocG9saWN5U3RhdGVtZW50KTtcblxuICAgICAgICBuZXcgQ29nbml0by5DZm5JZGVudGl0eVBvb2xSb2xlQXR0YWNobWVudCh0aGlzLCB0aGlzLnByb3BlcnRpZXMuZ2V0QXBwbGljYXRpb25OYW1lKCkgKyBcIklEUFJvbGVzXCIsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgaWRlbnRpdHlQb29sSWQ6IHRoaXMuaWRlbnRpdHlQb29sLnJlZlxuICAgICAgICAgICAgICAgICwgcm9sZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgYXV0aGVudGljYXRlZDogdGhpcy5wbGF5ZXJzUm9sZS5yb2xlQXJuLFxuICAgICAgICAgICAgICAgICAgICB1bmF1dGhlbnRpY2F0ZWQ6IHRoaXMudW5hdXRoZW50aWNhdGVkUm9sZS5yb2xlQXJuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFRPLURPIElkZW50aWZ5IHdpdGggdGhlIHRlYW0gZnJvbSBDREsgaG93IHRvIGltcGxlbWVudCB0aGlzXG4gICAgICAgICAgICAgICAgLyogICAgLHJvbGVNYXBwaW5ncyA6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiUnVsZXNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGFtYmlndW91c1JvbGVSZXNvbHV0aW9uOiBcIkRlbnlcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bGVzQ29uZmlndXJhdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYWltOiBcImNvZ25pdG86cHJlZmVycmVkX3JvbGVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoVHlwZTogXCJDb250YWluc1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IFwiTWFuYWdlcnNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvbGVBcm46IHRoaXMubWFuYWdlcnNSb2xlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYWltOiBcImNvZ25pdG86cHJlZmVycmVkX3JvbGVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoVHlwZTogXCJDb250YWluc1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IFwiUGxheWVyc1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcm9sZUFybjogdGhpcy5wbGF5ZXJzUm9sZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICB9KTtcblxuICAgIH1cblxuICAgIHByaXZhdGUgY3JlYXRQb3N0UmVnaXN0cmF0aW9uTGFtYmRhVHJpZ2dlcigpIHtcbiAgICAgICAgdGhpcy5wb3N0UmVnaXN0cmF0aW9uVHJpZ2dlckZ1bmN0aW9uUm9sZSA9IG5ldyBSb2xlKHRoaXMsIHRoaXMucHJvcGVydGllcy5nZXRBcHBsaWNhdGlvbk5hbWUoKSArICdQb3N0UmVnaXN0cmF0aW9uRm5fUm9sZScsIHtcbiAgICAgICAgICAgIHJvbGVOYW1lOiB0aGlzLnByb3BlcnRpZXMuZ2V0QXBwbGljYXRpb25OYW1lKCkgKyAnUG9zdFJlZ2lzdHJhdGlvbkZuX1JvbGUnXG4gICAgICAgICAgICAsIGFzc3VtZWRCeTogbmV3IFNlcnZpY2VQcmluY2lwYWwoJ2xhbWJkYS5hbWF6b25hd3MuY29tJylcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMucG9zdFJlZ2lzdHJhdGlvblRyaWdnZXJGdW5jdGlvblJvbGUuYWRkTWFuYWdlZFBvbGljeSh7XG4gICAgICAgICAgICBtYW5hZ2VkUG9saWN5QXJuOiAnYXJuOmF3czppYW06OmF3czpwb2xpY3kvc2VydmljZS1yb2xlL0FXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZSdcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMucG9zdFJlZ2lzdHJhdGlvblRyaWdnZXJGdW5jdGlvblJvbGUuYWRkVG9Qb2xpY3kobmV3IFBvbGljeVN0YXRlbWVudChcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBhY3Rpb25zIDogWyBcbiAgICAgICAgICAgICAgICAgICAgXCJjb2duaXRvLWlkcDpBZG1pbkFkZFVzZXJUb0dyb3VwXCJcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIHJlc291cmNlcyA6IFtcbiAgICAgICAgICAgICAgICAgICAgXCIqXCJcbiAgICAgICAgICAgICAgICBdXG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgKSk7XG4gICAgICAgIHRoaXMucG9zdFJlZ2lzdHJhdGlvblRyaWdnZXJGdW5jdGlvbiA9XG4gICAgICAgICAgICBuZXcgRnVuY3Rpb24odGhpcywgdGhpcy5wcm9wZXJ0aWVzLmdldEFwcGxpY2F0aW9uTmFtZSgpICsgJ1Bvc3RSZWdpc3RyYXRpb24nLCB7XG4gICAgICAgICAgICAgICAgcnVudGltZTogUnVudGltZS5OT0RFSlNfMTRfWCxcbiAgICAgICAgICAgICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXG4gICAgICAgICAgICAgICAgY29kZTogQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKGxhbWJkYXNMb2NhdGlvbiwgJ3Bvc3RSZWdpc3RyYXRpb24nKSlcbiAgICAgICAgICAgICAgICAsIGZ1bmN0aW9uTmFtZTogdGhpcy5wcm9wZXJ0aWVzLmdldEFwcGxpY2F0aW9uTmFtZSgpICsgJ1Bvc3RSZWdpc3RyYXRpb25GbidcbiAgICAgICAgICAgICAgICAsIGRlc2NyaXB0aW9uOiAnVGhpcyBmdW5jdGlvbiBhZGRzIGFuIHVzZXIgdG8gdGhlIFBsYXllcnMgZ3JvdXAgYWZ0ZXIgY29uZmlybWF0aW9uJ1xuICAgICAgICAgICAgICAgICwgbWVtb3J5U2l6ZTogMTI4XG4gICAgICAgICAgICAgICAgLCB0aW1lb3V0OiBEdXJhdGlvbi5zZWNvbmRzKDYwKVxuICAgICAgICAgICAgICAgICwgcm9sZTogdGhpcy5wb3N0UmVnaXN0cmF0aW9uVHJpZ2dlckZ1bmN0aW9uUm9sZVxuICAgICAgICAgICAgfSk7XG4gICAgfVxuXG59Il19
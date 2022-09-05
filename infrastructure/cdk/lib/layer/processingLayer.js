"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessingLayer = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const resourceawarestack_1 = require("./../resourceawarestack");
const Lambda = require("aws-cdk-lib/aws-lambda");
const IAM = require("aws-cdk-lib/aws-iam");
const aws_iam_1 = require("aws-cdk-lib/aws-iam");
const SQS = require("aws-cdk-lib/aws-sqs");
const path = require("path");
const lambdasLocation = path.join(__dirname, '..', '..', 'lambdas');
var SESSION_PARAMETER = false;
class ProcessingLayer extends resourceawarestack_1.ResourceAwareConstruct {
    constructor(parent, name, props) {
        super(parent, name, props);
        let createdFunction = null;
        createdFunction = this.getAllocateGamerFunction();
        if (createdFunction)
            this.allocateFunction = createdFunction;
        createdFunction = this.getDeallocateGamerFunction();
        if (createdFunction)
            this.deallocateFunction = createdFunction;
        createdFunction = this.getScoreboardFunction();
        if (createdFunction)
            this.scoreboardFunction = createdFunction;
        if (props && props.getParameter("sessionparameter"))
            SESSION_PARAMETER = true;
    }
    getAllocateFunctionArn() {
        return this.allocateFunction.functionArn;
    }
    getAllocateFunctionRef() {
        return this.allocateFunction;
    }
    getDeallocateFunctionArn() {
        return this.deallocateFunction.functionArn;
        ;
    }
    getScoreboardFunctionArn() {
        return this.scoreboardFunction.functionArn;
    }
    getScoreboardFunctionRef() {
        return this.scoreboardFunction;
    }
    getAllocateGamerFunction() {
        /**
    * This function requires access to
    * SystemsManager
    *      process.env.SESSION_PARAMETER = /<getAppRefName>/session
    * DynamoDB Tables
    *      process.env.SESSION_CONTROL_TABLENAME = getAppRefName+'SessionControl'
    */
        let sessionParameter;
        let parameterNameForLambda;
        if (SESSION_PARAMETER) {
            sessionParameter = this.properties.getParameter('parameter.session');
            parameterNameForLambda = (sessionParameter).name;
        }
        else {
            sessionParameter = { parameterName: '/' + this.properties.getApplicationName().toLocaleLowerCase() + '/session' };
            parameterNameForLambda = sessionParameter.parameterName;
        }
        let sessionControlTable = this.properties.getParameter('table.sessioncontrol');
        if (sessionParameter && sessionControlTable) {
            let createdFunction = new Lambda.Function(this, this.properties.getApplicationName() + 'AllocateGamerFn', {
                runtime: Lambda.Runtime.NODEJS_14_X,
                handler: 'index.handler',
                code: Lambda.Code.fromAsset(path.join(lambdasLocation, 'allocateGamer')),
                environment: {
                    'SESSION_CONTROL_TABLENAME': sessionControlTable.tableName,
                    'SESSION_PARAMETER': parameterNameForLambda
                },
                functionName: this.properties.getApplicationName() + 'AllocateGamerFn',
                description: 'This function supports the allocation of gamers when the game is to start',
                memorySize: 128,
                timeout: aws_cdk_lib_1.Duration.seconds(60),
                role: new IAM.Role(this, this.properties.getApplicationName() + 'AllocateGamerFn_Role', {
                    roleName: this.properties.getApplicationName() + 'AllocateGamerFn_Role',
                    assumedBy: new IAM.ServicePrincipal('lambda.amazonaws.com'),
                    managedPolicies: [aws_iam_1.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
                    inlinePolicies: {
                        'DynamoDBPermissions': new IAM.PolicyDocument({
                            statements: [
                                new IAM.PolicyStatement({
                                    resources: [sessionControlTable.tableArn],
                                    actions: [
                                        "dynamodb:GetItem",
                                        "dynamodb:UpdateItem",
                                        "dynamodb:Scan",
                                        "dynamodb:Query"
                                    ]
                                })
                            ]
                        }),
                        'SystemsManagerPermissions': new IAM.PolicyDocument({
                            statements: [
                                new IAM.PolicyStatement({
                                    resources: ['arn:aws:ssm:' + this.properties.region + ':' + this.properties.accountId + ':parameter' + sessionParameter.parameterName],
                                    actions: ['ssm:GetParameter', 'ssm:GetParameters']
                                })
                            ]
                        })
                    }
                })
            });
            return createdFunction;
        }
        else
            return undefined;
    }
    getDeallocateGamerFunction() {
        /**
         * This function requires access to
         * SystemsManager
         *      process.env.SESSION_PARAMETER = /<getAppRefName>/session
         * DynamoDB Tables
         *      process.env.SESSION_CONTROL_TABLENAME = getAppRefName+'SessionControl'
         */
        let sessionParameter;
        let parameterName;
        if (SESSION_PARAMETER) {
            sessionParameter = this.properties.getParameter('parameter.session');
            parameterName = sessionParameter.ref;
        }
        else {
            sessionParameter = { parameterName: '/' + this.properties.getApplicationName().toLocaleLowerCase() + '/session' };
            parameterName = sessionParameter.parameterName;
        }
        let sessionControlTable = this.properties.getParameter('table.sessionControl');
        if (sessionParameter && sessionControlTable) {
            let createdFunction = new Lambda.Function(this, this.properties.getApplicationName() + 'DeallocateGamerFn', {
                runtime: Lambda.Runtime.NODEJS_14_X,
                handler: 'index.handler',
                code: Lambda.Code.fromAsset(path.join(lambdasLocation, 'deallocateGamer')),
                environment: {
                    'SESSION_CONTROL_TABLENAME': sessionControlTable.tableName,
                    'SESSION_PARAMETER': parameterName
                },
                functionName: this.properties.getApplicationName() + 'DeallocateGamerFn',
                description: 'This function deallocates the gamer when a relevant event is identified (sign out, close window etc)',
                memorySize: 128,
                timeout: aws_cdk_lib_1.Duration.seconds(60),
                role: new IAM.Role(this, this.properties.getApplicationName() + 'DeallocateGamerFn_Role', {
                    roleName: this.properties.getApplicationName() + 'DeallocateGamerFn_Role',
                    assumedBy: new IAM.ServicePrincipal('lambda.amazonaws.com'),
                    managedPolicies: [aws_iam_1.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
                    inlinePolicies: {
                        'DynamoDBPermissions': new IAM.PolicyDocument({
                            statements: [
                                new IAM.PolicyStatement({
                                    resources: [sessionControlTable.tableArn],
                                    actions: [
                                        'dynamodb:GetItem',
                                        'dynamodb:UpdateItem',
                                        'dynamodb:Scan',
                                        'dynamodb:Query'
                                    ]
                                })
                            ]
                        }),
                        'SystemsManagerPermissions': new IAM.PolicyDocument({
                            statements: [
                                new IAM.PolicyStatement({
                                    resources: ['arn:aws:ssm:' + this.properties.region + ':' + this.properties.accountId + ':parameter' + sessionParameter.parameterName],
                                    actions: [
                                        'ssm:GetParameter',
                                        'ssm:GetParameters'
                                    ]
                                })
                            ]
                        })
                    }
                })
            });
            return createdFunction;
        }
        else
            return undefined;
    }
    getScoreboardFunction() {
        let dlq = new SQS.Queue(this, this.properties.getApplicationName() + 'DLQ', {
            queueName: this.properties.getApplicationName() + 'DLQ'
        });
        /**
         * This function requires access to
         * Queue
         *      process.env.DLQ_URL = "https://sqs.<region>.amazonaws.com/<account>/<envName>_DLQ"
         * SystemsManager
         *      process.env.SESSION_PARAMETER = /<getAppRefName>/session
         * DynamoDB Tables
         *      process.env.SESSION_TABLENAME = getAppRefName+'Session'
         *      process.env.SESSION_CONTROL_TABLENAME = getAppRefName+'SessionControl'
         *      process.env.SESSIONTOPX_TABLENAME = getAppRefName+'SessionTopX'
         */
        let sessionParameter;
        let parameterName;
        if (SESSION_PARAMETER) {
            sessionParameter = this.properties.getParameter('parameter.session');
            parameterName = sessionParameter.ref;
        }
        else {
            sessionParameter = { parameterName: '/' + this.properties.getApplicationName().toLocaleLowerCase() + '/session' };
            parameterName = sessionParameter.parameterName;
        }
        let sessionControlTable = this.properties.getParameter('table.sessionControl');
        let sessionTopX = this.properties.getParameter('table.sessionTopX');
        let sessionTable = this.properties.getParameter('table.session');
        if (sessionParameter && sessionControlTable && sessionTopX && sessionTable) {
            let createdFunction = new Lambda.Function(this, this.properties.getApplicationName() + 'ScoreboardFn', {
                runtime: Lambda.Runtime.NODEJS_14_X,
                handler: 'index.handler',
                code: Lambda.Code.fromAsset(path.join(lambdasLocation, 'scoreboard')),
                environment: {
                    'DLQ_URL': dlq.queueUrl,
                    'SESSION_PARAMETER': parameterName,
                    'SESSION_TABLENAME': sessionTable.tableName,
                    'SESSION_CONTROL_TABLENAME': sessionControlTable.tableName,
                    'SESSION_TOPX_TABLENAME': sessionTopX.tableName,
                    'TopXValue': '10'
                },
                functionName: this.properties.getApplicationName() + 'ScoreboardFn',
                description: 'This function computes the scoreboard',
                memorySize: 128,
                timeout: aws_cdk_lib_1.Duration.seconds(60),
                role: new IAM.Role(this, this.properties.getApplicationName() + 'ScoreboardFn_Role', {
                    roleName: this.properties.getApplicationName() + 'ScoreboardFn_Role',
                    assumedBy: new IAM.ServicePrincipal('lambda.amazonaws.com'),
                    managedPolicies: [aws_iam_1.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
                    inlinePolicies: {
                        'DynamoDBPermissions': new IAM.PolicyDocument({
                            statements: [
                                new IAM.PolicyStatement({
                                    resources: ['arn:aws:dynamodb:' + this.properties.region + ':' + this.properties.accountId + ':table/' + this.properties.getApplicationName() + '*'],
                                    actions: [
                                        'dynamodb:GetItem',
                                        'dynamodb:UpdateItem',
                                        'dynamodb:Scan',
                                        'dynamodb:Query',
                                        'dynamodb:Batch*',
                                        'dynamodb:PutItem',
                                        'dynamodb:DeleteItem'
                                    ]
                                })
                            ]
                        }),
                        'SystemsManagerPermissions': new IAM.PolicyDocument({
                            statements: [
                                new IAM.PolicyStatement({
                                    resources: ['arn:aws:ssm:' + this.properties.region + ':' + this.properties.accountId + ':parameter/' + this.properties.getApplicationName().toLowerCase() + '*'],
                                    actions: [
                                        'ssm:Get*',
                                        'ssm:List*'
                                    ]
                                })
                            ]
                        }),
                        'SQSPermissions': new IAM.PolicyDocument({
                            statements: [
                                new IAM.PolicyStatement({
                                    resources: [dlq.queueArn],
                                    actions: ['sqs:SendMessage']
                                })
                            ]
                        }),
                        'KinesisPermissions': new IAM.PolicyDocument({
                            statements: [
                                new IAM.PolicyStatement({
                                    resources: ["*"],
                                    actions: [
                                        "kinesis:SubscribeToShard",
                                        "kinesis:GetShardIterator",
                                        "kinesis:GetRecords",
                                        "kinesis:DescribeStream"
                                    ]
                                })
                            ]
                        })
                    }
                })
            });
            return createdFunction;
        }
        else
            return undefined;
    }
}
exports.ProcessingLayer = ProcessingLayer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc2luZ0xheWVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicHJvY2Vzc2luZ0xheWVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUdBLDZDQUF1QztBQUN2QyxnRUFBc0Y7QUFFdEYsaURBQWtEO0FBQ2xELDJDQUE0QztBQUU1QyxpREFBb0Q7QUFFcEQsMkNBQTRDO0FBSzVDLDZCQUE4QjtBQUU5QixNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBQyxJQUFJLEVBQUMsSUFBSSxFQUFDLFNBQVMsQ0FBQyxDQUFDO0FBRWpFLElBQUksaUJBQWlCLEdBQWEsS0FBSyxDQUFDO0FBRXhDLE1BQWEsZUFBZ0IsU0FBUSwyQ0FBc0I7SUF1QnZELFlBQVksTUFBaUIsRUFBRSxJQUFZLEVBQUUsS0FBMkI7UUFDcEUsS0FBSyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDM0IsSUFBSSxlQUFlLEdBQXVDLElBQUksQ0FBQztRQUUvRCxlQUFlLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUM7UUFDbEQsSUFBSSxlQUFlO1lBQUUsSUFBSSxDQUFDLGdCQUFnQixHQUFHLGVBQWUsQ0FBQztRQUU3RCxlQUFlLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixFQUFFLENBQUM7UUFDcEQsSUFBSSxlQUFlO1lBQUUsSUFBSSxDQUFDLGtCQUFrQixHQUFHLGVBQWUsQ0FBQztRQUUvRCxlQUFlLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7UUFDL0MsSUFBSSxlQUFlO1lBQUUsSUFBSSxDQUFDLGtCQUFrQixHQUFHLGVBQWUsQ0FBQztRQUUvRCxJQUFJLEtBQUssSUFBSSxLQUFLLENBQUMsWUFBWSxDQUFDLGtCQUFrQixDQUFDO1lBQUUsaUJBQWlCLEdBQUMsSUFBSSxDQUFDO0lBRWhGLENBQUM7SUFuQ00sc0JBQXNCO1FBQ3pCLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFD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bkIsU0FBUyxFQUFHLENBQUUsY0FBYyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsR0FBRyxhQUFhLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLFdBQVcsRUFBRSxHQUFHLEdBQUcsQ0FBRTtvQ0FDcEssT0FBTyxFQUFHO3dDQUNOLFVBQVU7d0NBQ1YsV0FBVztxQ0FDZjtpQ0FDSixDQUFDOzZCQUNMO3lCQUNKLENBQUM7d0JBQ04sZ0JBQWdCLEVBQ1osSUFBSSxHQUFHLENBQUMsY0FBYyxDQUFDOzRCQUNuQixVQUFVLEVBQUc7Z0NBQ1QsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDO29DQUNuQixTQUFTLEVBQUcsQ0FBRSxHQUFHLENBQUMsUUFBUSxDQUFFO29DQUM1QixPQUFPLEVBQUUsQ0FBRSxpQkFBaUIsQ0FBRTtpQ0FDbEMsQ0FBQzs2QkFDTDt5QkFDSixDQUFDO3dCQUNOLG9CQUFvQixFQUNoQixJQUFJLEdBQUcsQ0FBQyxjQUFjLENBQUM7NEJBQ25CLFVBQVUsRUFBRztnQ0FDVCxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7b0NBQ25CLFNBQVMsRUFBRyxDQUFDLEdBQUcsQ0FBQztvQ0FDaEIsT0FBTyxFQUFHO3dDQUNSLDBCQUEwQjt3Q0FDMUIsMEJBQTBCO3dDQUMxQixvQkFBb0I7d0NBQ3BCLHdCQUF3QjtxQ0FDM0I7aUNBQ0osQ0FBQzs2QkFDTDt5QkFDSixDQUFDO3FCQUNUO2lCQUNKLENBQUM7YUFDTCxDQUFDLENBQUM7WUFDUCxPQUFPLGVBQWUsQ0FBQztTQUMxQjs7WUFDSSxPQUFPLFNBQVMsQ0FBQztJQUMxQixDQUFDO0NBQ0o7QUF0U0QsMENBc1NDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IEFtYXpvbi5jb20sIEluYy4gb3IgaXRzIGFmZmlsaWF0ZXMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4vLyBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogTUlULTBcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHsgRHVyYXRpb24gfSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBSZXNvdXJjZUF3YXJlQ29uc3RydWN0LCBJUGFyYW1ldGVyQXdhcmVQcm9wcyB9IGZyb20gJy4vLi4vcmVzb3VyY2Vhd2FyZXN0YWNrJ1xuXG5pbXBvcnQgTGFtYmRhID0gcmVxdWlyZSgnYXdzLWNkay1saWIvYXdzLWxhbWJkYScpO1xuaW1wb3J0IElBTSA9IHJlcXVpcmUoJ2F3cy1jZGstbGliL2F3cy1pYW0nKTtcbmltcG9ydCB7IFRhYmxlIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcbmltcG9ydCB7IE1hbmFnZWRQb2xpY3kgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcblxuaW1wb3J0IFNRUyA9IHJlcXVpcmUoJ2F3cy1jZGstbGliL2F3cy1zcXMnKTtcblxuaW1wb3J0IHsgU3RyaW5nUGFyYW1ldGVyIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLXNzbSc7XG5cblxuaW1wb3J0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG5cbmNvbnN0IGxhbWJkYXNMb2NhdGlvbiA9IHBhdGguam9pbihfX2Rpcm5hbWUsJy4uJywnLi4nLCdsYW1iZGFzJyk7XG5cbnZhciBTRVNTSU9OX1BBUkFNRVRFUiA6IGJvb2xlYW4gPSBmYWxzZTtcblxuZXhwb3J0IGNsYXNzIFByb2Nlc3NpbmdMYXllciBleHRlbmRzIFJlc291cmNlQXdhcmVDb25zdHJ1Y3Qge1xuXG4gICAgcHJpdmF0ZSBhbGxvY2F0ZUZ1bmN0aW9uOiBMYW1iZGEuRnVuY3Rpb247XG4gICAgcHVibGljIGdldEFsbG9jYXRlRnVuY3Rpb25Bcm4oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmFsbG9jYXRlRnVuY3Rpb24uZnVuY3Rpb25Bcm47XG4gICAgfVxuICAgIHB1YmxpYyBnZXRBbGxvY2F0ZUZ1bmN0aW9uUmVmKCkgOiBMYW1iZGEuRnVuY3Rpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5hbGxvY2F0ZUZ1bmN0aW9uO1xuICAgIH1cblxuICAgIHByaXZhdGUgZGVhbGxvY2F0ZUZ1bmN0aW9uOiBMYW1iZGEuRnVuY3Rpb247XG4gICAgcHVibGljIGdldERlYWxsb2NhdGVGdW5jdGlvbkFybigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGVhbGxvY2F0ZUZ1bmN0aW9uLmZ1bmN0aW9uQXJuOztcbiAgICB9XG5cbiAgICBwcml2YXRlIHNjb3JlYm9hcmRGdW5jdGlvbiA6IExhbWJkYS5GdW5jdGlvbjtcbiAgICBwdWJsaWMgZ2V0U2NvcmVib2FyZEZ1bmN0aW9uQXJuKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5zY29yZWJvYXJkRnVuY3Rpb24uZnVuY3Rpb25Bcm47XG4gICAgfVxuICAgIHB1YmxpYyBnZXRTY29yZWJvYXJkRnVuY3Rpb25SZWYoKSA6IExhbWJkYS5GdW5jdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnNjb3JlYm9hcmRGdW5jdGlvbjtcbiAgICB9XG5cbiAgICBjb25zdHJ1Y3RvcihwYXJlbnQ6IENvbnN0cnVjdCwgbmFtZTogc3RyaW5nLCBwcm9wczogSVBhcmFtZXRlckF3YXJlUHJvcHMpIHtcbiAgICAgICAgc3VwZXIocGFyZW50LCBuYW1lLCBwcm9wcyk7XG4gICAgICAgIGxldCBjcmVhdGVkRnVuY3Rpb246IExhbWJkYS5GdW5jdGlvbiB8IHVuZGVmaW5lZCB8IG51bGwgPSBudWxsO1xuXG4gICAgICAgIGNyZWF0ZWRGdW5jdGlvbiA9IHRoaXMuZ2V0QWxsb2NhdGVHYW1lckZ1bmN0aW9uKCk7XG4gICAgICAgIGlmIChjcmVhdGVkRnVuY3Rpb24pIHRoaXMuYWxsb2NhdGVGdW5jdGlvbiA9IGNyZWF0ZWRGdW5jdGlvbjtcblxuICAgICAgICBjcmVhdGVkRnVuY3Rpb24gPSB0aGlzLmdldERlYWxsb2NhdGVHYW1lckZ1bmN0aW9uKCk7XG4gICAgICAgIGlmIChjcmVhdGVkRnVuY3Rpb24pIHRoaXMuZGVhbGxvY2F0ZUZ1bmN0aW9uID0gY3JlYXRlZEZ1bmN0aW9uO1xuXG4gICAgICAgIGNyZWF0ZWRGdW5jdGlvbiA9IHRoaXMuZ2V0U2NvcmVib2FyZEZ1bmN0aW9uKCk7XG4gICAgICAgIGlmIChjcmVhdGVkRnVuY3Rpb24pIHRoaXMuc2NvcmVib2FyZEZ1bmN0aW9uID0gY3JlYXRlZEZ1bmN0aW9uO1xuXG4gICAgICAgIGlmIChwcm9wcyAmJiBwcm9wcy5nZXRQYXJhbWV0ZXIoXCJzZXNzaW9ucGFyYW1ldGVyXCIpKSBTRVNTSU9OX1BBUkFNRVRFUj10cnVlO1xuICAgICAgICBcbiAgICB9XG5cbiAgICBwcml2YXRlIGdldEFsbG9jYXRlR2FtZXJGdW5jdGlvbigpIHtcbiAgICAgICAgLyoqXG4gICAgKiBUaGlzIGZ1bmN0aW9uIHJlcXVpcmVzIGFjY2VzcyB0byBcbiAgICAqIFN5c3RlbXNNYW5hZ2VyXG4gICAgKiAgICAgIHByb2Nlc3MuZW52LlNFU1NJT05fUEFSQU1FVEVSID0gLzxnZXRBcHBSZWZOYW1lPi9zZXNzaW9uXG4gICAgKiBEeW5hbW9EQiBUYWJsZXNcbiAgICAqICAgICAgcHJvY2Vzcy5lbnYuU0VTU0lPTl9DT05UUk9MX1RBQkxFTkFNRSA9IGdldEFwcFJlZk5hbWUrJ1Nlc3Npb25Db250cm9sJ1xuICAgICovXG4gICAgICAgIGxldCBzZXNzaW9uUGFyYW1ldGVyIDogYW55O1xuICAgICAgICBsZXQgcGFyYW1ldGVyTmFtZUZvckxhbWJkYSA6IHN0cmluZztcbiAgICAgICAgaWYgKFNFU1NJT05fUEFSQU1FVEVSKSB7XG4gICAgICAgICAgICBzZXNzaW9uUGFyYW1ldGVyID0gIHRoaXMucHJvcGVydGllcy5nZXRQYXJhbWV0ZXIoJ3BhcmFtZXRlci5zZXNzaW9uJyk7XG4gICAgICAgICAgICBwYXJhbWV0ZXJOYW1lRm9yTGFtYmRhID0gIChzZXNzaW9uUGFyYW1ldGVyKS5uYW1lO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgc2Vzc2lvblBhcmFtZXRlciA9IHsgcGFyYW1ldGVyTmFtZSA6ICcvJyt0aGlzLnByb3BlcnRpZXMuZ2V0QXBwbGljYXRpb25OYW1lKCkudG9Mb2NhbGVMb3dlckNhc2UoKSsnL3Nlc3Npb24nfTtcbiAgICAgICAgICAgIHBhcmFtZXRlck5hbWVGb3JMYW1iZGEgPSBzZXNzaW9uUGFyYW1ldGVyLnBhcmFtZXRlck5hbWU7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHNlc3Npb25Db250cm9sVGFibGUgOiBUYWJsZSA9IDxUYWJsZT4gdGhpcy5wcm9wZXJ0aWVzLmdldFBhcmFtZXRlcigndGFibGUuc2Vzc2lvbmNvbnRyb2wnKTtcbiAgICAgICAgaWYgKHNlc3Npb25QYXJhbWV0ZXIgJiYgc2Vzc2lvbkNvbnRyb2xUYWJsZSkge1xuICAgICAgICAgICAgbGV0IGNyZWF0ZWRGdW5jdGlvbjogTGFtYmRhLkZ1bmN0aW9uID1cbiAgICAgICAgICAgICAgICBuZXcgTGFtYmRhLkZ1bmN0aW9uKHRoaXMsIHRoaXMucHJvcGVydGllcy5nZXRBcHBsaWNhdGlvbk5hbWUoKSArICdBbGxvY2F0ZUdhbWVyRm4nLCB7XG4gICAgICAgICAgICAgICAgICAgIHJ1bnRpbWU6TGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE0X1gsXG4gICAgICAgICAgICAgICAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcbiAgICAgICAgICAgICAgICAgICAgY29kZTogTGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihsYW1iZGFzTG9jYXRpb24sJ2FsbG9jYXRlR2FtZXInKSksXG4gICAgICAgICAgICAgICAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnU0VTU0lPTl9DT05UUk9MX1RBQkxFTkFNRSc6IHNlc3Npb25Db250cm9sVGFibGUudGFibGVOYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ1NFU1NJT05fUEFSQU1FVEVSJzogcGFyYW1ldGVyTmFtZUZvckxhbWJkYVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICwgZnVuY3Rpb25OYW1lOiB0aGlzLnByb3BlcnRpZXMuZ2V0QXBwbGljYXRpb25OYW1lKCkgKyAnQWxsb2NhdGVHYW1lckZuJ1xuICAgICAgICAgICAgICAgICAgICAsIGRlc2NyaXB0aW9uOiAnVGhpcyBmdW5jdGlvbiBzdXBwb3J0cyB0aGUgYWxsb2NhdGlvbiBvZiBnYW1lcnMgd2hlbiB0aGUgZ2FtZSBpcyB0byBzdGFydCdcbiAgICAgICAgICAgICAgICAgICAgLCBtZW1vcnlTaXplOiAxMjhcbiAgICAgICAgICAgICAgICAgICAgLCB0aW1lb3V0OiBEdXJhdGlvbi5zZWNvbmRzKDYwKVxuICAgICAgICAgICAgICAgICAgICAsIHJvbGU6IG5ldyBJQU0uUm9sZSh0aGlzLCB0aGlzLnByb3BlcnRpZXMuZ2V0QXBwbGljYXRpb25OYW1lKCkgKyAnQWxsb2NhdGVHYW1lckZuX1JvbGUnLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICByb2xlTmFtZTogdGhpcy5wcm9wZXJ0aWVzLmdldEFwcGxpY2F0aW9uTmFtZSgpICsgJ0FsbG9jYXRlR2FtZXJGbl9Sb2xlJ1xuICAgICAgICAgICAgICAgICAgICAgICAgLCBhc3N1bWVkQnk6IG5ldyBJQU0uU2VydmljZVByaW5jaXBhbCgnbGFtYmRhLmFtYXpvbmF3cy5jb20nKVxuICAgICAgICAgICAgICAgICAgICAgICAgLCBtYW5hZ2VkUG9saWNpZXMgOiBbIE1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdzZXJ2aWNlLXJvbGUvQVdTTGFtYmRhQmFzaWNFeGVjdXRpb25Sb2xlJykgXVxuICAgICAgICAgICAgICAgICAgICAgICAgLCBpbmxpbmVQb2xpY2llczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdEeW5hbW9EQlBlcm1pc3Npb25zJyA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBJQU0uUG9saWN5RG9jdW1lbnQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVtZW50cyA6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgSUFNLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlcyA6IFsgIHNlc3Npb25Db250cm9sVGFibGUudGFibGVBcm4gXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAsYWN0aW9ucyA6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZHluYW1vZGI6R2V0SXRlbVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJkeW5hbW9kYjpVcGRhdGVJdGVtXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImR5bmFtb2RiOlNjYW5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZHluYW1vZGI6UXVlcnlcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1N5c3RlbXNNYW5hZ2VyUGVybWlzc2lvbnMnOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgSUFNLlBvbGljeURvY3VtZW50KHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlbWVudHMgOiBbICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IElBTS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFsnYXJuOmF3czpzc206Jyt0aGlzLnByb3BlcnRpZXMucmVnaW9uKyc6Jyt0aGlzLnByb3BlcnRpZXMuYWNjb3VudElkKyc6cGFyYW1ldGVyJytzZXNzaW9uUGFyYW1ldGVyLnBhcmFtZXRlck5hbWUgXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uczogWyAnc3NtOkdldFBhcmFtZXRlcicgLCAnc3NtOkdldFBhcmFtZXRlcnMnXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVkRnVuY3Rpb247XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0RGVhbGxvY2F0ZUdhbWVyRnVuY3Rpb24oKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaGlzIGZ1bmN0aW9uIHJlcXVpcmVzIGFjY2VzcyB0byBcbiAgICAgICAgICogU3lzdGVtc01hbmFnZXJcbiAgICAgICAgICogICAgICBwcm9jZXNzLmVudi5TRVNTSU9OX1BBUkFNRVRFUiA9IC88Z2V0QXBwUmVmTmFtZT4vc2Vzc2lvblxuICAgICAgICAgKiBEeW5hbW9EQiBUYWJsZXNcbiAgICAgICAgICogICAgICBwcm9jZXNzLmVudi5TRVNTSU9OX0NPTlRST0xfVEFCTEVOQU1FID0gZ2V0QXBwUmVmTmFtZSsnU2Vzc2lvbkNvbnRyb2wnXG4gICAgICAgICAqL1xuXG4gICAgICAgIGxldCBzZXNzaW9uUGFyYW1ldGVyIDogYW55O1xuICAgICAgICBsZXQgcGFyYW1ldGVyTmFtZSA6IHN0cmluZztcbiAgICAgICAgaWYgKFNFU1NJT05fUEFSQU1FVEVSKSB7XG4gICAgICAgICAgICBzZXNzaW9uUGFyYW1ldGVyID0gIHRoaXMucHJvcGVydGllcy5nZXRQYXJhbWV0ZXIoJ3BhcmFtZXRlci5zZXNzaW9uJyk7XG4gICAgICAgICAgICBwYXJhbWV0ZXJOYW1lID0gIHNlc3Npb25QYXJhbWV0ZXIucmVmO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgIHtcbiAgICAgICAgICAgIHNlc3Npb25QYXJhbWV0ZXIgPSB7IHBhcmFtZXRlck5hbWUgOiAnLycrdGhpcy5wcm9wZXJ0aWVzLmdldEFwcGxpY2F0aW9uTmFtZSgpLnRvTG9jYWxlTG93ZXJDYXNlKCkrJy9zZXNzaW9uJ307XG4gICAgICAgICAgICBwYXJhbWV0ZXJOYW1lID0gc2Vzc2lvblBhcmFtZXRlci5wYXJhbWV0ZXJOYW1lO1xuICAgICAgICB9XG4gICAgICAgIGxldCBzZXNzaW9uQ29udHJvbFRhYmxlOiBUYWJsZSB8IHVuZGVmaW5lZCA9IDxUYWJsZT4gdGhpcy5wcm9wZXJ0aWVzLmdldFBhcmFtZXRlcigndGFibGUuc2Vzc2lvbkNvbnRyb2wnKTtcbiAgICAgICAgaWYgKHNlc3Npb25QYXJhbWV0ZXIgJiYgc2Vzc2lvbkNvbnRyb2xUYWJsZSkge1xuICAgICAgICAgICAgbGV0IGNyZWF0ZWRGdW5jdGlvbjogTGFtYmRhLkZ1bmN0aW9uID1cbiAgICAgICAgICAgICAgICBuZXcgTGFtYmRhLkZ1bmN0aW9uKHRoaXMsIHRoaXMucHJvcGVydGllcy5nZXRBcHBsaWNhdGlvbk5hbWUoKSArICdEZWFsbG9jYXRlR2FtZXJGbicsIHtcbiAgICAgICAgICAgICAgICAgICAgcnVudGltZTpMYW1iZGEuUnVudGltZS5OT0RFSlNfMTRfWCxcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxuICAgICAgICAgICAgICAgICAgICBjb2RlOiBMYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKGxhbWJkYXNMb2NhdGlvbiwnZGVhbGxvY2F0ZUdhbWVyJykpLFxuICAgICAgICAgICAgICAgICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ1NFU1NJT05fQ09OVFJPTF9UQUJMRU5BTUUnOiBzZXNzaW9uQ29udHJvbFRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICdTRVNTSU9OX1BBUkFNRVRFUic6IHBhcmFtZXRlck5hbWVcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAsIGZ1bmN0aW9uTmFtZTogdGhpcy5wcm9wZXJ0aWVzLmdldEFwcGxpY2F0aW9uTmFtZSgpICsgJ0RlYWxsb2NhdGVHYW1lckZuJ1xuICAgICAgICAgICAgICAgICAgICAsIGRlc2NyaXB0aW9uOiAnVGhpcyBmdW5jdGlvbiBkZWFsbG9jYXRlcyB0aGUgZ2FtZXIgd2hlbiBhIHJlbGV2YW50IGV2ZW50IGlzIGlkZW50aWZpZWQgKHNpZ24gb3V0LCBjbG9zZSB3aW5kb3cgZXRjKSdcbiAgICAgICAgICAgICAgICAgICAgLCBtZW1vcnlTaXplOiAxMjhcbiAgICAgICAgICAgICAgICAgICAgLCB0aW1lb3V0OiBEdXJhdGlvbi5zZWNvbmRzKDYwKVxuICAgICAgICAgICAgICAgICAgICAsIHJvbGU6IG5ldyBJQU0uUm9sZSh0aGlzLCB0aGlzLnByb3BlcnRpZXMuZ2V0QXBwbGljYXRpb25OYW1lKCkgKyAnRGVhbGxvY2F0ZUdhbWVyRm5fUm9sZScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJvbGVOYW1lOiB0aGlzLnByb3BlcnRpZXMuZ2V0QXBwbGljYXRpb25OYW1lKCkgKyAnRGVhbGxvY2F0ZUdhbWVyRm5fUm9sZSdcbiAgICAgICAgICAgICAgICAgICAgICAgICwgYXNzdW1lZEJ5OiBuZXcgSUFNLlNlcnZpY2VQcmluY2lwYWwoJ2xhbWJkYS5hbWF6b25hd3MuY29tJylcbiAgICAgICAgICAgICAgICAgICAgICAgICwgbWFuYWdlZFBvbGljaWVzIDogWyBNYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnc2VydmljZS1yb2xlL0FXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZScpIF1cbiAgICAgICAgICAgICAgICAgICAgICAgICwgaW5saW5lUG9saWNpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnRHluYW1vREJQZXJtaXNzaW9ucyc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBJQU0uUG9saWN5RG9jdW1lbnQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVtZW50cyA6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgSUFNLlBvbGljeVN0YXRlbWVudCgge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvdXJjZXMgOiBbIHNlc3Npb25Db250cm9sVGFibGUudGFibGVBcm4gXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9ucyA6IFsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnZHluYW1vZGI6R2V0SXRlbScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnZHluYW1vZGI6VXBkYXRlSXRlbScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnZHluYW1vZGI6U2NhbicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnZHluYW1vZGI6UXVlcnknXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnU3lzdGVtc01hbmFnZXJQZXJtaXNzaW9ucyc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBJQU0uUG9saWN5RG9jdW1lbnQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVtZW50cyA6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgSUFNLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlcyA6IFsgJ2Fybjphd3M6c3NtOicrdGhpcy5wcm9wZXJ0aWVzLnJlZ2lvbisnOicrdGhpcy5wcm9wZXJ0aWVzLmFjY291bnRJZCsnOnBhcmFtZXRlcicrc2Vzc2lvblBhcmFtZXRlci5wYXJhbWV0ZXJOYW1lIF1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAsYWN0aW9uczogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnc3NtOkdldFBhcmFtZXRlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdzc206R2V0UGFyYW1ldGVycydcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gY3JlYXRlZEZ1bmN0aW9uO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBwcml2YXRlIGdldFNjb3JlYm9hcmRGdW5jdGlvbigpIHtcblxuICAgICAgICBsZXQgZGxxID0gbmV3IFNRUy5RdWV1ZSh0aGlzLCB0aGlzLnByb3BlcnRpZXMuZ2V0QXBwbGljYXRpb25OYW1lKCkgKyAnRExRJywge1xuICAgICAgICAgICAgcXVldWVOYW1lOiB0aGlzLnByb3BlcnRpZXMuZ2V0QXBwbGljYXRpb25OYW1lKCkgKyAnRExRJ1xuICAgICAgICB9KVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaGlzIGZ1bmN0aW9uIHJlcXVpcmVzIGFjY2VzcyB0byBcbiAgICAgICAgICogUXVldWVcbiAgICAgICAgICogICAgICBwcm9jZXNzLmVudi5ETFFfVVJMID0gXCJodHRwczovL3Nxcy48cmVnaW9uPi5hbWF6b25hd3MuY29tLzxhY2NvdW50Pi88ZW52TmFtZT5fRExRXCJcbiAgICAgICAgICogU3lzdGVtc01hbmFnZXJcbiAgICAgICAgICogICAgICBwcm9jZXNzLmVudi5TRVNTSU9OX1BBUkFNRVRFUiA9IC88Z2V0QXBwUmVmTmFtZT4vc2Vzc2lvblxuICAgICAgICAgKiBEeW5hbW9EQiBUYWJsZXNcbiAgICAgICAgICogICAgICBwcm9jZXNzLmVudi5TRVNTSU9OX1RBQkxFTkFNRSA9IGdldEFwcFJlZk5hbWUrJ1Nlc3Npb24nXG4gICAgICAgICAqICAgICAgcHJvY2Vzcy5lbnYuU0VTU0lPTl9DT05UUk9MX1RBQkxFTkFNRSA9IGdldEFwcFJlZk5hbWUrJ1Nlc3Npb25Db250cm9sJ1xuICAgICAgICAgKiAgICAgIHByb2Nlc3MuZW52LlNFU1NJT05UT1BYX1RBQkxFTkFNRSA9IGdldEFwcFJlZk5hbWUrJ1Nlc3Npb25Ub3BYJ1xuICAgICAgICAgKi9cbiAgICAgICAgbGV0IHNlc3Npb25QYXJhbWV0ZXIgOiBhbnk7XG4gICAgICAgIGxldCBwYXJhbWV0ZXJOYW1lIDogc3RyaW5nO1xuICAgICAgICBpZiAoU0VTU0lPTl9QQVJBTUVURVIpIHtcbiAgICAgICAgICAgIHNlc3Npb25QYXJhbWV0ZXIgPSB0aGlzLnByb3BlcnRpZXMuZ2V0UGFyYW1ldGVyKCdwYXJhbWV0ZXIuc2Vzc2lvbicpO1xuICAgICAgICAgICAgcGFyYW1ldGVyTmFtZSA9IHNlc3Npb25QYXJhbWV0ZXIucmVmO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2Vzc2lvblBhcmFtZXRlciA9IHsgcGFyYW1ldGVyTmFtZSA6ICcvJyt0aGlzLnByb3BlcnRpZXMuZ2V0QXBwbGljYXRpb25OYW1lKCkudG9Mb2NhbGVMb3dlckNhc2UoKSsnL3Nlc3Npb24nfTtcbiAgICAgICAgICAgIHBhcmFtZXRlck5hbWUgPSBzZXNzaW9uUGFyYW1ldGVyLnBhcmFtZXRlck5hbWU7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHNlc3Npb25Db250cm9sVGFibGU6IFRhYmxlIHwgdW5kZWZpbmVkID0gPFRhYmxlPiB0aGlzLnByb3BlcnRpZXMuZ2V0UGFyYW1ldGVyKCd0YWJsZS5zZXNzaW9uQ29udHJvbCcpO1xuICAgICAgICBsZXQgc2Vzc2lvblRvcFg6IFRhYmxlIHwgdW5kZWZpbmVkID0gPFRhYmxlPiB0aGlzLnByb3BlcnRpZXMuZ2V0UGFyYW1ldGVyKCd0YWJsZS5zZXNzaW9uVG9wWCcpO1xuICAgICAgICBsZXQgc2Vzc2lvblRhYmxlOiBUYWJsZSB8IHVuZGVmaW5lZCA9IDxUYWJsZT4gdGhpcy5wcm9wZXJ0aWVzLmdldFBhcmFtZXRlcigndGFibGUuc2Vzc2lvbicpO1xuICAgICAgICBpZiAoc2Vzc2lvblBhcmFtZXRlciAmJiBzZXNzaW9uQ29udHJvbFRhYmxlICYmIHNlc3Npb25Ub3BYICYmIHNlc3Npb25UYWJsZSkge1xuICAgICAgICAgICAgbGV0IGNyZWF0ZWRGdW5jdGlvbjogTGFtYmRhLkZ1bmN0aW9uID1cbiAgICAgICAgICAgICAgICBuZXcgTGFtYmRhLkZ1bmN0aW9uKHRoaXMsIHRoaXMucHJvcGVydGllcy5nZXRBcHBsaWNhdGlvbk5hbWUoKSArICdTY29yZWJvYXJkRm4nLCB7XG4gICAgICAgICAgICAgICAgICAgIHJ1bnRpbWU6TGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE0X1gsXG4gICAgICAgICAgICAgICAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcbiAgICAgICAgICAgICAgICAgICAgY29kZTogTGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihsYW1iZGFzTG9jYXRpb24sJ3Njb3JlYm9hcmQnKSksXG4gICAgICAgICAgICAgICAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnRExRX1VSTCc6IGRscS5xdWV1ZVVybCxcbiAgICAgICAgICAgICAgICAgICAgICAgICdTRVNTSU9OX1BBUkFNRVRFUic6IHBhcmFtZXRlck5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAnU0VTU0lPTl9UQUJMRU5BTUUnOiBzZXNzaW9uVGFibGUudGFibGVOYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ1NFU1NJT05fQ09OVFJPTF9UQUJMRU5BTUUnOiBzZXNzaW9uQ29udHJvbFRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICdTRVNTSU9OX1RPUFhfVEFCTEVOQU1FJzogc2Vzc2lvblRvcFgudGFibGVOYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ1RvcFhWYWx1ZSc6ICcxMCdcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAsIGZ1bmN0aW9uTmFtZTogdGhpcy5wcm9wZXJ0aWVzLmdldEFwcGxpY2F0aW9uTmFtZSgpICsgJ1Njb3JlYm9hcmRGbidcbiAgICAgICAgICAgICAgICAgICAgLCBkZXNjcmlwdGlvbjogJ1RoaXMgZnVuY3Rpb24gY29tcHV0ZXMgdGhlIHNjb3JlYm9hcmQnXG4gICAgICAgICAgICAgICAgICAgICwgbWVtb3J5U2l6ZTogMTI4XG4gICAgICAgICAgICAgICAgICAgICwgdGltZW91dDogRHVyYXRpb24uc2Vjb25kcyg2MClcbiAgICAgICAgICAgICAgICAgICAgLCByb2xlOiBuZXcgSUFNLlJvbGUodGhpcywgdGhpcy5wcm9wZXJ0aWVzLmdldEFwcGxpY2F0aW9uTmFtZSgpICsgJ1Njb3JlYm9hcmRGbl9Sb2xlJywge1xuICAgICAgICAgICAgICAgICAgICAgICAgcm9sZU5hbWU6IHRoaXMucHJvcGVydGllcy5nZXRBcHBsaWNhdGlvbk5hbWUoKSArICdTY29yZWJvYXJkRm5fUm9sZSdcbiAgICAgICAgICAgICAgICAgICAgICAgICwgYXNzdW1lZEJ5OiBuZXcgSUFNLlNlcnZpY2VQcmluY2lwYWwoJ2xhbWJkYS5hbWF6b25hd3MuY29tJylcbiAgICAgICAgICAgICAgICAgICAgICAgICwgbWFuYWdlZFBvbGljaWVzIDogWyBNYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnc2VydmljZS1yb2xlL0FXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZScpIF1cbiAgICAgICAgICAgICAgICAgICAgICAgICwgaW5saW5lUG9saWNpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnRHluYW1vREJQZXJtaXNzaW9ucyc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBJQU0uUG9saWN5RG9jdW1lbnQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVtZW50cyA6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgSUFNLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlcyA6IFsgJ2Fybjphd3M6ZHluYW1vZGI6JyArIHRoaXMucHJvcGVydGllcy5yZWdpb24gKyAnOicgKyB0aGlzLnByb3BlcnRpZXMuYWNjb3VudElkICsgJzp0YWJsZS8nICsgdGhpcy5wcm9wZXJ0aWVzLmdldEFwcGxpY2F0aW9uTmFtZSgpICsgJyonIF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnZHluYW1vZGI6R2V0SXRlbSdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICwnZHluYW1vZGI6VXBkYXRlSXRlbSdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICwnZHluYW1vZGI6U2NhbidcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICwnZHluYW1vZGI6UXVlcnknXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAsJ2R5bmFtb2RiOkJhdGNoKidcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICwnZHluYW1vZGI6UHV0SXRlbSdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICwnZHluYW1vZGI6RGVsZXRlSXRlbSdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdTeXN0ZW1zTWFuYWdlclBlcm1pc3Npb25zJzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IElBTS5Qb2xpY3lEb2N1bWVudCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZW1lbnRzIDogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBJQU0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlcyA6IFsgJ2Fybjphd3M6c3NtOicgKyB0aGlzLnByb3BlcnRpZXMucmVnaW9uICsgJzonICsgdGhpcy5wcm9wZXJ0aWVzLmFjY291bnRJZCArICc6cGFyYW1ldGVyLycgKyB0aGlzLnByb3BlcnRpZXMuZ2V0QXBwbGljYXRpb25OYW1lKCkudG9Mb3dlckNhc2UoKSArICcqJyBdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICxhY3Rpb25zIDogWyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnc3NtOkdldConXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAsJ3NzbTpMaXN0KidcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdTUVNQZXJtaXNzaW9ucyc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBJQU0uUG9saWN5RG9jdW1lbnQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVtZW50cyA6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgSUFNLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvdXJjZXMgOiBbIGRscS5xdWV1ZUFybiBdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICxhY3Rpb25zIDpbICdzcXM6U2VuZE1lc3NhZ2UnIF1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnS2luZXNpc1Blcm1pc3Npb25zJzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IElBTS5Qb2xpY3lEb2N1bWVudCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZW1lbnRzIDogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBJQU0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlcyA6IFtcIipcIl1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLCBhY3Rpb25zIDogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJraW5lc2lzOlN1YnNjcmliZVRvU2hhcmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwia2luZXNpczpHZXRTaGFyZEl0ZXJhdG9yXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImtpbmVzaXM6R2V0UmVjb3Jkc1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJraW5lc2lzOkRlc2NyaWJlU3RyZWFtXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gY3JlYXRlZEZ1bmN0aW9uO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG59Il19
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestionConsumptionLayer = void 0;
const resourceawarestack_1 = require("./../resourceawarestack");
const KDS = require("aws-cdk-lib/aws-kinesis");
const KDF = require("aws-cdk-lib/aws-kinesisfirehose");
const IAM = require("aws-cdk-lib/aws-iam");
const APIGTW = require("aws-cdk-lib/aws-apigateway");
const Lambda = require("aws-cdk-lib/aws-lambda");
const Logs = require("aws-cdk-lib/aws-logs");
const aws_lambda_event_sources_1 = require("aws-cdk-lib/aws-lambda-event-sources");
const aws_iam_1 = require("aws-cdk-lib/aws-iam");
class IngestionConsumptionLayer extends resourceawarestack_1.ResourceAwareConstruct {
    constructor(parent, name, props) {
        super(parent, name, props);
        this.KINESIS_INTEGRATION = false;
        this.FIREHOSE = false;
        // Checking if we want to have the Kinesis Data Streams integration deployed
        if (props && props.getParameter("kinesisintegration"))
            this.KINESIS_INTEGRATION = true;
        // Checking if we want to have the Kinesis Firehose depployed
        if (props && props.getParameter("firehose"))
            this.FIREHOSE = true;
        if (this.FIREHOSE)
            this.rawbucketarn = props.getParameter('rawbucketarn');
        this.userpool = props.getParameter('userpool');
        this.createKinesis(props);
        this.createAPIGateway(props);
        this.updateUsersRoles(props);
    }
    createKinesis(props) {
        this.kinesisStreams = new KDS.Stream(this, props.getApplicationName() + 'InputStream', {
            streamName: props.getApplicationName() + '_InputStream',
            shardCount: 1
        });
        // MISSING KINESIS INTEGRATION
        if (this.KINESIS_INTEGRATION) {
            new aws_lambda_event_sources_1.KinesisEventSource(this.kinesisStreams, {
                batchSize: 700,
                startingPosition: Lambda.StartingPosition.LATEST
            }).bind(props.getParameter('lambda.scoreboard'));
        }
        // MISSING KINESIS FIREHOSE
        //section starts here
        if (this.FIREHOSE) {
            let firehoseName = props.getApplicationName() + '_Firehose';
            let firehoseLogGroupName = '/aws/kinesisfirehose/' + firehoseName;
            let firehoseLogGroup = new Logs.LogGroup(this, props.getApplicationName() + 'firehoseloggroup', {
                logGroupName: firehoseLogGroupName
            });
            new Logs.LogStream(this, props.getApplicationName() + 'firehoselogstream', {
                logGroup: firehoseLogGroup,
                logStreamName: "error"
            });
            let self = this;
            let firehoseRole = new IAM.Role(this, props.getApplicationName() + 'FirehoseToStreamsRole', {
                roleName: props.getApplicationName() + 'FirehoseToStreamsRole',
                assumedBy: new IAM.ServicePrincipal('firehose.amazonaws.com'),
                inlinePolicies: {
                    'GluePermissions': new IAM.PolicyDocument({
                        statements: [
                            new aws_iam_1.PolicyStatement({
                                actions: [
                                    "glue:GetTableVersions"
                                ],
                                resources: ["*"]
                            })
                        ]
                    }),
                    'S3RawDataPermission': new IAM.PolicyDocument({
                        statements: [
                            new aws_iam_1.PolicyStatement({
                                actions: [
                                    's3:AbortMultipartUpload',
                                    's3:GetBucketLocation',
                                    's3:GetObject',
                                    's3:ListBucket',
                                    's3:ListBucketMultipartUploads',
                                    's3:PutObject',
                                ],
                                resources: [
                                    self.rawbucketarn,
                                    self.rawbucketarn + '/*'
                                ]
                            })
                        ]
                    }),
                    'DefaultFirehoseLambda': new IAM.PolicyDocument({
                        statements: [
                            new aws_iam_1.PolicyStatement({
                                actions: [
                                    "lambda:InvokeFunction",
                                    "lambda:GetFunctionConfiguration"
                                ],
                                resources: [
                                    "arn:aws:lambda:" + props.region + ":" + props.accountId + ":function:%FIREHOSE_DEFAULT_FUNCTION%:%FIREHOSE_DEFAULT_VERSION%"
                                ]
                            })
                        ]
                    }),
                    'InputStreamReadPermissions': new aws_iam_1.PolicyDocument({
                        statements: [
                            new aws_iam_1.PolicyStatement({
                                actions: [
                                    'kinesis:DescribeStream',
                                    'kinesis:GetShardIterator',
                                    'kinesis:GetRecords'
                                ],
                                resources: [
                                    this.kinesisStreams.streamArn
                                ]
                            })
                        ]
                    }),
                    'CloudWatchLogsPermissions': new aws_iam_1.PolicyDocument({
                        statements: [
                            new aws_iam_1.PolicyStatement({
                                actions: ['logs:PutLogEvents'],
                                resources: [
                                    'arn:aws:logs:' + props.region + ':' + props.accountId + ':log-group:/' + firehoseLogGroupName + ':log-stream:*'
                                ]
                            })
                        ]
                    })
                }
            });
            this.kinesisFirehose = new KDF.CfnDeliveryStream(this, props.getApplicationName() + 'RawData', {
                deliveryStreamType: 'KinesisStreamAsSource',
                deliveryStreamName: firehoseName,
                kinesisStreamSourceConfiguration: {
                    kinesisStreamArn: this.kinesisStreams.streamArn,
                    roleArn: firehoseRole.roleArn
                },
                s3DestinationConfiguration: {
                    bucketArn: this.rawbucketarn,
                    bufferingHints: {
                        intervalInSeconds: 300,
                        sizeInMBs: 1
                    },
                    compressionFormat: 'GZIP',
                    roleArn: firehoseRole.roleArn,
                    cloudWatchLoggingOptions: {
                        enabled: true,
                        logGroupName: firehoseLogGroupName,
                        logStreamName: firehoseLogGroupName
                    }
                }
            });
            this.kinesisFirehose.node.addDependency(firehoseLogGroup);
        }
    }
    createAPIGateway(props) {
        let apirole = new IAM.Role(this, props.getApplicationName() + 'APIRole', {
            roleName: props.getApplicationName() + 'API',
            assumedBy: new IAM.ServicePrincipal('apigateway.amazonaws.com')
        });
        apirole.addToPolicy(new IAM.PolicyStatement({
            actions: ['lambda:InvokeFunction', 'lambda:InvokeAsync'],
            resources: ['arn:aws:lambda:' + props.region + ':' + props.accountId + ':function:' + props.getApplicationName() + '*']
        }));
        apirole.addToPolicy(new IAM.PolicyStatement({
            actions: [
                "ssm:GetParameterHistory",
                "ssm:GetParametersByPath",
                "ssm:GetParameters",
                "ssm:GetParameter"
            ],
            resources: ['arn:aws:ssm:'.concat(props.region, ':', props.accountId, ':parameter/', props.getApplicationName().toLowerCase(), '/*')]
        }));
        apirole.addToPolicy(new IAM.PolicyStatement({
            actions: ['dynamodb:GetItem'],
            resources: [
                props.getParameter('table.session').tableArn,
                props.getParameter('table.sessiontopx').tableArn
            ]
        }));
        apirole.addToPolicy(new IAM.PolicyStatement({
            actions: ['kinesis:PutRecord', 'kinesis:PutRecords'],
            resources: [this.kinesisStreams.streamArn]
        }));
        apirole.addManagedPolicy(IAM.ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonAPIGatewayPushToCloudWatchLogs"));
        this.api = new APIGTW.CfnRestApi(this, props.getApplicationName() + "API", {
            name: props.getApplicationName().toLowerCase(),
            description: 'API supporting the application ' + props.getApplicationName()
        });
        new APIGTW.CfnGatewayResponse(this, props.getApplicationName() + 'GTWResponse', {
            restApiId: this.api.ref,
            responseType: 'DEFAULT_4XX',
            responseParameters: {
                "gatewayresponse.header.Access-Control-Allow-Headers": "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
                "gatewayresponse.header.Access-Control-Allow-Methods": "'*'",
                "gatewayresponse.header.Access-Control-Allow-Origin": "'*'"
            },
            responseTemplates: {
                "application/json": "{\"message\":$context.error.messageString}"
            }
        }).addDependsOn(this.api);
        let authorizer = new APIGTW.CfnAuthorizer(this, props.getApplicationName() + "Authorizer", {
            name: props.getApplicationName().toLowerCase() + 'Authorizer',
            restApiId: this.api.ref,
            type: 'COGNITO_USER_POOLS',
            identitySource: 'method.request.header.Authorization',
            providerArns: [
                this.userpool
            ]
        });
        let apiModelScoreboardResponse = new APIGTW.CfnModel(this, props.getApplicationName() + 'APIModelScoreboardResponseModel', {
            contentType: 'application/json',
            description: 'Scoreboard response model (for /scoreboard/GET)',
            name: 'ScoreboardResponseModel',
            restApiId: this.api.ref,
            schema: {
                "$schema": "http://json-schema.org/draft-04/schema#",
                "title": "ScoreboardResponseModel",
                "type": "object",
                "properties": {
                    "Scoreboard": {
                        "type": "array",
                        "items": {
                            "$ref": "#/definitions/GamerScore"
                        }
                    }
                },
                "definitions": {
                    "GamerScore": {
                        "type": "object",
                        "properties": {
                            "Name": { "type": "integer" },
                            "Score": { "type": "integer" },
                            "Level": { "type": "integer" },
                            "Shots": { "type": "integer" },
                            "Nickname": { "type": "string" },
                            "Lives": { "type": "integer" }
                        }
                    }
                }
            }
        });
        let apiModelGetParametersRequest = new APIGTW.CfnModel(this, props.getApplicationName() + 'APIModelGetParametersRequest', {
            contentType: 'application/json',
            description: 'Model to request SSM:GetParameters',
            name: 'GetParametersRequest',
            restApiId: this.api.ref,
            schema: {
                "$schema": "http://json-schema.org/draft-04/schema#",
                "title": "GetParametersRequest",
                "type": "object",
                "properties": {
                    "names": { "type": "array" }
                }
            }
        });
        //Version 1 of the API
        let v1 = new APIGTW.CfnResource(this, props.getApplicationName() + "APIv1", {
            parentId: this.api.attrRootResourceId,
            pathPart: 'v1',
            restApiId: this.api.ref
        });
        /**
         * SESSION resource /session
         * GET {no parameter} - returns session data from ssm.parameter /ssm/session
         *
         */
        let session = new APIGTW.CfnResource(this, props.getApplicationName() + "APIv1session", {
            parentId: v1.ref,
            pathPart: 'session',
            restApiId: this.api.ref
        });
        let sessionGetMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1sessionGET", {
            restApiId: this.api.ref,
            resourceId: session.ref,
            authorizationType: APIGTW.AuthorizationType.COGNITO,
            authorizerId: authorizer.ref,
            httpMethod: 'GET',
            requestParameters: {
                'method.request.querystring.Name': true,
                'method.request.header.Authentication': true
            },
            requestModels: undefined,
            integration: {
                passthroughBehavior: 'WHEN_NO_MATCH',
                integrationHttpMethod: 'POST',
                type: 'AWS',
                uri: 'arn:aws:apigateway:' + props.region + ':ssm:action/GetParameter',
                credentials: apirole.roleArn,
                requestParameters: {
                    'integration.request.querystring.Name': "'/" + props.getApplicationName().toLowerCase() + "/session'",
                    'integration.request.header.Authentication': 'method.request.header.Authentication'
                },
                requestTemplates: undefined,
                integrationResponses: [
                    {
                        statusCode: '200',
                        responseParameters: {
                            'method.response.header.Access-Control-Allow-Origin': "'*'"
                        },
                        responseTemplates: {
                            'application/json': `"$util.escapeJavaScript("$input.path('$').GetParameterResponse.GetParameterResult.Parameter.Value").replaceAll("\'",'"')"`
                        }
                    }
                ]
            },
            methodResponses: [
                {
                    statusCode: '200',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': false
                    },
                    responseModels: {
                        'application/json': 'Empty'
                    }
                }
            ]
        });
        // OPTIONS
        let sessionOptionsMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1sessionOPTIONS", {
            restApiId: this.api.ref,
            resourceId: session.ref,
            authorizationType: APIGTW.AuthorizationType.NONE,
            httpMethod: 'OPTIONS',
            integration: {
                passthroughBehavior: 'WHEN_NO_MATCH',
                type: 'MOCK',
                requestTemplates: {
                    'application/json': '{\"statusCode\": 200}'
                },
                integrationResponses: [
                    {
                        statusCode: '200',
                        responseParameters: {
                            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
                            'method.response.header.Access-Control-Allow-Methods': "'*'",
                            'method.response.header.Access-Control-Allow-Origin': "'*'"
                        }
                    }
                ]
            },
            methodResponses: [
                {
                    statusCode: '200',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': false,
                        'method.response.header.Access-Control-Allow-Methods': false,
                        'method.response.header.Access-Control-Allow-Headers': false
                    },
                    responseModels: {
                        "application/json": 'Empty'
                    }
                }
            ]
        });
        /**
         * Websocket resource /websocket
         * GET {no parameter} - returns websocketURL data from ssm.parameter /ssm/websocket
         *
         */
        let websocketResourceOnRESTAPI = new APIGTW.CfnResource(this, props.getApplicationName() + "APIv1websocket", {
            parentId: v1.ref,
            pathPart: 'websocket',
            restApiId: this.api.ref
        });
        let websocketGetMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1websocketGET", {
            restApiId: this.api.ref,
            resourceId: websocketResourceOnRESTAPI.ref,
            authorizationType: APIGTW.AuthorizationType.COGNITO,
            authorizerId: authorizer.ref,
            httpMethod: 'GET',
            requestParameters: {
                'method.request.querystring.Name': true,
                'method.request.header.Authentication': true
            },
            requestModels: undefined,
            integration: {
                passthroughBehavior: 'WHEN_NO_MATCH',
                integrationHttpMethod: 'POST',
                type: 'AWS',
                uri: 'arn:aws:apigateway:' + props.region + ':ssm:action/GetParameter',
                credentials: apirole.roleArn,
                requestParameters: {
                    'integration.request.querystring.Name': "'/" + props.getApplicationName().toLowerCase() + "/websocket'",
                    'integration.request.header.Authentication': 'method.request.header.Authentication'
                },
                requestTemplates: undefined,
                integrationResponses: [
                    {
                        statusCode: '200',
                        responseParameters: {
                            'method.response.header.Access-Control-Allow-Origin': "'*'"
                        },
                        responseTemplates: {
                            'application/json': `"$util.escapeJavaScript("$input.path('$').GetParameterResponse.GetParameterResult.Parameter.Value").replaceAll("\'",'"')"`
                        }
                    }
                ]
            },
            methodResponses: [
                {
                    statusCode: '200',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': false
                    },
                    responseModels: {
                        'application/json': 'Empty'
                    }
                }
            ]
        });
        // OPTIONS
        let websocketOptionsMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1websocketOPTIONS", {
            restApiId: this.api.ref,
            resourceId: websocketResourceOnRESTAPI.ref,
            authorizationType: APIGTW.AuthorizationType.NONE,
            httpMethod: 'OPTIONS',
            integration: {
                passthroughBehavior: 'WHEN_NO_MATCH',
                type: 'MOCK',
                requestTemplates: {
                    'application/json': '{\"statusCode\": 200}'
                },
                integrationResponses: [
                    {
                        statusCode: '200',
                        responseParameters: {
                            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
                            'method.response.header.Access-Control-Allow-Methods': "'*'",
                            'method.response.header.Access-Control-Allow-Origin': "'*'"
                        }
                    }
                ]
            },
            methodResponses: [
                {
                    statusCode: '200',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': false,
                        'method.response.header.Access-Control-Allow-Methods': false,
                        'method.response.header.Access-Control-Allow-Headers': false
                    },
                    responseModels: {
                        "application/json": 'Empty'
                    }
                }
            ]
        });
        /**
         * CONFIG
         * Resource: /config
         * Method: GET
         * Request Parameters : none
         * Response format:
            {
            "Parameters": [
                {
                "Name": "/<app>/clientid",
                "Value": "4tfe5l26kdp59tc4k4v0b688nm"
                },
                {
                "Name": "/<app>/identitypoolid",
                "Value": "<region>:17092df6-7e3a-4893-4d85-c6de33cdfabc"
                },
                {
                "Name": "/<app>>/userpoolid",
                "Value": "<region>_ueLfdaSXi"
                },
                {
                "Name": "/<app>>/userpoolurl",
                "Value": "cognito-idp.<region>>.amazonaws.com/<region>_ueLfdaSXi"
                }
            ]
            }
         */
        let config = new APIGTW.CfnResource(this, props.getApplicationName() + "APIv1config", {
            parentId: v1.ref,
            pathPart: 'config',
            restApiId: this.api.ref
        });
        // GET
        let configGetMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1configGET", {
            restApiId: this.api.ref,
            resourceId: config.ref,
            authorizationType: APIGTW.AuthorizationType.NONE,
            httpMethod: 'GET',
            requestParameters: {
                'method.request.header.Content-Type': true,
                'method.request.header.X-Amz-Target': true
            },
            requestModels: {
                'application/json': apiModelGetParametersRequest.ref
            },
            integration: {
                integrationHttpMethod: 'POST',
                type: 'AWS',
                uri: 'arn:aws:apigateway:' + props.region + ':ssm:path//',
                credentials: apirole.roleArn,
                requestParameters: {
                    'integration.request.header.Content-Type': "'application/x-amz-json-1.1'",
                    'integration.request.header.X-Amz-Target': "'AmazonSSM.GetParameters'"
                },
                requestTemplates: {
                    'application/json': '{"Names" : [' +
                        '"/' + props.getApplicationName().toLowerCase() + '/userpoolid",' +
                        '"/' + props.getApplicationName().toLowerCase() + '/userpoolurl",' +
                        '"/' + props.getApplicationName().toLowerCase() + '/clientid",' +
                        '"/' + props.getApplicationName().toLowerCase() + '/identitypoolid"' +
                        ']}'
                },
                passthroughBehavior: 'WHEN_NO_TEMPLATES',
                integrationResponses: [
                    {
                        statusCode: '200',
                        responseParameters: {
                            'method.response.header.Access-Control-Allow-Origin': "'*'"
                        },
                        responseTemplates: {
                            'application/json': `
                                #set($inputRoot = $input.path('$'))
                                {
                                    "Parameters" : [
                                        #foreach($elem in $inputRoot.Parameters)
                                        {
                                            "Name" : "$elem.Name",
                                            "Value" :  "$util.escapeJavaScript("$elem.Value").replaceAll("'",'"')"
                                        } 
                                        #if($foreach.hasNext),#end
                                    #end
                                ]
                                }`
                        }
                    }
                ]
            },
            methodResponses: [
                {
                    statusCode: '200',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': true
                    },
                    responseModels: {
                        'application/json': 'Empty'
                    }
                }
            ]
        });
        // OPTIONS
        let configOptionsMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1configOPTIONS", {
            restApiId: this.api.ref,
            resourceId: config.ref,
            authorizationType: APIGTW.AuthorizationType.NONE,
            httpMethod: 'OPTIONS',
            integration: {
                passthroughBehavior: 'when_no_match',
                type: 'MOCK',
                requestTemplates: {
                    'application/json': `{\"statusCode\": 200}`
                },
                integrationResponses: [
                    {
                        statusCode: '200',
                        responseParameters: {
                            'method.response.header.Access-Control-Allow-Origin': "'*'",
                            'method.response.header.Access-Control-Allow-Methods': "'*'",
                            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
                        }
                    }
                ]
            },
            methodResponses: [
                {
                    statusCode: '200',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': true,
                        'method.response.header.Access-Control-Allow-Methods': true,
                        'method.response.header.Access-Control-Allow-Headers': true
                    },
                    responseModels: {
                        'application/json': 'Empty'
                    }
                }
            ]
        });
        /**
         * ALLOCATE
         * Resource: /allocate
         * Method: POST
         * Request format: { 'Username' : '<the user name>'}
         */
        let allocate = new APIGTW.CfnResource(this, props.getApplicationName() + "APIv1allocate", {
            parentId: v1.ref,
            pathPart: 'allocate',
            restApiId: this.api.ref
        });
        let lambdaAllocate = props.getParameter('lambda.allocate');
        // POST
        let allocatePostMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1allocatePOST", {
            restApiId: this.api.ref,
            resourceId: allocate.ref,
            authorizationType: APIGTW.AuthorizationType.COGNITO,
            authorizerId: authorizer.ref,
            httpMethod: 'POST',
            integration: {
                passthroughBehavior: 'WHEN_NO_MATCH',
                integrationHttpMethod: 'POST',
                type: 'AWS_PROXY',
                uri: 'arn:aws:apigateway:' + props.region + ':lambda:path/2015-03-31/functions/' + lambdaAllocate.functionArn + '/invocations',
                credentials: apirole.roleArn
                //  , uri: 'arn:aws:apigateway:' + props.region + ':lambda:path/2015-03-31/functions/' + props.getParameter('lambda.allocate') + '/invocations'
            },
            methodResponses: [
                {
                    statusCode: '200'
                }
            ]
        });
        /* TO BE IMPLEMENTED ON CDK
                lambdaAllocate.addEventSource(
                    new ApiEventSource( 'POST','/v1/allocate',{
                           authorizationType : APIGTW.AuthorizationType.COGNITO
                         , authorizerId : authorizer.ref
                    })
                );
        */
        // OPTIONS
        let allocateOptionsMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1allocateOPTIONS", {
            restApiId: this.api.ref,
            resourceId: allocate.ref,
            authorizationType: APIGTW.AuthorizationType.NONE,
            httpMethod: 'OPTIONS',
            integration: {
                passthroughBehavior: 'WHEN_NO_MATCH',
                type: 'MOCK',
                requestTemplates: {
                    'application/json': `{\"statusCode\": 200}`
                },
                integrationResponses: [
                    {
                        statusCode: '200',
                        responseParameters: {
                            'method.response.header.Access-Control-Allow-Origin': "'*'",
                            'method.response.header.Access-Control-Allow-Methods': "'*'",
                            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
                        }
                    }
                ]
            },
            methodResponses: [
                {
                    statusCode: '200',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': true,
                        'method.response.header.Access-Control-Allow-Methods': true,
                        'method.response.header.Access-Control-Allow-Headers': true
                    },
                    responseModels: {
                        'application/json': 'Empty'
                    }
                }
            ]
        });
        /**
         * DEALLOCATE
         * Resource: /deallocate
         * Method: POST
         * Request format: { 'Username' : '<the user name>'}
         */
        let deallocate = new APIGTW.CfnResource(this, props.getApplicationName() + "APIv1deallocate", {
            parentId: v1.ref,
            pathPart: 'deallocate',
            restApiId: this.api.ref
        });
        // POST
        let deallocatePostMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1deallocatePOST", {
            restApiId: this.api.ref,
            resourceId: deallocate.ref,
            authorizationType: APIGTW.AuthorizationType.COGNITO,
            authorizerId: authorizer.ref,
            httpMethod: 'POST',
            integration: {
                integrationHttpMethod: 'POST',
                type: 'AWS_PROXY',
                contentHandling: "CONVERT_TO_TEXT",
                uri: 'arn:aws:apigateway:' + props.region + ':lambda:path/2015-03-31/functions/' + props.getParameter('lambda.deallocate') + '/invocations',
                credentials: apirole.roleArn
            },
            methodResponses: [
                {
                    statusCode: '200'
                }
            ]
        });
        // OPTIONS
        let deallocateOptionsMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1deallocateOPTIONS", {
            restApiId: this.api.ref,
            resourceId: deallocate.ref,
            authorizationType: APIGTW.AuthorizationType.NONE,
            httpMethod: 'OPTIONS',
            integration: {
                passthroughBehavior: 'when_no_match',
                type: 'MOCK',
                requestTemplates: {
                    'application/json': `{\"statusCode\": 200}`
                },
                integrationResponses: [
                    {
                        statusCode: '200',
                        responseParameters: {
                            'method.response.header.Access-Control-Allow-Origin': "'*'",
                            'method.response.header.Access-Control-Allow-Methods': "'*'",
                            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
                        }
                    }
                ]
            },
            methodResponses: [
                {
                    statusCode: '200',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': true,
                        'method.response.header.Access-Control-Allow-Methods': true,
                        'method.response.header.Access-Control-Allow-Headers': true
                    },
                    responseModels: {
                        'application/json': 'Empty'
                    }
                }
            ]
        });
        /**
         * SCOREBOARD
         * Resource: /deallocate
         * Method: GET
         * Request format:
         *      querystring: sessionId=<<Session Id>>
         * Response format:
         * {
                "Scoreboard": [
                    {
                    "Score": 7055,
                    "Level": 13,
                    "Shots": 942,
                    "Nickname": "PSC",
                    "Lives": 3
                    }..,
                ]
            }
         */
        let scoreboard = new APIGTW.CfnResource(this, props.getApplicationName() + "APIv1scoreboard", {
            parentId: v1.ref,
            pathPart: 'scoreboard',
            restApiId: this.api.ref
        });
        // POST
        let scoreboardPostMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1scoreboardPOST", {
            restApiId: this.api.ref,
            resourceId: scoreboard.ref,
            authorizationType: APIGTW.AuthorizationType.COGNITO,
            authorizerId: authorizer.ref,
            httpMethod: 'GET',
            requestParameters: {
                'method.request.querystring.sessionId': true
            },
            integration: {
                integrationHttpMethod: 'POST',
                type: 'AWS',
                uri: 'arn:aws:apigateway:' + props.region + ':dynamodb:action/GetItem',
                credentials: apirole.roleArn,
                requestParameters: {
                    'integration.request.querystring.sessionId': 'method.request.querystring.sessionId'
                },
                passthroughBehavior: 'WHEN_NO_TEMPLATES',
                requestTemplates: {
                    'application/json': `{
                        "TableName" : "` + props.getParameter('table.sessiontopx').tableName + `",
                        "Key" : {
                            "SessionId" : {
                                "S" : "$input.params('sessionId')"
                            }
                        }
                    }`
                },
                integrationResponses: [
                    {
                        statusCode: '200',
                        responseParameters: {
                            'method.response.header.Access-Control-Allow-Origin': "'*'"
                        },
                        responseTemplates: {
                            // This is going to be tricky to be generalized
                            'application/json': `#set($scoreboard = $input.path('$.Item.TopX.L'))
                                        { 
                                        "Scoreboard" : [
                                                #foreach($gamerScore in $scoreboard)
                                                        {
                                                            "Score" : $gamerScore.M.Score.N ,
                                                            "Level" : $gamerScore.M.Level.N ,
                                                            "Shots" : $gamerScore.M.Shots.N ,
                                                            "Nickname" : "$gamerScore.M.Nickname.S" ,
                                                            "Lives" : $gamerScore.M.Lives.N
                                                        }#if($foreach.hasNext),#end
                                                
                                                #end
                                            ]
                                        }`
                        }
                    }
                ]
            },
            methodResponses: [
                {
                    statusCode: '200',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': true
                    },
                    responseModels: {
                        'application/json': apiModelScoreboardResponse.ref
                    }
                }
            ]
        });
        // OPTIONS
        let scoreboardOptionsMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1scoreboardOPTIONS", {
            restApiId: this.api.ref,
            resourceId: scoreboard.ref,
            authorizationType: APIGTW.AuthorizationType.NONE,
            httpMethod: 'OPTIONS',
            integration: {
                passthroughBehavior: 'when_no_match',
                type: 'MOCK',
                requestTemplates: {
                    'application/json': `{\"statusCode\": 200}`
                },
                integrationResponses: [
                    {
                        statusCode: '200',
                        responseParameters: {
                            'method.response.header.Access-Control-Allow-Origin': "'*'",
                            'method.response.header.Access-Control-Allow-Methods': "'*'",
                            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
                        }
                    }
                ]
            },
            methodResponses: [
                {
                    statusCode: '200',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': true,
                        'method.response.header.Access-Control-Allow-Methods': true,
                        'method.response.header.Access-Control-Allow-Headers': true
                    },
                    responseModels: {
                        'application/json': 'Empty'
                    }
                }
            ]
        });
        /**
         * UPDATESTATUS
         * Resource: /updatestatus
         * Method: POST
         * Request format:
         *  body : {
         *       "Level": 1,
         *       "Lives": 3,
         *       "Nickname": "chicobento",
         *       "Score": 251,
         *       "SessionId": "X181001T215808",
         *       "Shots": 4,
         *       "Timestamp": "2018-10-10T23:57:26.137Z"
         *       }
         */
        let updateStatus = new APIGTW.CfnResource(this, props.getApplicationName() + "APIv1updatestatus", {
            parentId: v1.ref,
            pathPart: 'updatestatus',
            restApiId: this.api.ref
        });
        // POST
        let updatestatusPostMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1updatestatusPOST", {
            restApiId: this.api.ref,
            resourceId: updateStatus.ref,
            authorizationType: APIGTW.AuthorizationType.COGNITO,
            authorizerId: authorizer.ref,
            httpMethod: 'POST',
            requestParameters: {
                'method.request.header.Authentication': true
            },
            integration: {
                integrationHttpMethod: 'POST',
                type: 'AWS',
                uri: 'arn:aws:apigateway:' + props.region + ':kinesis:action/PutRecord',
                credentials: apirole.roleArn,
                passthroughBehavior: 'WHEN_NO_TEMPLATES',
                requestTemplates: {
                    'application/json': `#set($inputRoot = $input.path('$'))
                        {
                            "Data" : "$util.base64Encode("$input.json('$')")",
                            "PartitionKey" : $input.json('$.SessionId'),
                            "StreamName" : "` + this.kinesisStreams.streamName + `"
                        }`
                },
                integrationResponses: [
                    {
                        statusCode: '200',
                        responseParameters: {
                            'method.response.header.Access-Control-Allow-Origin': "'*'"
                        }
                    }
                ]
            },
            methodResponses: [
                {
                    statusCode: '200',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': true
                    },
                    responseModels: {
                        'application/json': 'Empty'
                    }
                }
            ]
        });
        // OPTIONS
        let updatestatusOptionsMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1updateStatusOPTIONS", {
            restApiId: this.api.ref,
            resourceId: updateStatus.ref,
            authorizationType: APIGTW.AuthorizationType.NONE,
            httpMethod: 'OPTIONS',
            integration: {
                passthroughBehavior: 'when_no_match',
                type: 'MOCK',
                requestTemplates: {
                    'application/json': `{\"statusCode\": 200}`
                },
                integrationResponses: [
                    {
                        statusCode: '200',
                        responseParameters: {
                            'method.response.header.Access-Control-Allow-Origin': "'*'",
                            'method.response.header.Access-Control-Allow-Methods': "'*'",
                            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
                        }
                    }
                ]
            },
            methodResponses: [
                {
                    statusCode: '200',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': true,
                        'method.response.header.Access-Control-Allow-Methods': true,
                        'method.response.header.Access-Control-Allow-Headers': true
                    },
                    responseModels: {
                        'application/json': 'Empty'
                    }
                }
            ]
        });
        let deployment = new APIGTW.CfnDeployment(this, props.getApplicationName() + "APIDeployment", {
            restApiId: this.api.ref,
            stageName: 'prod',
            description: 'Production deployment'
        });
        deployment.addDependsOn(sessionGetMethod);
        deployment.addDependsOn(sessionOptionsMethod);
        deployment.addDependsOn(websocketGetMethod);
        deployment.addDependsOn(websocketOptionsMethod);
        deployment.addDependsOn(configGetMethod);
        deployment.addDependsOn(configOptionsMethod);
        deployment.addDependsOn(allocatePostMethod);
        deployment.addDependsOn(allocateOptionsMethod);
        deployment.addDependsOn(deallocatePostMethod);
        deployment.addDependsOn(deallocateOptionsMethod);
        deployment.addDependsOn(scoreboardPostMethod);
        deployment.addDependsOn(scoreboardOptionsMethod);
        deployment.addDependsOn(updatestatusPostMethod);
        deployment.addDependsOn(updatestatusOptionsMethod);
        this.addResource("apigtw.url", "https://" + this.api.ref + ".execute-api." + props.region + ".amazonaws.com/prod/v1/");
    }
    updateUsersRoles(props) {
        let baseArn = 'arn:aws:apigateway:' + props.region + ':' + props.accountId + ':' + this.api.ref + '/prod/*/';
        let baseExecArn = 'arn:aws:execute-api:' + props.region + ':' + props.accountId + ':' + this.api.ref + '/prod/';
        let playerRole = props.getParameter('security.playersrole');
        playerRole.addToPolicy(new IAM.PolicyStatement({
            actions: ['apigateway:GET'],
            resources: [
                baseArn + 'config',
                baseArn + 'session',
                baseArn + 'scoreboard'
            ]
        }));
        playerRole.addToPolicy(new IAM.PolicyStatement({
            actions: ['execute-api:Invoke'],
            resources: [
                baseExecArn + 'GET/config',
                baseExecArn + 'GET/session',
                baseExecArn + 'GET/scoreboard'
            ]
        }));
        playerRole.addToPolicy(new IAM.PolicyStatement({
            actions: ['apigateway:POST'],
            resources: [
                baseArn + 'updatestatus',
                baseArn + 'allocate',
                baseArn + 'deallocate'
            ]
        }));
        playerRole.addToPolicy(new IAM.PolicyStatement({
            actions: ['execute-api:Invoke'],
            resources: [
                baseExecArn + 'POST/updatestatus',
                baseExecArn + 'POST/allocate',
                baseExecArn + 'POST/deallocate'
            ]
        }));
        let managerRole = props.getParameter('security.managersrole');
        managerRole.addToPolicy(new IAM.PolicyStatement({
            actions: [
                "dynamodb:BatchGetItem",
                "dynamodb:BatchWriteItem",
                "dynamodb:PutItem",
                "dynamodb:Scan",
                "dynamodb:Query",
                "dynamodb:GetItem"
            ],
            resources: ["arn:aws:dynamodb:" + props.region + ":" + props.accountId + ":table/" + props.getApplicationName() + "*"]
        }));
        managerRole.addToPolicy(new IAM.PolicyStatement({
            actions: [
                "ssm:GetParameters",
                "ssm:GetParameter",
                "ssm:DeleteParameters",
                "ssm:PutParameter",
                "ssm:DeleteParameter"
            ],
            resources: [
                "arn:aws:ssm:" + props.region + ":" + props.accountId + ":parameter/" + props.getApplicationName().toLowerCase() + "/*"
            ]
        }));
        managerRole.addToPolicy(new IAM.PolicyStatement({
            actions: [
                "kinesis:GetShardIterator",
                "kinesis:DescribeStream",
                "kinesis:GetRecords"
            ],
            resources: [this.kinesisStreams.streamArn]
        }));
        managerRole.addToPolicy(new IAM.PolicyStatement({
            actions: ['apigateway:*'],
            resources: [baseArn + '*']
        }));
    }
}
exports.IngestionConsumptionLayer = IngestionConsumptionLayer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5nZXN0aW9uQ29uc3VtcHRpb25MYXllci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImluZ2VzdGlvbkNvbnN1bXB0aW9uTGF5ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBR0EsZ0VBQXNGO0FBR3RGLCtDQUFnRDtBQUNoRCx1REFBd0Q7QUFDeEQsMkNBQTRDO0FBQzVDLHFEQUFzRDtBQUV0RCxpREFBa0Q7QUFHbEQsNkNBQThDO0FBQzlDLG1GQUEwRTtBQUMxRSxpREFBc0U7QUFFdEUsTUFBYSx5QkFBMEIsU0FBUSwyQ0FBc0I7SUFhakUsWUFBWSxNQUFpQixFQUFFLElBQVksRUFBRSxLQUEyQjtRQUNwRSxLQUFLLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztRQUp2Qix3QkFBbUIsR0FBYSxLQUFLLENBQUM7UUFDdEMsYUFBUSxHQUFhLEtBQUssQ0FBQztRQUsvQiw0RUFBNEU7UUFDNUUsSUFBSSxLQUFLLElBQUksS0FBSyxDQUFDLFlBQVksQ0FBQyxvQkFBb0IsQ0FBQztZQUFFLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLENBQUM7UUFDdkYsNkRBQTZEO1FBQzdELElBQUksS0FBSyxJQUFJLEtBQUssQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDO1lBQUUsSUFBSSxDQUFDLFFBQVEsR0FBRSxJQUFJLENBQUM7UUFFakUsSUFBSSxJQUFJLENBQUMsUUFBUTtZQUFFLElBQUksQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFDLFlBQVksQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUUxRSxJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDL0MsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMxQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDN0IsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFD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LENBQUU7U0FDaEMsQ0FBQyxDQUNMLENBQUM7SUFDTixDQUFDO0NBRUo7QUFobUNELDhEQWdtQ0MiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgQW1hem9uLmNvbSwgSW5jLiBvciBpdHMgYWZmaWxpYXRlcy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbi8vIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBNSVQtMFxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgeyBSZXNvdXJjZUF3YXJlQ29uc3RydWN0LCBJUGFyYW1ldGVyQXdhcmVQcm9wcyB9IGZyb20gJy4vLi4vcmVzb3VyY2Vhd2FyZXN0YWNrJ1xuXG5cbmltcG9ydCBLRFMgPSByZXF1aXJlKCdhd3MtY2RrLWxpYi9hd3Mta2luZXNpcycpO1xuaW1wb3J0IEtERiA9IHJlcXVpcmUoJ2F3cy1jZGstbGliL2F3cy1raW5lc2lzZmlyZWhvc2UnKTtcbmltcG9ydCBJQU0gPSByZXF1aXJlKCdhd3MtY2RrLWxpYi9hd3MtaWFtJyk7XG5pbXBvcnQgQVBJR1RXID0gcmVxdWlyZSgnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXknKTtcbmltcG9ydCB7IFRhYmxlIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcbmltcG9ydCBMYW1iZGEgPSByZXF1aXJlKCdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJyk7XG5cblxuaW1wb3J0IExvZ3MgPSByZXF1aXJlKCdhd3MtY2RrLWxpYi9hd3MtbG9ncycpO1xuaW1wb3J0IHsgS2luZXNpc0V2ZW50U291cmNlIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYS1ldmVudC1zb3VyY2VzJztcbmltcG9ydCB7IFBvbGljeURvY3VtZW50LCBQb2xpY3lTdGF0ZW1lbnQgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcblxuZXhwb3J0IGNsYXNzIEluZ2VzdGlvbkNvbnN1bXB0aW9uTGF5ZXIgZXh0ZW5kcyBSZXNvdXJjZUF3YXJlQ29uc3RydWN0IHtcblxuICAgIGtpbmVzaXNTdHJlYW1zOiBLRFMuSVN0cmVhbTtcbiAgICBraW5lc2lzRmlyZWhvc2U6IEtERi5DZm5EZWxpdmVyeVN0cmVhbTtcblxuICAgIHByaXZhdGUgcmF3YnVja2V0YXJuOiBzdHJpbmc7XG5cbiAgICBwcml2YXRlIHVzZXJwb29sOiBzdHJpbmc7XG4gICAgcHJpdmF0ZSBhcGk6IEFQSUdUVy5DZm5SZXN0QXBpO1xuICAgIFxuICAgIHByaXZhdGUgS0lORVNJU19JTlRFR1JBVElPTiA6IGJvb2xlYW4gPSBmYWxzZTtcbiAgICBwcml2YXRlIEZJUkVIT1NFIDogYm9vbGVhbiA9IGZhbHNlO1xuXG4gICAgY29uc3RydWN0b3IocGFyZW50OiBDb25zdHJ1Y3QsIG5hbWU6IHN0cmluZywgcHJvcHM6IElQYXJhbWV0ZXJBd2FyZVByb3BzKSB7XG4gICAgICAgIHN1cGVyKHBhcmVudCwgbmFtZSwgcHJvcHMpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2tpbmcgaWYgd2Ugd2FudCB0byBoYXZlIHRoZSBLaW5lc2lzIERhdGEgU3RyZWFtcyBpbnRlZ3JhdGlvbiBkZXBsb3llZFxuICAgICAgICBpZiAocHJvcHMgJiYgcHJvcHMuZ2V0UGFyYW1ldGVyKFwia2luZXNpc2ludGVncmF0aW9uXCIpKSB0aGlzLktJTkVTSVNfSU5URUdSQVRJT04gPSB0cnVlO1xuICAgICAgICAvLyBDaGVja2luZyBpZiB3ZSB3YW50IHRvIGhhdmUgdGhlIEtpbmVzaXMgRmlyZWhvc2UgZGVwcGxveWVkXG4gICAgICAgIGlmIChwcm9wcyAmJiBwcm9wcy5nZXRQYXJhbWV0ZXIoXCJmaXJlaG9zZVwiKSkgdGhpcy5GSVJFSE9TRT0gdHJ1ZTtcblxuICAgICAgICBpZiAodGhpcy5GSVJFSE9TRSkgdGhpcy5yYXdidWNrZXRhcm4gPSBwcm9wcy5nZXRQYXJhbWV0ZXIoJ3Jhd2J1Y2tldGFybicpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy51c2VycG9vbCA9IHByb3BzLmdldFBhcmFtZXRlcigndXNlcnBvb2wnKTtcbiAgICAgICAgdGhpcy5jcmVhdGVLaW5lc2lzKHByb3BzKTtcbiAgICAgICAgdGhpcy5jcmVhdGVBUElHYXRld2F5KHByb3BzKTtcbiAgICAgICAgdGhpcy51cGRhdGVVc2Vyc1JvbGVzKHByb3BzKTtcbiAgICB9XG5cbiAgICBjcmVhdGVLaW5lc2lzKHByb3BzOiBJUGFyYW1ldGVyQXdhcmVQcm9wcykge1xuXG4gICAgICAgIHRoaXMua2luZXNpc1N0cmVhbXMgPSBuZXcgS0RTLlN0cmVhbSh0aGlzLCBwcm9wcy5nZXRBcHBsaWNhdGlvbk5hbWUoKSArICdJbnB1dFN0cmVhbScsIHtcbiAgICAgICAgICAgIHN0cmVhbU5hbWU6IHByb3BzLmdldEFwcGxpY2F0aW9uTmFtZSgpICsgJ19JbnB1dFN0cmVhbScsXG4gICAgICAgICAgICBzaGFyZENvdW50OiAxXG4gICAgICAgIH0pO1xuICAgIFxuICAgICAgICAvLyBNSVNTSU5HIEtJTkVTSVMgSU5URUdSQVRJT05cbiAgICAgICAgaWYgKHRoaXMuS0lORVNJU19JTlRFR1JBVElPTikge1xuICAgICAgICAgICAgbmV3IEtpbmVzaXNFdmVudFNvdXJjZSggdGhpcy5raW5lc2lzU3RyZWFtcyAsIHtcbiAgICAgICAgICAgICAgICBiYXRjaFNpemU6IDcwMCxcbiAgICAgICAgICAgICAgICBzdGFydGluZ1Bvc2l0aW9uIDogTGFtYmRhLlN0YXJ0aW5nUG9zaXRpb24uTEFURVNUXG4gICAgICAgICAgICB9KS5iaW5kKDxMYW1iZGEuRnVuY3Rpb24+IHByb3BzLmdldFBhcmFtZXRlcignbGFtYmRhLnNjb3JlYm9hcmQnKSk7XG4gICAgICAgIH1cbiAgICBcbiAgICAgICAgLy8gTUlTU0lORyBLSU5FU0lTIEZJUkVIT1NFXG4gICAgICAgIC8vc2VjdGlvbiBzdGFydHMgaGVyZVxuICAgICAgICBpZiAodGhpcy5GSVJFSE9TRSkge1xuICAgICAgICAgICAgbGV0IGZpcmVob3NlTmFtZSA9IHByb3BzLmdldEFwcGxpY2F0aW9uTmFtZSgpICsgJ19GaXJlaG9zZSc7XG4gICAgICAgICAgICBsZXQgZmlyZWhvc2VMb2dHcm91cE5hbWUgPSAnL2F3cy9raW5lc2lzZmlyZWhvc2UvJyArIGZpcmVob3NlTmFtZTtcbiAgICAgICAgICAgIGxldCBmaXJlaG9zZUxvZ0dyb3VwID0gbmV3IExvZ3MuTG9nR3JvdXAodGhpcyxwcm9wcy5nZXRBcHBsaWNhdGlvbk5hbWUoKSsnZmlyZWhvc2Vsb2dncm91cCcsIHtcbiAgICAgICAgICAgICAgICBsb2dHcm91cE5hbWUgOiBmaXJlaG9zZUxvZ0dyb3VwTmFtZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBuZXcgTG9ncy5Mb2dTdHJlYW0odGhpcyxwcm9wcy5nZXRBcHBsaWNhdGlvbk5hbWUoKSsnZmlyZWhvc2Vsb2dzdHJlYW0nLCB7XG4gICAgICAgICAgICAgICAgbG9nR3JvdXAgOiBmaXJlaG9zZUxvZ0dyb3VwLFxuICAgICAgICAgICAgICAgIGxvZ1N0cmVhbU5hbWUgOiBcImVycm9yXCJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgbGV0IHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgbGV0IGZpcmVob3NlUm9sZSA9IG5ldyBJQU0uUm9sZSh0aGlzLCBwcm9wcy5nZXRBcHBsaWNhdGlvbk5hbWUoKSsgJ0ZpcmVob3NlVG9TdHJlYW1zUm9sZScsIHtcbiAgICAgICAgICAgICAgICByb2xlTmFtZTogcHJvcHMuZ2V0QXBwbGljYXRpb25OYW1lKCkgKyAnRmlyZWhvc2VUb1N0cmVhbXNSb2xlJyxcbiAgICAgICAgICAgICAgICBhc3N1bWVkQnk6IG5ldyBJQU0uU2VydmljZVByaW5jaXBhbCgnZmlyZWhvc2UuYW1hem9uYXdzLmNvbScpLFxuICAgICAgICAgICAgICAgIGlubGluZVBvbGljaWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICdHbHVlUGVybWlzc2lvbnMnIDogbmV3IElBTS5Qb2xpY3lEb2N1bWVudCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZW1lbnRzIDogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBQb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb25zIDogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZ2x1ZTpHZXRUYWJsZVZlcnNpb25zXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzIDogW1wiKlwiXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAnUzNSYXdEYXRhUGVybWlzc2lvbic6IG5ldyBJQU0uUG9saWN5RG9jdW1lbnQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVtZW50cyA6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgUG9saWN5U3RhdGVtZW50KFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb25zIDogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdzMzpBYm9ydE11bHRpcGFydFVwbG9hZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3MzOkdldEJ1Y2tldExvY2F0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnczM6R2V0T2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnczM6TGlzdEJ1Y2tldCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3MzOkxpc3RCdWNrZXRNdWx0aXBhcnRVcGxvYWRzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnczM6UHV0T2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvdXJjZXMgOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5yYXdidWNrZXRhcm4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5yYXdidWNrZXRhcm4gKyAnLyonXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAnRGVmYXVsdEZpcmVob3NlTGFtYmRhJyA6IG5ldyBJQU0uUG9saWN5RG9jdW1lbnQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVtZW50cyA6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJsYW1iZGE6SW52b2tlRnVuY3Rpb25cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwibGFtYmRhOkdldEZ1bmN0aW9uQ29uZmlndXJhdGlvblwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlcyA6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiYXJuOmF3czpsYW1iZGE6XCIrcHJvcHMucmVnaW9uK1wiOlwiK3Byb3BzLmFjY291bnRJZCtcIjpmdW5jdGlvbjolRklSRUhPU0VfREVGQVVMVF9GVU5DVElPTiU6JUZJUkVIT1NFX0RFRkFVTFRfVkVSU0lPTiVcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAnSW5wdXRTdHJlYW1SZWFkUGVybWlzc2lvbnMnOiBuZXcgUG9saWN5RG9jdW1lbnQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVtZW50cyA6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9ucyA6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdraW5lc2lzOkRlc2NyaWJlU3RyZWFtJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdraW5lc2lzOkdldFNoYXJkSXRlcmF0b3InLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2tpbmVzaXM6R2V0UmVjb3JkcydcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzIDogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5raW5lc2lzU3RyZWFtcy5zdHJlYW1Bcm5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAnQ2xvdWRXYXRjaExvZ3NQZXJtaXNzaW9ucyc6IG5ldyBQb2xpY3lEb2N1bWVudCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZW1lbnRzIDogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBQb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb25zIDogWyAnbG9nczpQdXRMb2dFdmVudHMnIF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlcyA6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdhcm46YXdzOmxvZ3M6JyArIHByb3BzLnJlZ2lvbiArICc6JyArIHByb3BzLmFjY291bnRJZCArICc6bG9nLWdyb3VwOi8nK2ZpcmVob3NlTG9nR3JvdXBOYW1lKyc6bG9nLXN0cmVhbToqJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5raW5lc2lzRmlyZWhvc2UgPSBuZXcgS0RGLkNmbkRlbGl2ZXJ5U3RyZWFtKHRoaXMsIHByb3BzLmdldEFwcGxpY2F0aW9uTmFtZSgpICsgJ1Jhd0RhdGEnLCB7XG4gICAgICAgICAgICAgICAgZGVsaXZlcnlTdHJlYW1UeXBlOiAnS2luZXNpc1N0cmVhbUFzU291cmNlJyxcbiAgICAgICAgICAgICAgICBkZWxpdmVyeVN0cmVhbU5hbWU6IGZpcmVob3NlTmFtZSxcbiAgICAgICAgICAgICAgICBraW5lc2lzU3RyZWFtU291cmNlQ29uZmlndXJhdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICBraW5lc2lzU3RyZWFtQXJuOiB0aGlzLmtpbmVzaXNTdHJlYW1zLnN0cmVhbUFybixcbiAgICAgICAgICAgICAgICAgICAgcm9sZUFybjogZmlyZWhvc2VSb2xlLnJvbGVBcm5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLCBzM0Rlc3RpbmF0aW9uQ29uZmlndXJhdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICBidWNrZXRBcm46IDxzdHJpbmc+dGhpcy5yYXdidWNrZXRhcm4sXG4gICAgICAgICAgICAgICAgICAgIGJ1ZmZlcmluZ0hpbnRzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnRlcnZhbEluU2Vjb25kczogMzAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2l6ZUluTUJzOiAxXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGNvbXByZXNzaW9uRm9ybWF0OiAnR1pJUCcsXG4gICAgICAgICAgICAgICAgICAgIHJvbGVBcm46IGZpcmVob3NlUm9sZS5yb2xlQXJuLFxuICAgICAgICAgICAgICAgICAgICBjbG91ZFdhdGNoTG9nZ2luZ09wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2dHcm91cE5hbWU6IGZpcmVob3NlTG9nR3JvdXBOYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgbG9nU3RyZWFtTmFtZTogZmlyZWhvc2VMb2dHcm91cE5hbWVcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGhpcy5raW5lc2lzRmlyZWhvc2Uubm9kZS5hZGREZXBlbmRlbmN5KGZpcmVob3NlTG9nR3JvdXApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgY3JlYXRlQVBJR2F0ZXdheShwcm9wczogSVBhcmFtZXRlckF3YXJlUHJvcHMpIHtcblxuICAgICAgICBsZXQgYXBpcm9sZSA9IG5ldyBJQU0uUm9sZSh0aGlzLCBwcm9wcy5nZXRBcHBsaWNhdGlvbk5hbWUoKSArICdBUElSb2xlJywge1xuICAgICAgICAgICAgcm9sZU5hbWU6IHByb3BzLmdldEFwcGxpY2F0aW9uTmFtZSgpICsgJ0FQSScsXG4gICAgICAgICAgICBhc3N1bWVkQnk6IG5ldyBJQU0uU2VydmljZVByaW5jaXBhbCgnYXBpZ2F0ZXdheS5hbWF6b25hd3MuY29tJylcbiAgICAgICAgfSk7XG4gICAgICAgIGFwaXJvbGUuYWRkVG9Qb2xpY3koXG4gICAgICAgICAgICBuZXcgSUFNLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgICAgYWN0aW9uczogWydsYW1iZGE6SW52b2tlRnVuY3Rpb24nLCAnbGFtYmRhOkludm9rZUFzeW5jJ10sXG4gICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbJ2Fybjphd3M6bGFtYmRhOicgKyBwcm9wcy5yZWdpb24gKyAnOicgKyBwcm9wcy5hY2NvdW50SWQgKyAnOmZ1bmN0aW9uOicgKyBwcm9wcy5nZXRBcHBsaWNhdGlvbk5hbWUoKSArICcqJ11cbiAgICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgICAgIGFwaXJvbGUuYWRkVG9Qb2xpY3kobmV3IElBTS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgICAgIFwic3NtOkdldFBhcmFtZXRlckhpc3RvcnlcIixcbiAgICAgICAgICAgICAgICBcInNzbTpHZXRQYXJhbWV0ZXJzQnlQYXRoXCIsXG4gICAgICAgICAgICAgICAgXCJzc206R2V0UGFyYW1ldGVyc1wiLFxuICAgICAgICAgICAgICAgIFwic3NtOkdldFBhcmFtZXRlclwiXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgcmVzb3VyY2VzOiBbJ2Fybjphd3M6c3NtOicuY29uY2F0KHByb3BzLnJlZ2lvbiEsICc6JywgcHJvcHMuYWNjb3VudElkISwgJzpwYXJhbWV0ZXIvJywgcHJvcHMuZ2V0QXBwbGljYXRpb25OYW1lKCkudG9Mb3dlckNhc2UoKSwgJy8qJyldXG4gICAgICAgIH0pKTtcbiAgICAgICAgYXBpcm9sZS5hZGRUb1BvbGljeShuZXcgSUFNLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICBhY3Rpb25zOiBbJ2R5bmFtb2RiOkdldEl0ZW0nXSxcbiAgICAgICAgICAgIHJlc291cmNlczogW1xuICAgICAgICAgICAgICAgICg8VGFibGU+cHJvcHMuZ2V0UGFyYW1ldGVyKCd0YWJsZS5zZXNzaW9uJykpLnRhYmxlQXJuXG4gICAgICAgICAgICAgICAgLCAoPFRhYmxlPnByb3BzLmdldFBhcmFtZXRlcigndGFibGUuc2Vzc2lvbnRvcHgnKSkudGFibGVBcm5cbiAgICAgICAgICAgIF1cbiAgICAgICAgfSkpO1xuICAgICAgICBhcGlyb2xlLmFkZFRvUG9saWN5KG5ldyBJQU0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICAgIGFjdGlvbnM6IFsna2luZXNpczpQdXRSZWNvcmQnLCAna2luZXNpczpQdXRSZWNvcmRzJ10sXG4gICAgICAgICAgICByZXNvdXJjZXM6IFt0aGlzLmtpbmVzaXNTdHJlYW1zLnN0cmVhbUFybl1cbiAgICAgICAgfSkpO1xuICAgICAgICBhcGlyb2xlLmFkZE1hbmFnZWRQb2xpY3koSUFNLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKFwic2VydmljZS1yb2xlL0FtYXpvbkFQSUdhdGV3YXlQdXNoVG9DbG91ZFdhdGNoTG9nc1wiKSk7XG5cbiAgICAgICAgdGhpcy5hcGkgPSBuZXcgQVBJR1RXLkNmblJlc3RBcGkodGhpcywgcHJvcHMuZ2V0QXBwbGljYXRpb25OYW1lKCkgKyBcIkFQSVwiLCB7XG4gICAgICAgICAgICBuYW1lOiBwcm9wcy5nZXRBcHBsaWNhdGlvbk5hbWUoKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgICAgICAsIGRlc2NyaXB0aW9uOiAnQVBJIHN1cHBvcnRpbmcgdGhlIGFwcGxpY2F0aW9uICcgKyBwcm9wcy5nZXRBcHBsaWNhdGlvbk5hbWUoKVxuICAgICAgICB9KTtcblxuICAgICAgICBuZXcgQVBJR1RXLkNmbkdhdGV3YXlSZXNwb25zZSh0aGlzLCBwcm9wcy5nZXRBcHBsaWNhdGlvbk5hbWUoKSArICdHVFdSZXNwb25zZScsIHtcbiAgICAgICAgICAgIHJlc3RBcGlJZDogdGhpcy5hcGkucmVmXG4gICAgICAgICAgICAsIHJlc3BvbnNlVHlwZTogJ0RFRkFVTFRfNFhYJ1xuICAgICAgICAgICAgLCByZXNwb25zZVBhcmFtZXRlcnM6IHtcbiAgICAgICAgICAgICAgICBcImdhdGV3YXlyZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVyc1wiOiBcIidDb250ZW50LVR5cGUsWC1BbXotRGF0ZSxBdXRob3JpemF0aW9uLFgtQXBpLUtleSxYLUFtei1TZWN1cml0eS1Ub2tlbidcIixcbiAgICAgICAgICAgICAgICBcImdhdGV3YXlyZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kc1wiOiBcIicqJ1wiLFxuICAgICAgICAgICAgICAgIFwiZ2F0ZXdheXJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW5cIjogXCInKidcIlxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLCByZXNwb25zZVRlbXBsYXRlczoge1xuICAgICAgICAgICAgICAgIFwiYXBwbGljYXRpb24vanNvblwiOiBcIntcXFwibWVzc2FnZVxcXCI6JGNvbnRleHQuZXJyb3IubWVzc2FnZVN0cmluZ31cIlxuICAgICAgICAgICAgfVxuICAgICAgICB9KS5hZGREZXBlbmRzT24odGhpcy5hcGkpO1xuXG4gICAgICAgIGxldCBhdXRob3JpemVyID0gbmV3IEFQSUdUVy5DZm5BdXRob3JpemVyKHRoaXMsIHByb3BzLmdldEFwcGxpY2F0aW9uTmFtZSgpICsgXCJBdXRob3JpemVyXCIsIHtcbiAgICAgICAgICAgIG5hbWU6IHByb3BzLmdldEFwcGxpY2F0aW9uTmFtZSgpLnRvTG93ZXJDYXNlKCkgKyAnQXV0aG9yaXplcidcbiAgICAgICAgICAgICwgcmVzdEFwaUlkOiB0aGlzLmFwaS5yZWZcbiAgICAgICAgICAgICwgdHlwZTogJ0NPR05JVE9fVVNFUl9QT09MUydcbiAgICAgICAgICAgICwgaWRlbnRpdHlTb3VyY2U6ICdtZXRob2QucmVxdWVzdC5oZWFkZXIuQXV0aG9yaXphdGlvbidcbiAgICAgICAgICAgICwgcHJvdmlkZXJBcm5zOiBbXG4gICAgICAgICAgICAgICAgdGhpcy51c2VycG9vbFxuICAgICAgICAgICAgXVxuICAgICAgICB9KTtcblxuICAgICAgICBsZXQgYXBpTW9kZWxTY29yZWJvYXJkUmVzcG9uc2UgPSBuZXcgQVBJR1RXLkNmbk1vZGVsKHRoaXMsIHByb3BzLmdldEFwcGxpY2F0aW9uTmFtZSgpICsgJ0FQSU1vZGVsU2NvcmVib2FyZFJlc3BvbnNlTW9kZWwnLCB7XG4gICAgICAgICAgICBjb250ZW50VHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgICAgICAgICAsIGRlc2NyaXB0aW9uOiAnU2NvcmVib2FyZCByZXNwb25zZSBtb2RlbCAoZm9yIC9zY29yZWJvYXJkL0dFVCknXG4gICAgICAgICAgICAsIG5hbWU6ICdTY29yZWJvYXJkUmVzcG9uc2VNb2RlbCdcbiAgICAgICAgICAgICwgcmVzdEFwaUlkOiB0aGlzLmFwaS5yZWZcbiAgICAgICAgICAgICwgc2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgXCIkc2NoZW1hXCI6IFwiaHR0cDovL2pzb24tc2NoZW1hLm9yZy9kcmFmdC0wNC9zY2hlbWEjXCIsXG4gICAgICAgICAgICAgICAgXCJ0aXRsZVwiOiBcIlNjb3JlYm9hcmRSZXNwb25zZU1vZGVsXCIsXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICAgICAgICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJTY29yZWJvYXJkXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0dhbWVyU2NvcmVcIlxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBcImRlZmluaXRpb25zXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJHYW1lclNjb3JlXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk5hbWVcIjogeyBcInR5cGVcIjogXCJpbnRlZ2VyXCIgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlNjb3JlXCI6IHsgXCJ0eXBlXCI6IFwiaW50ZWdlclwiIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJMZXZlbFwiOiB7IFwidHlwZVwiOiBcImludGVnZXJcIiB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiU2hvdHNcIjogeyBcInR5cGVcIjogXCJpbnRlZ2VyXCIgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk5pY2tuYW1lXCI6IHsgXCJ0eXBlXCI6IFwic3RyaW5nXCIgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkxpdmVzXCI6IHsgXCJ0eXBlXCI6IFwiaW50ZWdlclwiIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgbGV0IGFwaU1vZGVsR2V0UGFyYW1ldGVyc1JlcXVlc3QgPSBuZXcgQVBJR1RXLkNmbk1vZGVsKHRoaXMsIHByb3BzLmdldEFwcGxpY2F0aW9uTmFtZSgpICsgJ0FQSU1vZGVsR2V0UGFyYW1ldGVyc1JlcXVlc3QnLCB7XG4gICAgICAgICAgICBjb250ZW50VHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgICAgICAgICAsIGRlc2NyaXB0aW9uOiAnTW9kZWwgdG8gcmVxdWVzdCBTU006R2V0UGFyYW1ldGVycydcbiAgICAgICAgICAgICwgbmFtZTogJ0dldFBhcmFtZXRlcnNSZXF1ZXN0J1xuICAgICAgICAgICAgLCByZXN0QXBpSWQ6IHRoaXMuYXBpLnJlZlxuICAgICAgICAgICAgLCBzY2hlbWE6IHtcbiAgICAgICAgICAgICAgICBcIiRzY2hlbWFcIjogXCJodHRwOi8vanNvbi1zY2hlbWEub3JnL2RyYWZ0LTA0L3NjaGVtYSNcIixcbiAgICAgICAgICAgICAgICBcInRpdGxlXCI6IFwiR2V0UGFyYW1ldGVyc1JlcXVlc3RcIixcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgICAgICAgICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICAgICAgICAgICAgICBcIm5hbWVzXCI6IHsgXCJ0eXBlXCI6IFwiYXJyYXlcIiB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvL1ZlcnNpb24gMSBvZiB0aGUgQVBJXG4gICAgICAgIGxldCB2MSA9IG5ldyBBUElHVFcuQ2ZuUmVzb3VyY2UodGhpcywgcHJvcHMuZ2V0QXBwbGljYXRpb25OYW1lKCkgKyBcIkFQSXYxXCIsIHtcbiAgICAgICAgICAgIHBhcmVudElkOiB0aGlzLmFwaS5hdHRyUm9vdFJlc291cmNlSWRcbiAgICAgICAgICAgICwgcGF0aFBhcnQ6ICd2MSdcbiAgICAgICAgICAgICwgcmVzdEFwaUlkOiB0aGlzLmFwaS5yZWZcbiAgICAgICAgfSk7XG5cblxuXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNFU1NJT04gcmVzb3VyY2UgL3Nlc3Npb25cbiAgICAgICAgICogR0VUIHtubyBwYXJhbWV0ZXJ9IC0gcmV0dXJucyBzZXNzaW9uIGRhdGEgZnJvbSBzc20ucGFyYW1ldGVyIC9zc20vc2Vzc2lvblxuICAgICAgICAgKiBcbiAgICAgICAgICovXG4gICAgICAgIGxldCBzZXNzaW9uID0gbmV3IEFQSUdUVy5DZm5SZXNvdXJjZSh0aGlzLCBwcm9wcy5nZXRBcHBsaWNhdGlvbk5hbWUoKSArIFwiQVBJdjFzZXNzaW9uXCIsIHtcbiAgICAgICAgICAgIHBhcmVudElkOiB2MS5yZWZcbiAgICAgICAgICAgICwgcGF0aFBhcnQ6ICdzZXNzaW9uJ1xuICAgICAgICAgICAgLCByZXN0QXBpSWQ6IHRoaXMuYXBpLnJlZlxuICAgICAgICB9KTtcblxuICAgICAgICBsZXQgc2Vzc2lvbkdldE1ldGhvZCA9IG5ldyBBUElHVFcuQ2ZuTWV0aG9kKHRoaXMsIHByb3BzLmdldEFwcGxpY2F0aW9uTmFtZSgpICsgXCJBUEl2MXNlc3Npb25HRVRcIiwge1xuICAgICAgICAgICAgcmVzdEFwaUlkOiB0aGlzLmFwaS5yZWZcbiAgICAgICAgICAgICwgcmVzb3VyY2VJZDogc2Vzc2lvbi5yZWZcbiAgICAgICAgICAgICwgYXV0aG9yaXphdGlvblR5cGU6IEFQSUdUVy5BdXRob3JpemF0aW9uVHlwZS5DT0dOSVRPXG4gICAgICAgICAgICAsIGF1dGhvcml6ZXJJZDogYXV0aG9yaXplci5yZWZcbiAgICAgICAgICAgICwgaHR0cE1ldGhvZDogJ0dFVCdcbiAgICAgICAgICAgICwgcmVxdWVzdFBhcmFtZXRlcnM6IHtcbiAgICAgICAgICAgICAgICAnbWV0aG9kLnJlcXVlc3QucXVlcnlzdHJpbmcuTmFtZSc6IHRydWVcbiAgICAgICAgICAgICAgICAsICdtZXRob2QucmVxdWVzdC5oZWFkZXIuQXV0aGVudGljYXRpb24nOiB0cnVlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAsIHJlcXVlc3RNb2RlbHM6IHVuZGVmaW5lZFxuICAgICAgICAgICAgLCBpbnRlZ3JhdGlvbjoge1xuICAgICAgICAgICAgICAgIHBhc3N0aHJvdWdoQmVoYXZpb3I6ICdXSEVOX05PX01BVENIJ1xuICAgICAgICAgICAgICAgICwgaW50ZWdyYXRpb25IdHRwTWV0aG9kOiAnUE9TVCdcbiAgICAgICAgICAgICAgICAsIHR5cGU6ICdBV1MnXG4gICAgICAgICAgICAgICAgLCB1cmk6ICdhcm46YXdzOmFwaWdhdGV3YXk6JyArIHByb3BzLnJlZ2lvbiArICc6c3NtOmFjdGlvbi9HZXRQYXJhbWV0ZXInXG4gICAgICAgICAgICAgICAgLCBjcmVkZW50aWFsczogYXBpcm9sZS5yb2xlQXJuXG4gICAgICAgICAgICAgICAgLCByZXF1ZXN0UGFyYW1ldGVyczoge1xuICAgICAgICAgICAgICAgICAgICAnaW50ZWdyYXRpb24ucmVxdWVzdC5xdWVyeXN0cmluZy5OYW1lJzogXCInL1wiICsgcHJvcHMuZ2V0QXBwbGljYXRpb25OYW1lKCkudG9Mb3dlckNhc2UoKSArIFwiL3Nlc3Npb24nXCJcbiAgICAgICAgICAgICAgICAgICAgLCAnaW50ZWdyYXRpb24ucmVxdWVzdC5oZWFkZXIuQXV0aGVudGljYXRpb24nOiAnbWV0aG9kLnJlcXVlc3QuaGVhZGVyLkF1dGhlbnRpY2F0aW9uJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAsIHJlcXVlc3RUZW1wbGF0ZXM6IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgICwgaW50ZWdyYXRpb25SZXNwb25zZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdHVzQ29kZTogJzIwMCdcbiAgICAgICAgICAgICAgICAgICAgICAgICwgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogXCInKidcIlxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLCByZXNwb25zZVRlbXBsYXRlczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdhcHBsaWNhdGlvbi9qc29uJzogYFwiJHV0aWwuZXNjYXBlSmF2YVNjcmlwdChcIiRpbnB1dC5wYXRoKCckJykuR2V0UGFyYW1ldGVyUmVzcG9uc2UuR2V0UGFyYW1ldGVyUmVzdWx0LlBhcmFtZXRlci5WYWx1ZVwiKS5yZXBsYWNlQWxsKFwiXFwnXCIsJ1wiJylcImBcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfV1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICwgbWV0aG9kUmVzcG9uc2VzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJ1xuICAgICAgICAgICAgICAgICAgICAsIHJlc3BvbnNlUGFyYW1ldGVyczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAsIHJlc3BvbnNlTW9kZWxzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnYXBwbGljYXRpb24vanNvbic6ICdFbXB0eSdcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gT1BUSU9OU1xuICAgICAgICBsZXQgc2Vzc2lvbk9wdGlvbnNNZXRob2QgPSBuZXcgQVBJR1RXLkNmbk1ldGhvZCh0aGlzLCBwcm9wcy5nZXRBcHBsaWNhdGlvbk5hbWUoKSArIFwiQVBJdjFzZXNzaW9uT1BUSU9OU1wiLCB7XG4gICAgICAgICAgICByZXN0QXBpSWQ6IHRoaXMuYXBpLnJlZlxuICAgICAgICAgICAgLCByZXNvdXJjZUlkOiBzZXNzaW9uLnJlZlxuICAgICAgICAgICAgLCBhdXRob3JpemF0aW9uVHlwZTogQVBJR1RXLkF1dGhvcml6YXRpb25UeXBlLk5PTkVcbiAgICAgICAgICAgICwgaHR0cE1ldGhvZDogJ09QVElPTlMnXG4gICAgICAgICAgICAsIGludGVncmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgcGFzc3Rocm91Z2hCZWhhdmlvcjogJ1dIRU5fTk9fTUFUQ0gnXG4gICAgICAgICAgICAgICAgLCB0eXBlOiAnTU9DSydcbiAgICAgICAgICAgICAgICAsIHJlcXVlc3RUZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiAne1xcXCJzdGF0dXNDb2RlXFxcIjogMjAwfSdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLCBpbnRlZ3JhdGlvblJlc3BvbnNlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJ1xuICAgICAgICAgICAgICAgICAgICAgICAgLCByZXNwb25zZVBhcmFtZXRlcnM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogXCInQ29udGVudC1UeXBlLFgtQW16LURhdGUsQXV0aG9yaXphdGlvbixYLUFwaS1LZXksWC1BbXotU2VjdXJpdHktVG9rZW4nXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAsICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiBcIicqJ1wiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLCAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiBcIicqJ1wiXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1dXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAsIG1ldGhvZFJlc3BvbnNlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzQ29kZTogJzIwMCdcbiAgICAgICAgICAgICAgICAgICAgLCByZXNwb25zZVBhcmFtZXRlcnM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICAsICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgLCAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAsIHJlc3BvbnNlTW9kZWxzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcImFwcGxpY2F0aW9uL2pzb25cIjogJ0VtcHR5J1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9KTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogV2Vic29ja2V0IHJlc291cmNlIC93ZWJzb2NrZXRcbiAgICAgICAgICogR0VUIHtubyBwYXJhbWV0ZXJ9IC0gcmV0dXJucyB3ZWJzb2NrZXRVUkwgZGF0YSBmcm9tIHNzbS5wYXJhbWV0ZXIgL3NzbS93ZWJzb2NrZXRcbiAgICAgICAgICogXG4gICAgICAgICAqL1xuICAgICAgbGV0IHdlYnNvY2tldFJlc291cmNlT25SRVNUQVBJID0gbmV3IEFQSUdUVy5DZm5SZXNvdXJjZSh0aGlzLCBwcm9wcy5nZXRBcHBsaWNhdGlvbk5hbWUoKSArIFwiQVBJdjF3ZWJzb2NrZXRcIiwge1xuICAgICAgICAgICAgcGFyZW50SWQ6ICB2MS5yZWZcbiAgICAgICAgICAsIHBhdGhQYXJ0OiAnd2Vic29ja2V0J1xuICAgICAgICAgICwgcmVzdEFwaUlkOiB0aGlzLmFwaS5yZWZcbiAgICAgIH0pO1xuXG4gICAgICBsZXQgd2Vic29ja2V0R2V0TWV0aG9kID0gbmV3IEFQSUdUVy5DZm5NZXRob2QodGhpcywgcHJvcHMuZ2V0QXBwbGljYXRpb25OYW1lKCkgKyBcIkFQSXYxd2Vic29ja2V0R0VUXCIsIHtcbiAgICAgICAgICAgIHJlc3RBcGlJZDogdGhpcy5hcGkucmVmXG4gICAgICAgICAgLCByZXNvdXJjZUlkOiB3ZWJzb2NrZXRSZXNvdXJjZU9uUkVTVEFQSS5yZWZcbiAgICAgICAgICAsIGF1dGhvcml6YXRpb25UeXBlOiBBUElHVFcuQXV0aG9yaXphdGlvblR5cGUuQ09HTklUT1xuICAgICAgICAgICwgYXV0aG9yaXplcklkOiBhdXRob3JpemVyLnJlZlxuICAgICAgICAgICwgaHR0cE1ldGhvZDogJ0dFVCdcbiAgICAgICAgICAsIHJlcXVlc3RQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgICAgICAgJ21ldGhvZC5yZXF1ZXN0LnF1ZXJ5c3RyaW5nLk5hbWUnOiB0cnVlXG4gICAgICAgICAgICAgICwgJ21ldGhvZC5yZXF1ZXN0LmhlYWRlci5BdXRoZW50aWNhdGlvbic6IHRydWVcbiAgICAgICAgICB9XG4gICAgICAgICAgLCByZXF1ZXN0TW9kZWxzIDogdW5kZWZpbmVkXG4gICAgICAgICAgLCBpbnRlZ3JhdGlvbjoge1xuICAgICAgICAgICAgICBwYXNzdGhyb3VnaEJlaGF2aW9yOiAnV0hFTl9OT19NQVRDSCdcbiAgICAgICAgICAgICAgLCBpbnRlZ3JhdGlvbkh0dHBNZXRob2Q6ICdQT1NUJ1xuICAgICAgICAgICAgICAsIHR5cGU6ICdBV1MnXG4gICAgICAgICAgICAgICwgdXJpOiAnYXJuOmF3czphcGlnYXRld2F5OicgKyBwcm9wcy5yZWdpb24gKyAnOnNzbTphY3Rpb24vR2V0UGFyYW1ldGVyJ1xuICAgICAgICAgICAgICAsIGNyZWRlbnRpYWxzOiBhcGlyb2xlLnJvbGVBcm5cbiAgICAgICAgICAgICAgLCByZXF1ZXN0UGFyYW1ldGVyczoge1xuICAgICAgICAgICAgICAgICAgICAnaW50ZWdyYXRpb24ucmVxdWVzdC5xdWVyeXN0cmluZy5OYW1lJzogXCInL1wiICsgcHJvcHMuZ2V0QXBwbGljYXRpb25OYW1lKCkudG9Mb3dlckNhc2UoKSArIFwiL3dlYnNvY2tldCdcIlxuICAgICAgICAgICAgICAgICAgLCAnaW50ZWdyYXRpb24ucmVxdWVzdC5oZWFkZXIuQXV0aGVudGljYXRpb24nOiAnbWV0aG9kLnJlcXVlc3QuaGVhZGVyLkF1dGhlbnRpY2F0aW9uJ1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICwgcmVxdWVzdFRlbXBsYXRlcyA6IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAsIGludGVncmF0aW9uUmVzcG9uc2VzOiBbXG4gICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgc3RhdHVzQ29kZTogJzIwMCdcbiAgICAgICAgICAgICAgICAgICAgICAsIHJlc3BvbnNlUGFyYW1ldGVyczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiBcIicqJ1wiXG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICwgcmVzcG9uc2VUZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiBgXCIkdXRpbC5lc2NhcGVKYXZhU2NyaXB0KFwiJGlucHV0LnBhdGgoJyQnKS5HZXRQYXJhbWV0ZXJSZXNwb25zZS5HZXRQYXJhbWV0ZXJSZXN1bHQuUGFyYW1ldGVyLlZhbHVlXCIpLnJlcGxhY2VBbGwoXCJcXCdcIiwnXCInKVwiYFxuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1dXG4gICAgICAgICAgfVxuICAgICAgICAgICwgbWV0aG9kUmVzcG9uc2VzOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnXG4gICAgICAgICAgICAgICAgICAsIHJlc3BvbnNlUGFyYW1ldGVyczoge1xuICAgICAgICAgICAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6IGZhbHNlXG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAsIHJlc3BvbnNlTW9kZWxzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiAnRW1wdHknXG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICB9KTtcblxuICAgICAgLy8gT1BUSU9OU1xuICAgICAgbGV0IHdlYnNvY2tldE9wdGlvbnNNZXRob2QgPSBuZXcgQVBJR1RXLkNmbk1ldGhvZCh0aGlzLCBwcm9wcy5nZXRBcHBsaWNhdGlvbk5hbWUoKSArIFwiQVBJdjF3ZWJzb2NrZXRPUFRJT05TXCIsIHtcbiAgICAgICAgICByZXN0QXBpSWQ6IHRoaXMuYXBpLnJlZlxuICAgICAgICAgICwgcmVzb3VyY2VJZDogd2Vic29ja2V0UmVzb3VyY2VPblJFU1RBUEkucmVmXG4gICAgICAgICAgLCBhdXRob3JpemF0aW9uVHlwZTogQVBJR1RXLkF1dGhvcml6YXRpb25UeXBlLk5PTkVcbiAgICAgICAgICAsIGh0dHBNZXRob2Q6ICdPUFRJT05TJ1xuICAgICAgICAgICwgaW50ZWdyYXRpb246IHtcbiAgICAgICAgICAgICAgcGFzc3Rocm91Z2hCZWhhdmlvcjogJ1dIRU5fTk9fTUFUQ0gnXG4gICAgICAgICAgICAgICwgdHlwZTogJ01PQ0snXG4gICAgICAgICAgICAgICwgcmVxdWVzdFRlbXBsYXRlczoge1xuICAgICAgICAgICAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiAne1xcXCJzdGF0dXNDb2RlXFxcIjogMjAwfSdcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAsIGludGVncmF0aW9uUmVzcG9uc2VzOiBbXG4gICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgc3RhdHVzQ29kZTogJzIwMCdcbiAgICAgICAgICAgICAgICAgICAgICAsIHJlc3BvbnNlUGFyYW1ldGVyczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJyA6IFwiJ0NvbnRlbnQtVHlwZSxYLUFtei1EYXRlLEF1dGhvcml6YXRpb24sWC1BcGktS2V5LFgtQW16LVNlY3VyaXR5LVRva2VuJ1wiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICwnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJyA6IFwiJyonXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLCdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbicgOiBcIicqJ1wiXG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfV1cbiAgICAgICAgICB9XG4gICAgICAgICAgLCBtZXRob2RSZXNwb25zZXM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgc3RhdHVzQ29kZTogJzIwMCdcbiAgICAgICAgICAgICAgICAgICwgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICAgICwgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgICAgLCAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogZmFsc2VcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICwgcmVzcG9uc2VNb2RlbHM6IHtcbiAgICAgICAgICAgICAgICAgICAgICBcImFwcGxpY2F0aW9uL2pzb25cIjogJ0VtcHR5J1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgfSk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENPTkZJRyBcbiAgICAgICAgICogUmVzb3VyY2U6IC9jb25maWdcbiAgICAgICAgICogTWV0aG9kOiBHRVQgXG4gICAgICAgICAqIFJlcXVlc3QgUGFyYW1ldGVycyA6IG5vbmVcbiAgICAgICAgICogUmVzcG9uc2UgZm9ybWF0OlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgXCJQYXJhbWV0ZXJzXCI6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJOYW1lXCI6IFwiLzxhcHA+L2NsaWVudGlkXCIsXG4gICAgICAgICAgICAgICAgXCJWYWx1ZVwiOiBcIjR0ZmU1bDI2a2RwNTl0YzRrNHYwYjY4OG5tXCJcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcIk5hbWVcIjogXCIvPGFwcD4vaWRlbnRpdHlwb29saWRcIixcbiAgICAgICAgICAgICAgICBcIlZhbHVlXCI6IFwiPHJlZ2lvbj46MTcwOTJkZjYtN2UzYS00ODkzLTRkODUtYzZkZTMzY2RmYWJjXCJcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcIk5hbWVcIjogXCIvPGFwcD4+L3VzZXJwb29saWRcIixcbiAgICAgICAgICAgICAgICBcIlZhbHVlXCI6IFwiPHJlZ2lvbj5fdWVMZmRhU1hpXCJcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcIk5hbWVcIjogXCIvPGFwcD4+L3VzZXJwb29sdXJsXCIsXG4gICAgICAgICAgICAgICAgXCJWYWx1ZVwiOiBcImNvZ25pdG8taWRwLjxyZWdpb24+Pi5hbWF6b25hd3MuY29tLzxyZWdpb24+X3VlTGZkYVNYaVwiXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICAgICAgfVxuICAgICAgICAgKi9cbiAgICAgICAgbGV0IGNvbmZpZyA9IG5ldyBBUElHVFcuQ2ZuUmVzb3VyY2UodGhpcywgcHJvcHMuZ2V0QXBwbGljYXRpb25OYW1lKCkgKyBcIkFQSXYxY29uZmlnXCIsIHtcbiAgICAgICAgICAgIHBhcmVudElkOiB2MS5yZWZcbiAgICAgICAgICAgICwgcGF0aFBhcnQ6ICdjb25maWcnXG4gICAgICAgICAgICAsIHJlc3RBcGlJZDogdGhpcy5hcGkucmVmXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEdFVFxuICAgICAgICBsZXQgY29uZmlnR2V0TWV0aG9kID0gbmV3IEFQSUdUVy5DZm5NZXRob2QodGhpcywgcHJvcHMuZ2V0QXBwbGljYXRpb25OYW1lKCkgKyBcIkFQSXYxY29uZmlnR0VUXCIsIHtcbiAgICAgICAgICAgIHJlc3RBcGlJZDogdGhpcy5hcGkucmVmXG4gICAgICAgICAgICAsIHJlc291cmNlSWQ6IGNvbmZpZy5yZWZcbiAgICAgICAgICAgICwgYXV0aG9yaXphdGlvblR5cGU6IEFQSUdUVy5BdXRob3JpemF0aW9uVHlwZS5OT05FXG4gICAgICAgICAgICAsIGh0dHBNZXRob2Q6ICdHRVQnXG4gICAgICAgICAgICAsIHJlcXVlc3RQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgICAgICAgJ21ldGhvZC5yZXF1ZXN0LmhlYWRlci5Db250ZW50LVR5cGUnOiB0cnVlXG4gICAgICAgICAgICAgICAgLCAnbWV0aG9kLnJlcXVlc3QuaGVhZGVyLlgtQW16LVRhcmdldCc6IHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICwgcmVxdWVzdE1vZGVsczoge1xuICAgICAgICAgICAgICAgICdhcHBsaWNhdGlvbi9qc29uJzogYXBpTW9kZWxHZXRQYXJhbWV0ZXJzUmVxdWVzdC5yZWZcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICwgaW50ZWdyYXRpb246IHtcbiAgICAgICAgICAgICAgICBpbnRlZ3JhdGlvbkh0dHBNZXRob2Q6ICdQT1NUJ1xuICAgICAgICAgICAgICAgICwgdHlwZTogJ0FXUydcbiAgICAgICAgICAgICAgICAsIHVyaTogJ2Fybjphd3M6YXBpZ2F0ZXdheTonICsgcHJvcHMucmVnaW9uICsgJzpzc206cGF0aC8vJ1xuICAgICAgICAgICAgICAgICwgY3JlZGVudGlhbHM6IGFwaXJvbGUucm9sZUFyblxuICAgICAgICAgICAgICAgICwgcmVxdWVzdFBhcmFtZXRlcnM6IHtcbiAgICAgICAgICAgICAgICAgICAgJ2ludGVncmF0aW9uLnJlcXVlc3QuaGVhZGVyLkNvbnRlbnQtVHlwZSc6IFwiJ2FwcGxpY2F0aW9uL3gtYW16LWpzb24tMS4xJ1wiXG4gICAgICAgICAgICAgICAgICAgICwgJ2ludGVncmF0aW9uLnJlcXVlc3QuaGVhZGVyLlgtQW16LVRhcmdldCc6IFwiJ0FtYXpvblNTTS5HZXRQYXJhbWV0ZXJzJ1wiXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICwgcmVxdWVzdFRlbXBsYXRlczoge1xuICAgICAgICAgICAgICAgICAgICAnYXBwbGljYXRpb24vanNvbic6ICd7XCJOYW1lc1wiIDogWycgK1xuICAgICAgICAgICAgICAgICAgICAgICAgJ1wiLycgKyBwcm9wcy5nZXRBcHBsaWNhdGlvbk5hbWUoKS50b0xvd2VyQ2FzZSgpICsgJy91c2VycG9vbGlkXCIsJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnXCIvJyArIHByb3BzLmdldEFwcGxpY2F0aW9uTmFtZSgpLnRvTG93ZXJDYXNlKCkgKyAnL3VzZXJwb29sdXJsXCIsJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnXCIvJyArIHByb3BzLmdldEFwcGxpY2F0aW9uTmFtZSgpLnRvTG93ZXJDYXNlKCkgKyAnL2NsaWVudGlkXCIsJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnXCIvJyArIHByb3BzLmdldEFwcGxpY2F0aW9uTmFtZSgpLnRvTG93ZXJDYXNlKCkgKyAnL2lkZW50aXR5cG9vbGlkXCInICtcbiAgICAgICAgICAgICAgICAgICAgICAgICddfSdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLCBwYXNzdGhyb3VnaEJlaGF2aW9yOiAnV0hFTl9OT19URU1QTEFURVMnXG4gICAgICAgICAgICAgICAgLCBpbnRlZ3JhdGlvblJlc3BvbnNlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJ1xuICAgICAgICAgICAgICAgICAgICAgICAgLCByZXNwb25zZVBhcmFtZXRlcnM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiBcIicqJ1wiXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAsIHJlc3BvbnNlVGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiBgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICNzZXQoJGlucHV0Um9vdCA9ICRpbnB1dC5wYXRoKCckJykpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUGFyYW1ldGVyc1wiIDogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICNmb3JlYWNoKCRlbGVtIGluICRpbnB1dFJvb3QuUGFyYW1ldGVycylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTmFtZVwiIDogXCIkZWxlbS5OYW1lXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiVmFsdWVcIiA6ICBcIiR1dGlsLmVzY2FwZUphdmFTY3JpcHQoXCIkZWxlbS5WYWx1ZVwiKS5yZXBsYWNlQWxsKFwiJ1wiLCdcIicpXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICNpZigkZm9yZWFjaC5oYXNOZXh0KSwjZW5kXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAjZW5kXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfWBcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfV1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICwgbWV0aG9kUmVzcG9uc2VzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJ1xuICAgICAgICAgICAgICAgICAgICAsIHJlc3BvbnNlUGFyYW1ldGVyczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICwgcmVzcG9uc2VNb2RlbHM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdhcHBsaWNhdGlvbi9qc29uJzogJ0VtcHR5J1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9KTtcblxuXG4gICAgICAgIC8vIE9QVElPTlNcbiAgICAgICAgbGV0IGNvbmZpZ09wdGlvbnNNZXRob2QgPSBuZXcgQVBJR1RXLkNmbk1ldGhvZCh0aGlzLCBwcm9wcy5nZXRBcHBsaWNhdGlvbk5hbWUoKSArIFwiQVBJdjFjb25maWdPUFRJT05TXCIsIHtcbiAgICAgICAgICAgIHJlc3RBcGlJZDogdGhpcy5hcGkucmVmXG4gICAgICAgICAgICAsIHJlc291cmNlSWQ6IGNvbmZpZy5yZWZcbiAgICAgICAgICAgICwgYXV0aG9yaXphdGlvblR5cGU6IEFQSUdUVy5BdXRob3JpemF0aW9uVHlwZS5OT05FXG4gICAgICAgICAgICAsIGh0dHBNZXRob2Q6ICdPUFRJT05TJ1xuICAgICAgICAgICAgLCBpbnRlZ3JhdGlvbjoge1xuICAgICAgICAgICAgICAgIHBhc3N0aHJvdWdoQmVoYXZpb3I6ICd3aGVuX25vX21hdGNoJ1xuICAgICAgICAgICAgICAgICwgdHlwZTogJ01PQ0snXG4gICAgICAgICAgICAgICAgLCByZXF1ZXN0VGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgICAgICdhcHBsaWNhdGlvbi9qc29uJzogYHtcXFwic3RhdHVzQ29kZVxcXCI6IDIwMH1gXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICwgaW50ZWdyYXRpb25SZXNwb25zZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdHVzQ29kZTogJzIwMCdcbiAgICAgICAgICAgICAgICAgICAgICAgICwgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogXCInKidcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICwgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6IFwiJyonXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAsICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiBcIidDb250ZW50LVR5cGUsQXV0aG9yaXphdGlvbixYLUFtei1EYXRlLFgtQXBpLUtleSxYLUFtei1TZWN1cml0eS1Ub2tlbidcIlxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLCBtZXRob2RSZXNwb25zZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnXG4gICAgICAgICAgICAgICAgICAgICwgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICAsICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICAsICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLCByZXNwb25zZU1vZGVsczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiAnRW1wdHknXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBTExPQ0FURSBcbiAgICAgICAgICogUmVzb3VyY2U6IC9hbGxvY2F0ZVxuICAgICAgICAgKiBNZXRob2Q6IFBPU1RcbiAgICAgICAgICogUmVxdWVzdCBmb3JtYXQ6IHsgJ1VzZXJuYW1lJyA6ICc8dGhlIHVzZXIgbmFtZT4nfVxuICAgICAgICAgKi9cbiAgICAgICAgbGV0IGFsbG9jYXRlID0gbmV3IEFQSUdUVy5DZm5SZXNvdXJjZSh0aGlzLCBwcm9wcy5nZXRBcHBsaWNhdGlvbk5hbWUoKSArIFwiQVBJdjFhbGxvY2F0ZVwiLCB7XG4gICAgICAgICAgICBwYXJlbnRJZDogdjEucmVmXG4gICAgICAgICAgICAsIHBhdGhQYXJ0OiAnYWxsb2NhdGUnXG4gICAgICAgICAgICAsIHJlc3RBcGlJZDogdGhpcy5hcGkucmVmXG4gICAgICAgIH0pO1xuXG5cbiAgICAgICAgbGV0IGxhbWJkYUFsbG9jYXRlID0gKDxMYW1iZGEuRnVuY3Rpb24+cHJvcHMuZ2V0UGFyYW1ldGVyKCdsYW1iZGEuYWxsb2NhdGUnKSk7XG5cbiAgICAgICAgLy8gUE9TVFxuICAgICAgICBsZXQgYWxsb2NhdGVQb3N0TWV0aG9kID0gbmV3IEFQSUdUVy5DZm5NZXRob2QodGhpcywgcHJvcHMuZ2V0QXBwbGljYXRpb25OYW1lKCkgKyBcIkFQSXYxYWxsb2NhdGVQT1NUXCIsIHtcbiAgICAgICAgICAgIHJlc3RBcGlJZDogdGhpcy5hcGkucmVmXG4gICAgICAgICAgICAsIHJlc291cmNlSWQ6IGFsbG9jYXRlLnJlZlxuICAgICAgICAgICAgLCBhdXRob3JpemF0aW9uVHlwZTogQVBJR1RXLkF1dGhvcml6YXRpb25UeXBlLkNPR05JVE9cbiAgICAgICAgICAgICwgYXV0aG9yaXplcklkOiBhdXRob3JpemVyLnJlZlxuICAgICAgICAgICAgLCBodHRwTWV0aG9kOiAnUE9TVCdcbiAgICAgICAgICAgICwgaW50ZWdyYXRpb246IHtcbiAgICAgICAgICAgICAgICBwYXNzdGhyb3VnaEJlaGF2aW9yOiAnV0hFTl9OT19NQVRDSCdcbiAgICAgICAgICAgICAgICAsIGludGVncmF0aW9uSHR0cE1ldGhvZDogJ1BPU1QnXG4gICAgICAgICAgICAgICAgLCB0eXBlOiAnQVdTX1BST1hZJ1xuICAgICAgICAgICAgICAgICwgdXJpOiAnYXJuOmF3czphcGlnYXRld2F5OicgKyBwcm9wcy5yZWdpb24gKyAnOmxhbWJkYTpwYXRoLzIwMTUtMDMtMzEvZnVuY3Rpb25zLycgKyBsYW1iZGFBbGxvY2F0ZS5mdW5jdGlvbkFybiArICcvaW52b2NhdGlvbnMnXG4gICAgICAgICAgICAgICAgLCBjcmVkZW50aWFsczogYXBpcm9sZS5yb2xlQXJuXG4gICAgICAgICAgICAgICAgLy8gICwgdXJpOiAnYXJuOmF3czphcGlnYXRld2F5OicgKyBwcm9wcy5yZWdpb24gKyAnOmxhbWJkYTpwYXRoLzIwMTUtMDMtMzEvZnVuY3Rpb25zLycgKyBwcm9wcy5nZXRQYXJhbWV0ZXIoJ2xhbWJkYS5hbGxvY2F0ZScpICsgJy9pbnZvY2F0aW9ucydcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICwgbWV0aG9kUmVzcG9uc2VzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLyogVE8gQkUgSU1QTEVNRU5URUQgT04gQ0RLXG4gICAgICAgICAgICAgICAgbGFtYmRhQWxsb2NhdGUuYWRkRXZlbnRTb3VyY2UoXG4gICAgICAgICAgICAgICAgICAgIG5ldyBBcGlFdmVudFNvdXJjZSggJ1BPU1QnLCcvdjEvYWxsb2NhdGUnLHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGF1dGhvcml6YXRpb25UeXBlIDogQVBJR1RXLkF1dGhvcml6YXRpb25UeXBlLkNPR05JVE9cbiAgICAgICAgICAgICAgICAgICAgICAgICAsIGF1dGhvcml6ZXJJZCA6IGF1dGhvcml6ZXIucmVmXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgKi9cblxuICAgICAgICAvLyBPUFRJT05TXG4gICAgICAgIGxldCBhbGxvY2F0ZU9wdGlvbnNNZXRob2QgPSBuZXcgQVBJR1RXLkNmbk1ldGhvZCh0aGlzLCBwcm9wcy5nZXRBcHBsaWNhdGlvbk5hbWUoKSArIFwiQVBJdjFhbGxvY2F0ZU9QVElPTlNcIiwge1xuICAgICAgICAgICAgcmVzdEFwaUlkOiB0aGlzLmFwaS5yZWZcbiAgICAgICAgICAgICwgcmVzb3VyY2VJZDogYWxsb2NhdGUucmVmXG4gICAgICAgICAgICAsIGF1dGhvcml6YXRpb25UeXBlOiBBUElHVFcuQXV0aG9yaXphdGlvblR5cGUuTk9ORVxuICAgICAgICAgICAgLCBodHRwTWV0aG9kOiAnT1BUSU9OUydcbiAgICAgICAgICAgICwgaW50ZWdyYXRpb246IHtcbiAgICAgICAgICAgICAgICBwYXNzdGhyb3VnaEJlaGF2aW9yOiAnV0hFTl9OT19NQVRDSCdcbiAgICAgICAgICAgICAgICAsIHR5cGU6ICdNT0NLJ1xuICAgICAgICAgICAgICAgICwgcmVxdWVzdFRlbXBsYXRlczoge1xuICAgICAgICAgICAgICAgICAgICAnYXBwbGljYXRpb24vanNvbic6IGB7XFxcInN0YXR1c0NvZGVcXFwiOiAyMDB9YFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAsIGludGVncmF0aW9uUmVzcG9uc2VzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnXG4gICAgICAgICAgICAgICAgICAgICAgICAsIHJlc3BvbnNlUGFyYW1ldGVyczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6IFwiJyonXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAsICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiBcIicqJ1wiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLCAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogXCInQ29udGVudC1UeXBlLEF1dGhvcml6YXRpb24sWC1BbXotRGF0ZSxYLUFwaS1LZXksWC1BbXotU2VjdXJpdHktVG9rZW4nXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfV1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICwgbWV0aG9kUmVzcG9uc2VzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJ1xuICAgICAgICAgICAgICAgICAgICAsIHJlc3BvbnNlUGFyYW1ldGVyczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgLCAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgLCAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICwgcmVzcG9uc2VNb2RlbHM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdhcHBsaWNhdGlvbi9qc29uJzogJ0VtcHR5J1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9KTtcblxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBERUFMTE9DQVRFIFxuICAgICAgICAgKiBSZXNvdXJjZTogL2RlYWxsb2NhdGVcbiAgICAgICAgICogTWV0aG9kOiBQT1NUXG4gICAgICAgICAqIFJlcXVlc3QgZm9ybWF0OiB7ICdVc2VybmFtZScgOiAnPHRoZSB1c2VyIG5hbWU+J31cbiAgICAgICAgICovXG4gICAgICAgIGxldCBkZWFsbG9jYXRlID0gbmV3IEFQSUdUVy5DZm5SZXNvdXJjZSh0aGlzLCBwcm9wcy5nZXRBcHBsaWNhdGlvbk5hbWUoKSArIFwiQVBJdjFkZWFsbG9jYXRlXCIsIHtcbiAgICAgICAgICAgIHBhcmVudElkOiB2MS5yZWZcbiAgICAgICAgICAgICwgcGF0aFBhcnQ6ICdkZWFsbG9jYXRlJ1xuICAgICAgICAgICAgLCByZXN0QXBpSWQ6IHRoaXMuYXBpLnJlZlxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBQT1NUXG4gICAgICAgIGxldCBkZWFsbG9jYXRlUG9zdE1ldGhvZCA9IG5ldyBBUElHVFcuQ2ZuTWV0aG9kKHRoaXMsIHByb3BzLmdldEFwcGxpY2F0aW9uTmFtZSgpICsgXCJBUEl2MWRlYWxsb2NhdGVQT1NUXCIsIHtcbiAgICAgICAgICAgIHJlc3RBcGlJZDogdGhpcy5hcGkucmVmXG4gICAgICAgICAgICAsIHJlc291cmNlSWQ6IGRlYWxsb2NhdGUucmVmXG4gICAgICAgICAgICAsIGF1dGhvcml6YXRpb25UeXBlOiBBUElHVFcuQXV0aG9yaXphdGlvblR5cGUuQ09HTklUT1xuICAgICAgICAgICAgLCBhdXRob3JpemVySWQ6IGF1dGhvcml6ZXIucmVmXG4gICAgICAgICAgICAsIGh0dHBNZXRob2Q6ICdQT1NUJ1xuICAgICAgICAgICAgLCBpbnRlZ3JhdGlvbjoge1xuICAgICAgICAgICAgICAgIGludGVncmF0aW9uSHR0cE1ldGhvZDogJ1BPU1QnXG4gICAgICAgICAgICAgICAgLCB0eXBlOiAnQVdTX1BST1hZJ1xuICAgICAgICAgICAgICAgICwgY29udGVudEhhbmRsaW5nOiBcIkNPTlZFUlRfVE9fVEVYVFwiXG4gICAgICAgICAgICAgICAgLCB1cmk6ICdhcm46YXdzOmFwaWdhdGV3YXk6JyArIHByb3BzLnJlZ2lvbiArICc6bGFtYmRhOnBhdGgvMjAxNS0wMy0zMS9mdW5jdGlvbnMvJyArIHByb3BzLmdldFBhcmFtZXRlcignbGFtYmRhLmRlYWxsb2NhdGUnKSArICcvaW52b2NhdGlvbnMnXG4gICAgICAgICAgICAgICAgLCBjcmVkZW50aWFsczogYXBpcm9sZS5yb2xlQXJuXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAsIG1ldGhvZFJlc3BvbnNlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzQ29kZTogJzIwMCdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH0pO1xuXG5cbiAgICAgICAgLy8gT1BUSU9OU1xuICAgICAgICBsZXQgZGVhbGxvY2F0ZU9wdGlvbnNNZXRob2QgPSBuZXcgQVBJR1RXLkNmbk1ldGhvZCh0aGlzLCBwcm9wcy5nZXRBcHBsaWNhdGlvbk5hbWUoKSArIFwiQVBJdjFkZWFsbG9jYXRlT1BUSU9OU1wiLCB7XG4gICAgICAgICAgICByZXN0QXBpSWQ6IHRoaXMuYXBpLnJlZlxuICAgICAgICAgICAgLCByZXNvdXJjZUlkOiBkZWFsbG9jYXRlLnJlZlxuICAgICAgICAgICAgLCBhdXRob3JpemF0aW9uVHlwZTogQVBJR1RXLkF1dGhvcml6YXRpb25UeXBlLk5PTkVcbiAgICAgICAgICAgICwgaHR0cE1ldGhvZDogJ09QVElPTlMnXG4gICAgICAgICAgICAsIGludGVncmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgcGFzc3Rocm91Z2hCZWhhdmlvcjogJ3doZW5fbm9fbWF0Y2gnXG4gICAgICAgICAgICAgICAgLCB0eXBlOiAnTU9DSydcbiAgICAgICAgICAgICAgICAsIHJlcXVlc3RUZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiBge1xcXCJzdGF0dXNDb2RlXFxcIjogMjAwfWBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLCBpbnRlZ3JhdGlvblJlc3BvbnNlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJ1xuICAgICAgICAgICAgICAgICAgICAgICAgLCByZXNwb25zZVBhcmFtZXRlcnM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiBcIicqJ1wiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLCAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogXCInKidcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICwgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6IFwiJ0NvbnRlbnQtVHlwZSxBdXRob3JpemF0aW9uLFgtQW16LURhdGUsWC1BcGktS2V5LFgtQW16LVNlY3VyaXR5LVRva2VuJ1wiXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1dXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAsIG1ldGhvZFJlc3BvbnNlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzQ29kZTogJzIwMCdcbiAgICAgICAgICAgICAgICAgICAgLCByZXNwb25zZVBhcmFtZXRlcnM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgICwgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgICwgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAsIHJlc3BvbnNlTW9kZWxzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnYXBwbGljYXRpb24vanNvbic6ICdFbXB0eSdcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfSk7XG5cblxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTQ09SRUJPQVJEIFxuICAgICAgICAgKiBSZXNvdXJjZTogL2RlYWxsb2NhdGVcbiAgICAgICAgICogTWV0aG9kOiBHRVRcbiAgICAgICAgICogUmVxdWVzdCBmb3JtYXQ6IFxuICAgICAgICAgKiAgICAgIHF1ZXJ5c3RyaW5nOiBzZXNzaW9uSWQ9PDxTZXNzaW9uIElkPj5cbiAgICAgICAgICogUmVzcG9uc2UgZm9ybWF0OlxuICAgICAgICAgKiB7XG4gICAgICAgICAgICAgICAgXCJTY29yZWJvYXJkXCI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBcIlNjb3JlXCI6IDcwNTUsXG4gICAgICAgICAgICAgICAgICAgIFwiTGV2ZWxcIjogMTMsXG4gICAgICAgICAgICAgICAgICAgIFwiU2hvdHNcIjogOTQyLFxuICAgICAgICAgICAgICAgICAgICBcIk5pY2tuYW1lXCI6IFwiUFNDXCIsXG4gICAgICAgICAgICAgICAgICAgIFwiTGl2ZXNcIjogM1xuICAgICAgICAgICAgICAgICAgICB9Li4sXG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfVxuICAgICAgICAgKi9cbiAgICAgICAgbGV0IHNjb3JlYm9hcmQgPSBuZXcgQVBJR1RXLkNmblJlc291cmNlKHRoaXMsIHByb3BzLmdldEFwcGxpY2F0aW9uTmFtZSgpICsgXCJBUEl2MXNjb3JlYm9hcmRcIiwge1xuICAgICAgICAgICAgcGFyZW50SWQ6IHYxLnJlZlxuICAgICAgICAgICAgLCBwYXRoUGFydDogJ3Njb3JlYm9hcmQnXG4gICAgICAgICAgICAsIHJlc3RBcGlJZDogdGhpcy5hcGkucmVmXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFBPU1RcbiAgICAgICAgbGV0IHNjb3JlYm9hcmRQb3N0TWV0aG9kID0gbmV3IEFQSUdUVy5DZm5NZXRob2QodGhpcywgcHJvcHMuZ2V0QXBwbGljYXRpb25OYW1lKCkgKyBcIkFQSXYxc2NvcmVib2FyZFBPU1RcIiwge1xuICAgICAgICAgICAgcmVzdEFwaUlkOiB0aGlzLmFwaS5yZWZcbiAgICAgICAgICAgICwgcmVzb3VyY2VJZDogc2NvcmVib2FyZC5yZWZcbiAgICAgICAgICAgICwgYXV0aG9yaXphdGlvblR5cGU6IEFQSUdUVy5BdXRob3JpemF0aW9uVHlwZS5DT0dOSVRPXG4gICAgICAgICAgICAsIGF1dGhvcml6ZXJJZDogYXV0aG9yaXplci5yZWZcbiAgICAgICAgICAgICwgaHR0cE1ldGhvZDogJ0dFVCdcbiAgICAgICAgICAgICwgcmVxdWVzdFBhcmFtZXRlcnM6IHtcbiAgICAgICAgICAgICAgICAnbWV0aG9kLnJlcXVlc3QucXVlcnlzdHJpbmcuc2Vzc2lvbklkJzogdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLCBpbnRlZ3JhdGlvbjoge1xuICAgICAgICAgICAgICAgIGludGVncmF0aW9uSHR0cE1ldGhvZDogJ1BPU1QnXG4gICAgICAgICAgICAgICAgLCB0eXBlOiAnQVdTJ1xuICAgICAgICAgICAgICAgICwgdXJpOiAnYXJuOmF3czphcGlnYXRld2F5OicgKyBwcm9wcy5yZWdpb24gKyAnOmR5bmFtb2RiOmFjdGlvbi9HZXRJdGVtJ1xuICAgICAgICAgICAgICAgICwgY3JlZGVudGlhbHM6IGFwaXJvbGUucm9sZUFyblxuICAgICAgICAgICAgICAgICwgcmVxdWVzdFBhcmFtZXRlcnM6IHtcbiAgICAgICAgICAgICAgICAgICAgJ2ludGVncmF0aW9uLnJlcXVlc3QucXVlcnlzdHJpbmcuc2Vzc2lvbklkJzogJ21ldGhvZC5yZXF1ZXN0LnF1ZXJ5c3RyaW5nLnNlc3Npb25JZCdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLCBwYXNzdGhyb3VnaEJlaGF2aW9yOiAnV0hFTl9OT19URU1QTEFURVMnXG4gICAgICAgICAgICAgICAgLCByZXF1ZXN0VGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgICAgICdhcHBsaWNhdGlvbi9qc29uJzogYHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiVGFibGVOYW1lXCIgOiBcImArICg8VGFibGU+cHJvcHMuZ2V0UGFyYW1ldGVyKCd0YWJsZS5zZXNzaW9udG9weCcpKS50YWJsZU5hbWUgKyBgXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcIktleVwiIDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiU2Vzc2lvbklkXCIgOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiU1wiIDogXCIkaW5wdXQucGFyYW1zKCdzZXNzaW9uSWQnKVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9YFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAsIGludGVncmF0aW9uUmVzcG9uc2VzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnXG4gICAgICAgICAgICAgICAgICAgICAgICAsIHJlc3BvbnNlUGFyYW1ldGVyczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6IFwiJyonXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICwgcmVzcG9uc2VUZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGlzIGlzIGdvaW5nIHRvIGJlIHRyaWNreSB0byBiZSBnZW5lcmFsaXplZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdhcHBsaWNhdGlvbi9qc29uJzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYCNzZXQoJHNjb3JlYm9hcmQgPSAkaW5wdXQucGF0aCgnJC5JdGVtLlRvcFguTCcpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTY29yZWJvYXJkXCIgOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAjZm9yZWFjaCgkZ2FtZXJTY29yZSBpbiAkc2NvcmVib2FyZClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJTY29yZVwiIDogJGdhbWVyU2NvcmUuTS5TY29yZS5OICxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTGV2ZWxcIiA6ICRnYW1lclNjb3JlLk0uTGV2ZWwuTiAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlNob3RzXCIgOiAkZ2FtZXJTY29yZS5NLlNob3RzLk4gLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJOaWNrbmFtZVwiIDogXCIkZ2FtZXJTY29yZS5NLk5pY2tuYW1lLlNcIiAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkxpdmVzXCIgOiAkZ2FtZXJTY29yZS5NLkxpdmVzLk5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSNpZigkZm9yZWFjaC5oYXNOZXh0KSwjZW5kXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICNlbmRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1gXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1dXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAsIG1ldGhvZFJlc3BvbnNlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzQ29kZTogJzIwMCdcbiAgICAgICAgICAgICAgICAgICAgLCByZXNwb25zZVBhcmFtZXRlcnM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAsIHJlc3BvbnNlTW9kZWxzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnYXBwbGljYXRpb24vanNvbic6IGFwaU1vZGVsU2NvcmVib2FyZFJlc3BvbnNlLnJlZlxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9KTtcblxuXG4gICAgICAgIC8vIE9QVElPTlNcbiAgICAgICAgbGV0IHNjb3JlYm9hcmRPcHRpb25zTWV0aG9kID0gbmV3IEFQSUdUVy5DZm5NZXRob2QodGhpcywgcHJvcHMuZ2V0QXBwbGljYXRpb25OYW1lKCkgKyBcIkFQSXYxc2NvcmVib2FyZE9QVElPTlNcIiwge1xuICAgICAgICAgICAgcmVzdEFwaUlkOiB0aGlzLmFwaS5yZWZcbiAgICAgICAgICAgICwgcmVzb3VyY2VJZDogc2NvcmVib2FyZC5yZWZcbiAgICAgICAgICAgICwgYXV0aG9yaXphdGlvblR5cGU6IEFQSUdUVy5BdXRob3JpemF0aW9uVHlwZS5OT05FXG4gICAgICAgICAgICAsIGh0dHBNZXRob2Q6ICdPUFRJT05TJ1xuICAgICAgICAgICAgLCBpbnRlZ3JhdGlvbjoge1xuICAgICAgICAgICAgICAgIHBhc3N0aHJvdWdoQmVoYXZpb3I6ICd3aGVuX25vX21hdGNoJ1xuICAgICAgICAgICAgICAgICwgdHlwZTogJ01PQ0snXG4gICAgICAgICAgICAgICAgLCByZXF1ZXN0VGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgICAgICdhcHBsaWNhdGlvbi9qc29uJzogYHtcXFwic3RhdHVzQ29kZVxcXCI6IDIwMH1gXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICwgaW50ZWdyYXRpb25SZXNwb25zZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdHVzQ29kZTogJzIwMCdcbiAgICAgICAgICAgICAgICAgICAgICAgICwgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogXCInKidcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICwgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6IFwiJyonXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAsICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiBcIidDb250ZW50LVR5cGUsQXV0aG9yaXphdGlvbixYLUFtei1EYXRlLFgtQXBpLUtleSxYLUFtei1TZWN1cml0eS1Ub2tlbidcIlxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLCBtZXRob2RSZXNwb25zZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnXG4gICAgICAgICAgICAgICAgICAgICwgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICAsICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICAsICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLCByZXNwb25zZU1vZGVsczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiAnRW1wdHknXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH0pO1xuXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFVQREFURVNUQVRVU1xuICAgICAgICAgKiBSZXNvdXJjZTogL3VwZGF0ZXN0YXR1c1xuICAgICAgICAgKiBNZXRob2Q6IFBPU1RcbiAgICAgICAgICogUmVxdWVzdCBmb3JtYXQ6XG4gICAgICAgICAqICBib2R5IDoge1xuICAgICAgICAgKiAgICAgICBcIkxldmVsXCI6IDEsXG4gICAgICAgICAqICAgICAgIFwiTGl2ZXNcIjogMyxcbiAgICAgICAgICogICAgICAgXCJOaWNrbmFtZVwiOiBcImNoaWNvYmVudG9cIixcbiAgICAgICAgICogICAgICAgXCJTY29yZVwiOiAyNTEsXG4gICAgICAgICAqICAgICAgIFwiU2Vzc2lvbklkXCI6IFwiWDE4MTAwMVQyMTU4MDhcIixcbiAgICAgICAgICogICAgICAgXCJTaG90c1wiOiA0LFxuICAgICAgICAgKiAgICAgICBcIlRpbWVzdGFtcFwiOiBcIjIwMTgtMTAtMTBUMjM6NTc6MjYuMTM3WlwiXG4gICAgICAgICAqICAgICAgIH1cbiAgICAgICAgICovXG4gICAgICAgIGxldCB1cGRhdGVTdGF0dXMgPSBuZXcgQVBJR1RXLkNmblJlc291cmNlKHRoaXMsIHByb3BzLmdldEFwcGxpY2F0aW9uTmFtZSgpICsgXCJBUEl2MXVwZGF0ZXN0YXR1c1wiLCB7XG4gICAgICAgICAgICBwYXJlbnRJZDogdjEucmVmXG4gICAgICAgICAgICAsIHBhdGhQYXJ0OiAndXBkYXRlc3RhdHVzJ1xuICAgICAgICAgICAgLCByZXN0QXBpSWQ6IHRoaXMuYXBpLnJlZlxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBQT1NUXG4gICAgICAgIGxldCB1cGRhdGVzdGF0dXNQb3N0TWV0aG9kID0gbmV3IEFQSUdUVy5DZm5NZXRob2QodGhpcywgcHJvcHMuZ2V0QXBwbGljYXRpb25OYW1lKCkgKyBcIkFQSXYxdXBkYXRlc3RhdHVzUE9TVFwiLCB7XG4gICAgICAgICAgICByZXN0QXBpSWQ6IHRoaXMuYXBpLnJlZlxuICAgICAgICAgICAgLCByZXNvdXJjZUlkOiB1cGRhdGVTdGF0dXMucmVmXG4gICAgICAgICAgICAsIGF1dGhvcml6YXRpb25UeXBlOiBBUElHVFcuQXV0aG9yaXphdGlvblR5cGUuQ09HTklUT1xuICAgICAgICAgICAgLCBhdXRob3JpemVySWQ6IGF1dGhvcml6ZXIucmVmXG4gICAgICAgICAgICAsIGh0dHBNZXRob2Q6ICdQT1NUJ1xuICAgICAgICAgICAgLCByZXF1ZXN0UGFyYW1ldGVyczoge1xuICAgICAgICAgICAgICAgICdtZXRob2QucmVxdWVzdC5oZWFkZXIuQXV0aGVudGljYXRpb24nOiB0cnVlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAsIGludGVncmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgaW50ZWdyYXRpb25IdHRwTWV0aG9kOiAnUE9TVCdcbiAgICAgICAgICAgICAgICAsIHR5cGU6ICdBV1MnXG4gICAgICAgICAgICAgICAgLCB1cmk6ICdhcm46YXdzOmFwaWdhdGV3YXk6JyArIHByb3BzLnJlZ2lvbiArICc6a2luZXNpczphY3Rpb24vUHV0UmVjb3JkJ1xuICAgICAgICAgICAgICAgICwgY3JlZGVudGlhbHM6IGFwaXJvbGUucm9sZUFyblxuICAgICAgICAgICAgICAgICwgcGFzc3Rocm91Z2hCZWhhdmlvcjogJ1dIRU5fTk9fVEVNUExBVEVTJ1xuICAgICAgICAgICAgICAgICwgcmVxdWVzdFRlbXBsYXRlczoge1xuICAgICAgICAgICAgICAgICAgICAnYXBwbGljYXRpb24vanNvbic6XG4gICAgICAgICAgICAgICAgICAgICAgICBgI3NldCgkaW5wdXRSb290ID0gJGlucHV0LnBhdGgoJyQnKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkRhdGFcIiA6IFwiJHV0aWwuYmFzZTY0RW5jb2RlKFwiJGlucHV0Lmpzb24oJyQnKVwiKVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUGFydGl0aW9uS2V5XCIgOiAkaW5wdXQuanNvbignJC5TZXNzaW9uSWQnKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlN0cmVhbU5hbWVcIiA6IFwiYCsgdGhpcy5raW5lc2lzU3RyZWFtcy5zdHJlYW1OYW1lICsgYFwiXG4gICAgICAgICAgICAgICAgICAgICAgICB9YFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAsIGludGVncmF0aW9uUmVzcG9uc2VzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnXG4gICAgICAgICAgICAgICAgICAgICAgICAsIHJlc3BvbnNlUGFyYW1ldGVyczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6IFwiJyonXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfV1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICwgbWV0aG9kUmVzcG9uc2VzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJ1xuICAgICAgICAgICAgICAgICAgICAsIHJlc3BvbnNlUGFyYW1ldGVyczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICwgcmVzcG9uc2VNb2RlbHM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdhcHBsaWNhdGlvbi9qc29uJzogJ0VtcHR5J1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9KTtcblxuXG4gICAgICAgIC8vIE9QVElPTlNcbiAgICAgICAgbGV0IHVwZGF0ZXN0YXR1c09wdGlvbnNNZXRob2QgPSBuZXcgQVBJR1RXLkNmbk1ldGhvZCh0aGlzLCBwcm9wcy5nZXRBcHBsaWNhdGlvbk5hbWUoKSArIFwiQVBJdjF1cGRhdGVTdGF0dXNPUFRJT05TXCIsIHtcbiAgICAgICAgICAgIHJlc3RBcGlJZDogdGhpcy5hcGkucmVmXG4gICAgICAgICAgICAsIHJlc291cmNlSWQ6IHVwZGF0ZVN0YXR1cy5yZWZcbiAgICAgICAgICAgICwgYXV0aG9yaXphdGlvblR5cGU6IEFQSUdUVy5BdXRob3JpemF0aW9uVHlwZS5OT05FXG4gICAgICAgICAgICAsIGh0dHBNZXRob2Q6ICdPUFRJT05TJ1xuICAgICAgICAgICAgLCBpbnRlZ3JhdGlvbjoge1xuICAgICAgICAgICAgICAgIHBhc3N0aHJvdWdoQmVoYXZpb3I6ICd3aGVuX25vX21hdGNoJ1xuICAgICAgICAgICAgICAgICwgdHlwZTogJ01PQ0snXG4gICAgICAgICAgICAgICAgLCByZXF1ZXN0VGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgICAgICdhcHBsaWNhdGlvbi9qc29uJzogYHtcXFwic3RhdHVzQ29kZVxcXCI6IDIwMH1gXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICwgaW50ZWdyYXRpb25SZXNwb25zZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdHVzQ29kZTogJzIwMCdcbiAgICAgICAgICAgICAgICAgICAgICAgICwgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogXCInKidcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICwgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6IFwiJyonXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAsICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiBcIidDb250ZW50LVR5cGUsQXV0aG9yaXphdGlvbixYLUFtei1EYXRlLFgtQXBpLUtleSxYLUFtei1TZWN1cml0eS1Ub2tlbidcIlxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLCBtZXRob2RSZXNwb25zZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnXG4gICAgICAgICAgICAgICAgICAgICwgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICAsICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICAsICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLCByZXNwb25zZU1vZGVsczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiAnRW1wdHknXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH0pO1xuXG5cbiAgICAgICAgbGV0IGRlcGxveW1lbnQgPSBuZXcgQVBJR1RXLkNmbkRlcGxveW1lbnQodGhpcywgcHJvcHMuZ2V0QXBwbGljYXRpb25OYW1lKCkgKyBcIkFQSURlcGxveW1lbnRcIiwge1xuICAgICAgICAgICAgcmVzdEFwaUlkOiB0aGlzLmFwaS5yZWZcbiAgICAgICAgICAgICwgc3RhZ2VOYW1lOiAncHJvZCdcbiAgICAgICAgICAgICwgZGVzY3JpcHRpb246ICdQcm9kdWN0aW9uIGRlcGxveW1lbnQnXG4gICAgICAgIH0pO1xuICAgICAgICBkZXBsb3ltZW50LmFkZERlcGVuZHNPbihzZXNzaW9uR2V0TWV0aG9kKTtcbiAgICAgICAgZGVwbG95bWVudC5hZGREZXBlbmRzT24oc2Vzc2lvbk9wdGlvbnNNZXRob2QpO1xuICAgICAgICBkZXBsb3ltZW50LmFkZERlcGVuZHNPbih3ZWJzb2NrZXRHZXRNZXRob2QpO1xuICAgICAgICBkZXBsb3ltZW50LmFkZERlcGVuZHNPbih3ZWJzb2NrZXRPcHRpb25zTWV0aG9kKTtcbiAgICAgICAgZGVwbG95bWVudC5hZGREZXBlbmRzT24oY29uZmlnR2V0TWV0aG9kKTtcbiAgICAgICAgZGVwbG95bWVudC5hZGREZXBlbmRzT24oY29uZmlnT3B0aW9uc01ldGhvZCk7XG4gICAgICAgIGRlcGxveW1lbnQuYWRkRGVwZW5kc09uKGFsbG9jYXRlUG9zdE1ldGhvZCk7XG4gICAgICAgIGRlcGxveW1lbnQuYWRkRGVwZW5kc09uKGFsbG9jYXRlT3B0aW9uc01ldGhvZCk7XG4gICAgICAgIGRlcGxveW1lbnQuYWRkRGVwZW5kc09uKGRlYWxsb2NhdGVQb3N0TWV0aG9kKTtcbiAgICAgICAgZGVwbG95bWVudC5hZGREZXBlbmRzT24oZGVhbGxvY2F0ZU9wdGlvbnNNZXRob2QpO1xuICAgICAgICBkZXBsb3ltZW50LmFkZERlcGVuZHNPbihzY29yZWJvYXJkUG9zdE1ldGhvZCk7XG4gICAgICAgIGRlcGxveW1lbnQuYWRkRGVwZW5kc09uKHNjb3JlYm9hcmRPcHRpb25zTWV0aG9kKTtcbiAgICAgICAgZGVwbG95bWVudC5hZGREZXBlbmRzT24odXBkYXRlc3RhdHVzUG9zdE1ldGhvZCk7XG4gICAgICAgIGRlcGxveW1lbnQuYWRkRGVwZW5kc09uKHVwZGF0ZXN0YXR1c09wdGlvbnNNZXRob2QpO1xuXG4gICAgICAgIHRoaXMuYWRkUmVzb3VyY2UoXCJhcGlndHcudXJsXCIsXCJodHRwczovL1wiK3RoaXMuYXBpLnJlZitcIi5leGVjdXRlLWFwaS5cIitwcm9wcy5yZWdpb24rXCIuYW1hem9uYXdzLmNvbS9wcm9kL3YxL1wiKTtcbiAgICB9XG5cblxuICAgIHVwZGF0ZVVzZXJzUm9sZXMocHJvcHM6IElQYXJhbWV0ZXJBd2FyZVByb3BzKSB7XG5cbiAgICAgICAgbGV0IGJhc2VBcm4gPSAnYXJuOmF3czphcGlnYXRld2F5OicgKyBwcm9wcy5yZWdpb24gKyAnOicgKyBwcm9wcy5hY2NvdW50SWQgKyAnOicgKyB0aGlzLmFwaS5yZWYgKyAnL3Byb2QvKi8nO1xuICAgICAgICBsZXQgYmFzZUV4ZWNBcm4gPSAnYXJuOmF3czpleGVjdXRlLWFwaTonICsgcHJvcHMucmVnaW9uICsgJzonICsgcHJvcHMuYWNjb3VudElkICsgJzonICsgdGhpcy5hcGkucmVmICsgJy9wcm9kLyc7XG4gICAgICAgIGxldCBwbGF5ZXJSb2xlID0gKDxJQU0uUm9sZT5wcm9wcy5nZXRQYXJhbWV0ZXIoJ3NlY3VyaXR5LnBsYXllcnNyb2xlJykpO1xuXG4gICAgICAgIHBsYXllclJvbGUuYWRkVG9Qb2xpY3koXG4gICAgICAgICAgICBuZXcgSUFNLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgICAgYWN0aW9uczogWydhcGlnYXRld2F5OkdFVCddLFxuICAgICAgICAgICAgICAgIHJlc291cmNlczogW1xuICAgICAgICAgICAgICAgICAgICBiYXNlQXJuICsgJ2NvbmZpZycsXG4gICAgICAgICAgICAgICAgICAgIGJhc2VBcm4gKyAnc2Vzc2lvbicsXG4gICAgICAgICAgICAgICAgICAgIGJhc2VBcm4gKyAnc2NvcmVib2FyZCdcbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9KVxuICAgICAgICApO1xuICAgICAgICBwbGF5ZXJSb2xlLmFkZFRvUG9saWN5KFxuICAgICAgICAgICAgbmV3IElBTS5Qb2xpY3lTdGF0ZW1lbnQoXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBhY3Rpb25zOiBbJ2V4ZWN1dGUtYXBpOkludm9rZSddLFxuICAgICAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJhc2VFeGVjQXJuICsgJ0dFVC9jb25maWcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgYmFzZUV4ZWNBcm4gKyAnR0VUL3Nlc3Npb24nLFxuICAgICAgICAgICAgICAgICAgICAgICAgYmFzZUV4ZWNBcm4gKyAnR0VUL3Njb3JlYm9hcmQnXG4gICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICApO1xuICAgICAgICBwbGF5ZXJSb2xlLmFkZFRvUG9saWN5KFxuICAgICAgICAgICAgbmV3IElBTS5Qb2xpY3lTdGF0ZW1lbnQoXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBhY3Rpb25zOiBbJ2FwaWdhdGV3YXk6UE9TVCddLFxuICAgICAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJhc2VBcm4gKyAndXBkYXRlc3RhdHVzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGJhc2VBcm4gKyAnYWxsb2NhdGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgYmFzZUFybiArICdkZWFsbG9jYXRlJ1xuICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICAgICAgcGxheWVyUm9sZS5hZGRUb1BvbGljeShcbiAgICAgICAgICAgIG5ldyBJQU0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICAgICAgICBhY3Rpb25zOiBbJ2V4ZWN1dGUtYXBpOkludm9rZSddLFxuICAgICAgICAgICAgICAgIHJlc291cmNlczogW1xuICAgICAgICAgICAgICAgICAgICBiYXNlRXhlY0FybiArICdQT1NUL3VwZGF0ZXN0YXR1cycsXG4gICAgICAgICAgICAgICAgICAgIGJhc2VFeGVjQXJuICsgJ1BPU1QvYWxsb2NhdGUnLFxuICAgICAgICAgICAgICAgICAgICBiYXNlRXhlY0FybiArICdQT1NUL2RlYWxsb2NhdGUnXG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSlcbiAgICAgICAgKTtcblxuICAgICAgICBsZXQgbWFuYWdlclJvbGUgPSAoPElBTS5Sb2xlPnByb3BzLmdldFBhcmFtZXRlcignc2VjdXJpdHkubWFuYWdlcnNyb2xlJykpO1xuICAgICAgICBtYW5hZ2VyUm9sZS5hZGRUb1BvbGljeShcbiAgICAgICAgICAgIG5ldyBJQU0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICAgICAgICBhY3Rpb25zIDogW1xuICAgICAgICAgICAgICAgICAgICBcImR5bmFtb2RiOkJhdGNoR2V0SXRlbVwiLFxuICAgICAgICAgICAgICAgICAgICBcImR5bmFtb2RiOkJhdGNoV3JpdGVJdGVtXCIsXG4gICAgICAgICAgICAgICAgICAgIFwiZHluYW1vZGI6UHV0SXRlbVwiLFxuICAgICAgICAgICAgICAgICAgICBcImR5bmFtb2RiOlNjYW5cIixcbiAgICAgICAgICAgICAgICAgICAgXCJkeW5hbW9kYjpRdWVyeVwiLFxuICAgICAgICAgICAgICAgICAgICBcImR5bmFtb2RiOkdldEl0ZW1cIlxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgcmVzb3VyY2VzIDogWyBcImFybjphd3M6ZHluYW1vZGI6XCIgKyBwcm9wcy5yZWdpb24gKyBcIjpcIiArIHByb3BzLmFjY291bnRJZCArIFwiOnRhYmxlL1wiICsgcHJvcHMuZ2V0QXBwbGljYXRpb25OYW1lKCkgKyBcIipcIiBdXG5cbiAgICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgICAgIG1hbmFnZXJSb2xlLmFkZFRvUG9saWN5KFxuICAgICAgICAgICAgbmV3IElBTS5Qb2xpY3lTdGF0ZW1lbnQoeyAgICBcbiAgICAgICAgICAgICAgICBhY3Rpb25zIDogW1xuICAgICAgICAgICAgICAgICAgICBcInNzbTpHZXRQYXJhbWV0ZXJzXCIsXG4gICAgICAgICAgICAgICAgICAgIFwic3NtOkdldFBhcmFtZXRlclwiLFxuICAgICAgICAgICAgICAgICAgICBcInNzbTpEZWxldGVQYXJhbWV0ZXJzXCIsXG4gICAgICAgICAgICAgICAgICAgIFwic3NtOlB1dFBhcmFtZXRlclwiLFxuICAgICAgICAgICAgICAgICAgICBcInNzbTpEZWxldGVQYXJhbWV0ZXJcIlxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgcmVzb3VyY2VzIDogW1xuICAgICAgICAgICAgICAgICAgICBcImFybjphd3M6c3NtOlwiICsgcHJvcHMucmVnaW9uICsgXCI6XCIgKyBwcm9wcy5hY2NvdW50SWQgKyBcIjpwYXJhbWV0ZXIvXCIgKyBwcm9wcy5nZXRBcHBsaWNhdGlvbk5hbWUoKS50b0xvd2VyQ2FzZSgpICsgXCIvKlwiXG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICAgICAgbWFuYWdlclJvbGUuYWRkVG9Qb2xpY3koXG4gICAgICAgICAgICBuZXcgSUFNLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgICAgYWN0aW9ucyA6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJraW5lc2lzOkdldFNoYXJkSXRlcmF0b3JcIixcbiAgICAgICAgICAgICAgICAgICAgXCJraW5lc2lzOkRlc2NyaWJlU3RyZWFtXCIsXG4gICAgICAgICAgICAgICAgICAgIFwia2luZXNpczpHZXRSZWNvcmRzXCJcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIHJlc291cmNlcyA6IFsgdGhpcy5raW5lc2lzU3RyZWFtcy5zdHJlYW1Bcm4gXVxuICAgICAgICAgICAgfSlcbiAgICAgICAgKTtcblxuICAgICAgICBtYW5hZ2VyUm9sZS5hZGRUb1BvbGljeShcbiAgICAgICAgICAgIG5ldyBJQU0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICAgICAgICBhY3Rpb25zOiBbICdhcGlnYXRld2F5OionIF0sXG4gICAgICAgICAgICAgICAgcmVzb3VyY2VzIDogWyBiYXNlQXJuICsgJyonIF1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG59Il19
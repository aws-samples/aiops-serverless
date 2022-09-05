"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assertions_1 = require("aws-cdk-lib/assertions");
const configLayer = require("./../lib/layer/configurationLayer");
const databaseLayer = require("./../lib/layer/databaseLayer");
const securityLayer = require("./../lib/layer/securityLayer");
const storageLayer = require("./../lib/layer/storageLayer");
const processingLayer = require("./../lib/layer/processingLayer");
const websocketLayer = require("./../lib/layer/websocketLayer");
const ingestionConsumptionLayer = require("./../lib/layer/ingestionConsumptionLayer");
const resourceawarestack_1 = require("./../lib/resourceawarestack");
const nrta_1 = require("./../lib/nrta");
// This is the helper class which instantiates the essential resources and then pass them to the testFunction
class UnderTheSeaTest {
    static test(testFunction) {
        if (!testFunction)
            throw new Error("Test function was not defined");
        const stack = new resourceawarestack_1.ResourceAwareStack();
        const props = new nrta_1.NRTAProps();
        props.region = process.env.region;
        props.accountId = process.env.account;
        props.setApplicationName('TEST');
        testFunction(stack, props);
    }
}
// TO-DO need to implement this test
/*
describe("SecurityLayer",  () => {
    test("Synthesizes the security layer", () => {
         const stack = new ResourceAwareStack();
         const props = new NRTAProps();
         props.region = process.env.region;
         props.accountId = process.env.account;
         props.setApplicationName('TEST_SECURITY');
         new securityLayer.SecurityLayer(stack, 'SecurityLayer', props);
         const template = Template.fromStack(stack);
         
        let expectedResources = [
            'AWS::IAM::Role',
            'AWS::IAM::Policy',
            'AWS::Lambda::Function',
            'AWS::Cognito::UserPool',
            'AWS::Cognito::UserPoolClient',
            'AWS::Lambda::Permission',
            'AWS::Cognito::IdentityPool',
            'AWS::Cognito::UserPoolGroup',
            'AWS::Cognito::IdentityPoolRoleAttachment'
        ];
        expectedResources.forEach( (resource) => {
            template.findResources(resource);
        });
    });
});
*/
describe("ConfigurationLayer", () => {
    test("ConfigurationLayer validation (Systems Manager Parameters)", () => {
        const stack = new resourceawarestack_1.ResourceAwareStack();
        const props = new nrta_1.NRTAProps();
        props.region = process.env.region;
        props.accountId = process.env.account;
        props.setApplicationName('TEST_CONFIG');
        let ssmParameters = new Map();
        ssmParameters.set("parameter1", "value1");
        props.addParameter("ssmParameters", ssmParameters);
        new configLayer.ConfigurationLayer(stack, 'ConfigLayer', props);
        const template = assertions_1.Template.fromStack(stack);
        template.findResources("AWS::SSM::Parameter");
    });
});
describe('StorageLayer validation', () => {
    test('StorageLayer validation', () => {
        const stack = new resourceawarestack_1.ResourceAwareStack();
        const props = new nrta_1.NRTAProps();
        props.region = process.env.region;
        props.accountId = process.env.account;
        props.setApplicationName('TEST_CONFIG');
        const template = assertions_1.Template.fromStack(stack);
        template.findResources("AWS::S3::Bucket");
    });
});
// TO-DO need to implement this test
/*
describe('Content Delivery', () => {
    test('Content Delivery', () => {
        const stack = new ResourceAwareStack();
        const props = new NRTAProps();
        props.region = process.env.region;
        props.accountId = process.env.account;
        props.addParameter('appBucket','appbucket');
        new contentDeliveryLayer.ContentDeliveryLayer(stack, 'ContentDeliveryLayer', props);
        const template = Template.fromStack(stack);
        template.findResources('AWS::CloudFront::CloudFrontOriginAccessIdentity');
        template.findResources('AWS::CloudFront::Distribution');
        template.findResources('AWS::S3::BucketPolicy');
    });
});
*/
describe('DatabaseLayer validation', () => {
    test('DatabaseLayer validation', () => {
        const stack = new resourceawarestack_1.ResourceAwareStack();
        const props = new nrta_1.NRTAProps();
        props.region = process.env.region;
        props.accountId = process.env.account;
        new databaseLayer.DatabaseLayer(stack, 'DatabaseLayer', props);
        const template = assertions_1.Template.fromStack(stack);
        template.findResources('AWS::DynamoDB::Table');
    });
});
describe('ProcessingLayer validation', () => {
    test('ProcessingLayer validation', () => {
        const stack = new resourceawarestack_1.ResourceAwareStack();
        const props = new nrta_1.NRTAProps();
        props.region = process.env.region;
        props.accountId = process.env.account;
        props.addParameter('table.sessioncontrol', 'TBLSESSIONCONTROL');
        props.addParameter('table.sessionTopX', 'TBLSESSIONTOP');
        props.addParameter('table.session', 'TBLSESSION');
        new processingLayer.ProcessingLayer(stack, 'ProcessingLayer', props);
        let expectedResources = [
            'AWS::IAM::Role',
            'AWS::Lambda::Function',
            'AWS::SQS::Queue'
        ];
        const template = assertions_1.Template.fromStack(stack);
        expectedResources.forEach((resource) => {
            template.findResources(resource);
        });
    });
});
describe('WebsocketLayer validation', () => {
    test('WebsocketLayer validation', () => {
        const stack = new resourceawarestack_1.ResourceAwareStack();
        const props = new nrta_1.NRTAProps();
        props.region = process.env.region;
        props.accountId = process.env.account;
        props.addParameter('table.sessioncontrol', 'TBL_TEST_SESSIONCONTROL');
        new websocketLayer.WebSocketLayer(stack, 'WebSocketLayer', props);
        const template = assertions_1.Template.fromStack(stack);
        template.findResources('AWS::Lambda::Function');
        template.findResources('AWS::IAM::Role');
    });
});
describe('IngestionConsumptionLayer validation', () => {
    test('IngestionConsumptionLayer validation', () => {
        const stack = new resourceawarestack_1.ResourceAwareStack();
        const props = new nrta_1.NRTAProps();
        props.region = process.env.region;
        props.accountId = process.env.account;
        props.addParameter('kinesisintegration', true);
        props.addParameter('firehose', true);
        let secl = new securityLayer.SecurityLayer(stack, 'SecurityLayer', props);
        props.addParameter('existingbuckets', []);
        let stol = new storageLayer.StorageLayer(stack, 'StorageLayer', props);
        props.addParameter('rawbucketarn', stol.getRawDataBucketArn());
        let dbl = new databaseLayer.DatabaseLayer(stack, 'DatabaseLayer', props);
        props.addParameter('table.sessionTopX', dbl.getResource('table.sessiontopx'));
        props.addParameter('table.session', dbl.getResource('table.session'));
        props.addParameter('table.sessionControl', dbl.getResource('table.sessioncontrol'));
        let pl = new processingLayer.ProcessingLayer(stack, 'ProcessingLayer', props);
        props.addParameter('rawbucketarn', stol.getRawDataBucketArn());
        props.addParameter('userpool', secl.getUserPoolArn());
        props.addParameter('userpoolid', secl.getUserPoolId());
        props.addParameter('table.session', dbl.getResource('table.session'));
        props.addParameter('table.sessiontopx', dbl.getResource('table.sessiontopx'));
        props.addParameter('lambda.allocate', pl.getAllocateFunctionRef());
        props.addParameter('lambda.deallocate', pl.getDeallocateFunctionArn());
        props.addParameter('lambda.scoreboard', pl.getScoreboardFunctionRef());
        props.addParameter('security.playersrole', secl.getResource('security.playersrole'));
        props.addParameter('security.managersrole', secl.getResource('security.managersrole'));
        new ingestionConsumptionLayer.IngestionConsumptionLayer(stack, 'IngestionConsumptionLayer', props);
        let expectedResources = [
            'AWS::Kinesis::Stream',
            'AWS::KinesisFirehose::DeliveryStream',
            'AWS::IAM::Role',
            'AWS::ApiGateway::RestApi',
            'AWS::ApiGateway::GatewayResponse',
            'AWS::ApiGateway::Authorizer',
            'AWS::ApiGateway::Model',
            'AWS::ApiGateway::Resource',
            'AWS::ApiGateway::Method',
            'AWS::ApiGateway::Deployment'
        ];
        const template = assertions_1.Template.fromStack(stack);
        expectedResources.forEach((resource) => {
            template.findResources(resource);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzaW1wbGUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHVEQUFrRDtBQUNsRCxpRUFBaUU7QUFDakUsOERBQThEO0FBQzlELDhEQUE4RDtBQUM5RCw0REFBNEQ7QUFDNUQsa0VBQWtFO0FBQ2xFLGdFQUFnRTtBQUNoRSxzRkFBc0Y7QUFDdEYsb0VBQWlFO0FBQ2pFLHdDQUEwQztBQWN6Qyw2R0FBNkc7QUFDN0csTUFBTSxlQUFlO0lBQ2xCLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBMEI7UUFDbEMsSUFBSSxDQUFDLFlBQVk7WUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLCtCQUErQixDQUFDLENBQUM7UUFDcEUsTUFBTSxLQUFLLEdBQUcsSUFBSSx1Q0FBa0IsRUFBRSxDQUFDO1FBQ3ZDLE1BQU0sS0FBSyxHQUFHLElBQUksZ0JBQVMsRUFBRSxDQUFDO1FBQzlCLEtBQUssQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUM7UUFDbEMsS0FBSyxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQztRQUN0QyxLQUFLLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDakMsWUFBWSxDQUFDLEtBQUssRUFBQyxLQUFLLENBQUMsQ0FBQztJQUM3QixDQUFDO0NBQ0w7QUFHRCxvQ0FBb0M7QUFDcEM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztFQTJCRTtBQUVGLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7SUFDaEMsSUFBSSxDQUFDLDREQUE0RCxFQUFFLEdBQUcsRUFBRTtRQUNwRSxNQUFNLEtBQUssR0FBRyxJQUFJLHVDQUFrQixFQUFFLENBQUM7UUFDdkMsTUFBTSxLQUFLLEdBQUcsSUFBSSxnQkFBUyxFQUFFLENBQUM7UUFDOUIsS0FBSyxDQUFDLE1BQU0sR0FBRyxPQUFPLENB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QUFDLENBQUM7UUFDckYsS0FBSyxDQUFDLFlBQVksQ0FBQyx1QkFBdUIsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQztRQUN2RixJQUFJLHlCQUF5QixDQUFDLHlCQUF5QixDQUFDLEtBQUssRUFBRSwyQkFBMkIsRUFBQyxLQUFLLENBQUMsQ0FBQztRQUNsRyxJQUFJLGlCQUFpQixHQUFHO1lBQ3BCLHNCQUFzQjtZQUN0QixzQ0FBc0M7WUFDdEMsZ0JBQWdCO1lBQ2hCLDBCQUEwQjtZQUMxQixrQ0FBa0M7WUFDbEMsNkJBQTZCO1lBQzdCLHdCQUF3QjtZQUN4QiwyQkFBMkI7WUFDM0IseUJBQXlCO1lBQ3pCLDZCQUE2QjtTQUNoQyxDQUFDO1FBQ0YsTUFBTSxRQUFRLEdBQUcscUJBQVEsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDM0MsaUJBQWlCLENBQUMsT0FBTyxDQUFFLENBQUMsUUFBUSxFQUFFLEVBQUU7WUFDckMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNwQyxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUZW1wbGF0ZSB9IGZyb20gXCJhd3MtY2RrLWxpYi9hc3NlcnRpb25zXCI7XG5pbXBvcnQgKiBhcyBjb25maWdMYXllciBmcm9tICcuLy4uL2xpYi9sYXllci9jb25maWd1cmF0aW9uTGF5ZXInO1xuaW1wb3J0ICogYXMgZGF0YWJhc2VMYXllciBmcm9tICcuLy4uL2xpYi9sYXllci9kYXRhYmFzZUxheWVyJztcbmltcG9ydCAqIGFzIHNlY3VyaXR5TGF5ZXIgZnJvbSAnLi8uLi9saWIvbGF5ZXIvc2VjdXJpdHlMYXllcic7XG5pbXBvcnQgKiBhcyBzdG9yYWdlTGF5ZXIgZnJvbSAnLi8uLi9saWIvbGF5ZXIvc3RvcmFnZUxheWVyJztcbmltcG9ydCAqIGFzIHByb2Nlc3NpbmdMYXllciBmcm9tICcuLy4uL2xpYi9sYXllci9wcm9jZXNzaW5nTGF5ZXInO1xuaW1wb3J0ICogYXMgd2Vic29ja2V0TGF5ZXIgZnJvbSAnLi8uLi9saWIvbGF5ZXIvd2Vic29ja2V0TGF5ZXInO1xuaW1wb3J0ICogYXMgaW5nZXN0aW9uQ29uc3VtcHRpb25MYXllciBmcm9tICcuLy4uL2xpYi9sYXllci9pbmdlc3Rpb25Db25zdW1wdGlvbkxheWVyJztcbmltcG9ydCB7IFJlc291cmNlQXdhcmVTdGFjayB9IGZyb20gJy4vLi4vbGliL3Jlc291cmNlYXdhcmVzdGFjayc7XG5pbXBvcnQgeyBOUlRBUHJvcHMgfSBmcm9tICcuLy4uL2xpYi9ucnRhJztcblxuLyoqXG4gKiBUaGVzZSB0ZXN0cyBhcmUgYnVpbHQgdXNpbmcgaHR0cHM6Ly9qZXN0anMuaW8vXG4gKiBcbiAqIFRvIHByZXBhcmUgdGhlIGVudmlyb21lbnQsIHlvdSBuZWVkIHRvOlxuICogbnBtIGluc3RhbGwgLS1zYXZlLWRldiBqZXN0IEB0eXBlcy9qZXN0IEBhd3MtY2RrL2Fzc2VydFxuICovXG4gXG4gLy8gVGhpcyBpbnRlcmZhY2Ugc3BlY2lmaWVzIHRoZSB0ZXN0IGZ1bmN0aW9uIHRoYXQgd2UgbmVlZCB0byBoYXZlIGluIHBsYWNlIHRvIHRlc3QgVW5kZXIgVGhlIFNlYSBzdGFja3NcbiBpbnRlcmZhY2UgVGVzdEZ1bmN0aW9uIHtcbiAgICAgKHN0YWNrIDogUmVzb3VyY2VBd2FyZVN0YWNrLCBwcm9wczogTlJUQVByb3BzKSA6IHZvaWQ7XG4gfSBcbiBcbiAvLyBUaGlzIGlzIHRoZSBoZWxwZXIgY2xhc3Mgd2hpY2ggaW5zdGFudGlhdGVzIHRoZSBlc3NlbnRpYWwgcmVzb3VyY2VzIGFuZCB0aGVuIHBhc3MgdGhlbSB0byB0aGUgdGVzdEZ1bmN0aW9uXG4gY2xhc3MgVW5kZXJUaGVTZWFUZXN0IHtcbiAgICBzdGF0aWMgdGVzdCh0ZXN0RnVuY3Rpb246IFRlc3RGdW5jdGlvbikge1xuICAgICAgICBpZiAoIXRlc3RGdW5jdGlvbikgdGhyb3cgbmV3IEVycm9yKFwiVGVzdCBmdW5jdGlvbiB3YXMgbm90IGRlZmluZWRcIik7XG4gICAgICAgIGNvbnN0IHN0YWNrID0gbmV3IFJlc291cmNlQXdhcmVTdGFjaygpO1xuICAgICAgICBjb25zdCBwcm9wcyA9IG5ldyBOUlRBUHJvcHMoKTtcbiAgICAgICAgcHJvcHMucmVnaW9uID0gcHJvY2Vzcy5lbnYucmVnaW9uO1xuICAgICAgICBwcm9wcy5hY2NvdW50SWQgPSBwcm9jZXNzLmVudi5hY2NvdW50O1xuICAgICAgICBwcm9wcy5zZXRBcHBsaWNhdGlvbk5hbWUoJ1RFU1QnKTtcbiAgICAgICAgdGVzdEZ1bmN0aW9uKHN0YWNrLHByb3BzKTtcbiAgICAgfSAgXG59XG4gXG5cbi8vIFRPLURPIG5lZWQgdG8gaW1wbGVtZW50IHRoaXMgdGVzdFxuLypcbmRlc2NyaWJlKFwiU2VjdXJpdHlMYXllclwiLCAgKCkgPT4ge1xuICAgIHRlc3QoXCJTeW50aGVzaXplcyB0aGUgc2VjdXJpdHkgbGF5ZXJcIiwgKCkgPT4ge1xuICAgICAgICAgY29uc3Qgc3RhY2sgPSBuZXcgUmVzb3VyY2VBd2FyZVN0YWNrKCk7XG4gICAgICAgICBjb25zdCBwcm9wcyA9IG5ldyBOUlRBUHJvcHMoKTtcbiAgICAgICAgIHByb3BzLnJlZ2lvbiA9IHByb2Nlc3MuZW52LnJlZ2lvbjtcbiAgICAgICAgIHByb3BzLmFjY291bnRJZCA9IHByb2Nlc3MuZW52LmFjY291bnQ7XG4gICAgICAgICBwcm9wcy5zZXRBcHBsaWNhdGlvbk5hbWUoJ1RFU1RfU0VDVVJJVFknKTtcbiAgICAgICAgIG5ldyBzZWN1cml0eUxheWVyLlNlY3VyaXR5TGF5ZXIoc3RhY2ssICdTZWN1cml0eUxheWVyJywgcHJvcHMpO1xuICAgICAgICAgY29uc3QgdGVtcGxhdGUgPSBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spO1xuICAgICAgICAgXG4gICAgICAgIGxldCBleHBlY3RlZFJlc291cmNlcyA9IFtcbiAgICAgICAgICAgICdBV1M6OklBTTo6Um9sZScsXG4gICAgICAgICAgICAnQVdTOjpJQU06OlBvbGljeScsXG4gICAgICAgICAgICAnQVdTOjpMYW1iZGE6OkZ1bmN0aW9uJyxcbiAgICAgICAgICAgICdBV1M6OkNvZ25pdG86OlVzZXJQb29sJyxcbiAgICAgICAgICAgICdBV1M6OkNvZ25pdG86OlVzZXJQb29sQ2xpZW50JyxcbiAgICAgICAgICAgICdBV1M6OkxhbWJkYTo6UGVybWlzc2lvbicsXG4gICAgICAgICAgICAnQVdTOjpDb2duaXRvOjpJZGVudGl0eVBvb2wnLFxuICAgICAgICAgICAgJ0FXUzo6Q29nbml0bzo6VXNlclBvb2xHcm91cCcsXG4gICAgICAgICAgICAnQVdTOjpDb2duaXRvOjpJZGVudGl0eVBvb2xSb2xlQXR0YWNobWVudCdcbiAgICAgICAgXTtcbiAgICAgICAgZXhwZWN0ZWRSZXNvdXJjZXMuZm9yRWFjaCggKHJlc291cmNlKSA9PiB7XG4gICAgICAgICAgICB0ZW1wbGF0ZS5maW5kUmVzb3VyY2VzKHJlc291cmNlKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59KTtcbiovXG5cbmRlc2NyaWJlKFwiQ29uZmlndXJhdGlvbkxheWVyXCIsICgpID0+IHtcbiAgICB0ZXN0KFwiQ29uZmlndXJhdGlvbkxheWVyIHZhbGlkYXRpb24gKFN5c3RlbXMgTWFuYWdlciBQYXJhbWV0ZXJzKVwiLCAoKSA9PiB7XG4gICAgICAgIGNvbnN0IHN0YWNrID0gbmV3IFJlc291cmNlQXdhcmVTdGFjaygpO1xuICAgICAgICBjb25zdCBwcm9wcyA9IG5ldyBOUlRBUHJvcHMoKTtcbiAgICAgICAgcHJvcHMucmVnaW9uID0gcHJvY2Vzcy5lbnYucmVnaW9uO1xuICAgICAgICBwcm9wcy5hY2NvdW50SWQgPSBwcm9jZXNzLmVudi5hY2NvdW50O1xuICAgICAgICBwcm9wcy5zZXRBcHBsaWNhdGlvbk5hbWUoJ1RFU1RfQ09ORklHJyk7XG4gICAgICAgIGxldCBzc21QYXJhbWV0ZXJzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgICAgICAgc3NtUGFyYW1ldGVycy5zZXQoXCJwYXJhbWV0ZXIxXCIsIFwidmFsdWUxXCIpO1xuICAgICAgICBwcm9wcy5hZGRQYXJhbWV0ZXIoXCJzc21QYXJhbWV0ZXJzXCIsc3NtUGFyYW1ldGVycyk7XG4gICAgICAgIG5ldyBjb25maWdMYXllci5Db25maWd1cmF0aW9uTGF5ZXIoc3RhY2ssJ0NvbmZpZ0xheWVyJyxwcm9wcyk7XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKTtcbiAgICAgICAgXG4gICAgICAgIHRlbXBsYXRlLmZpbmRSZXNvdXJjZXMoXCJBV1M6OlNTTTo6UGFyYW1ldGVyXCIpO1xuICAgIH0pO1xufSk7XG4gICAgXG5kZXNjcmliZSgnU3RvcmFnZUxheWVyIHZhbGlkYXRpb24nLCAoKSA9PiB7ICAgIFxuICAgIHRlc3QoJ1N0b3JhZ2VMYXllciB2YWxpZGF0aW9uJywgKCkgPT4ge1xuICAgICAgICBjb25zdCBzdGFjayA9IG5ldyBSZXNvdXJjZUF3YXJlU3RhY2soKTtcbiAgICAgICAgY29uc3QgcHJvcHMgPSBuZXcgTlJUQVByb3BzKCk7XG4gICAgICAgIHByb3BzLnJlZ2lvbiA9IHByb2Nlc3MuZW52LnJlZ2lvbjtcbiAgICAgICAgcHJvcHMuYWNjb3VudElkID0gcHJvY2Vzcy5lbnYuYWNjb3VudDtcbiAgICAgICAgcHJvcHMuc2V0QXBwbGljYXRpb25OYW1lKCdURVNUX0NPTkZJRycpO1xuICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IFRlbXBsYXRlLmZyb21TdGFjayhzdGFjayk7XG4gICAgICAgIHRlbXBsYXRlLmZpbmRSZXNvdXJjZXMoXCJBV1M6OlMzOjpCdWNrZXRcIik7XG4gICAgfSk7XG59KTtcblxuLy8gVE8tRE8gbmVlZCB0byBpbXBsZW1lbnQgdGhpcyB0ZXN0XG4vKlxuZGVzY3JpYmUoJ0NvbnRlbnQgRGVsaXZlcnknLCAoKSA9PiB7ICAgIFxuICAgIHRlc3QoJ0NvbnRlbnQgRGVsaXZlcnknLCAoKSA9PiB7XG4gICAgICAgIGNvbnN0IHN0YWNrID0gbmV3IFJlc291cmNlQXdhcmVTdGFjaygpO1xuICAgICAgICBjb25zdCBwcm9wcyA9IG5ldyBOUlRBUHJvcHMoKTtcbiAgICAgICAgcHJvcHMucmVnaW9uID0gcHJvY2Vzcy5lbnYucmVnaW9uO1xuICAgICAgICBwcm9wcy5hY2NvdW50SWQgPSBwcm9jZXNzLmVudi5hY2NvdW50O1xuICAgICAgICBwcm9wcy5hZGRQYXJhbWV0ZXIoJ2FwcEJ1Y2tldCcsJ2FwcGJ1Y2tldCcpO1xuICAgICAgICBuZXcgY29udGVudERlbGl2ZXJ5TGF5ZXIuQ29udGVudERlbGl2ZXJ5TGF5ZXIoc3RhY2ssICdDb250ZW50RGVsaXZlcnlMYXllcicsIHByb3BzKTtcbiAgICAgICAgY29uc3QgdGVtcGxhdGUgPSBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spO1xuICAgICAgICB0ZW1wbGF0ZS5maW5kUmVzb3VyY2VzKCdBV1M6OkNsb3VkRnJvbnQ6OkNsb3VkRnJvbnRPcmlnaW5BY2Nlc3NJZGVudGl0eScpO1xuICAgICAgICB0ZW1wbGF0ZS5maW5kUmVzb3VyY2VzKCdBV1M6OkNsb3VkRnJvbnQ6OkRpc3RyaWJ1dGlvbicpO1xuICAgICAgICB0ZW1wbGF0ZS5maW5kUmVzb3VyY2VzKCdBV1M6OlMzOjpCdWNrZXRQb2xpY3knKTtcbiAgICB9KTtcbn0pO1xuKi9cbiAgIFxuZGVzY3JpYmUoJ0RhdGFiYXNlTGF5ZXIgdmFsaWRhdGlvbicsICgpID0+IHsgIFxuICAgIHRlc3QoJ0RhdGFiYXNlTGF5ZXIgdmFsaWRhdGlvbicsICgpID0+IHtcbiAgICAgICAgY29uc3Qgc3RhY2sgPSBuZXcgUmVzb3VyY2VBd2FyZVN0YWNrKCk7XG4gICAgICAgIGNvbnN0IHByb3BzID0gbmV3IE5SVEFQcm9wcygpO1xuICAgICAgICBwcm9wcy5yZWdpb24gPSBwcm9jZXNzLmVudi5yZWdpb247XG4gICAgICAgIHByb3BzLmFjY291bnRJZCA9IHByb2Nlc3MuZW52LmFjY291bnQ7ICAgICAgICAgICBcbiAgICAgICAgbmV3IGRhdGFiYXNlTGF5ZXIuRGF0YWJhc2VMYXllcihzdGFjaywgJ0RhdGFiYXNlTGF5ZXInLCBwcm9wcyk7XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKTtcbiAgICAgICAgdGVtcGxhdGUuZmluZFJlc291cmNlcygnQVdTOjpEeW5hbW9EQjo6VGFibGUnKTtcbiAgICB9KTtcbn0pO1xuICAgIFxuZGVzY3JpYmUoJ1Byb2Nlc3NpbmdMYXllciB2YWxpZGF0aW9uJywgKCkgPT4geyAgXG4gICAgdGVzdCgnUHJvY2Vzc2luZ0xheWVyIHZhbGlkYXRpb24nLCAoKSA9PiB7XG4gICAgICAgIGNvbnN0IHN0YWNrID0gbmV3IFJlc291cmNlQXdhcmVTdGFjaygpO1xuICAgICAgICBjb25zdCBwcm9wcyA9IG5ldyBOUlRBUHJvcHMoKTtcbiAgICAgICAgcHJvcHMucmVnaW9uID0gcHJvY2Vzcy5lbnYucmVnaW9uO1xuICAgICAgICBwcm9wcy5hY2NvdW50SWQgPSBwcm9jZXNzLmVudi5hY2NvdW50O1xuICAgICAgICBwcm9wcy5hZGRQYXJhbWV0ZXIoJ3RhYmxlLnNlc3Npb25jb250cm9sJywnVEJMU0VTU0lPTkNPTlRST0wnKTtcbiAgICAgICAgcHJvcHMuYWRkUGFyYW1ldGVyKCd0YWJsZS5zZXNzaW9uVG9wWCcsJ1RCTFNFU1NJT05UT1AnKTtcbiAgICAgICAgcHJvcHMuYWRkUGFyYW1ldGVyKCd0YWJsZS5zZXNzaW9uJywnVEJMU0VTU0lPTicpO1xuICAgICAgICBuZXcgcHJvY2Vzc2luZ0xheWVyLlByb2Nlc3NpbmdMYXllcihzdGFjaywgJ1Byb2Nlc3NpbmdMYXllcicsIHByb3BzKTtcbiAgICAgICAgbGV0IGV4cGVjdGVkUmVzb3VyY2VzID0gW1xuICAgICAgICAgICAgJ0FXUzo6SUFNOjpSb2xlJyxcbiAgICAgICAgICAgICdBV1M6OkxhbWJkYTo6RnVuY3Rpb24nLFxuICAgICAgICAgICAgJ0FXUzo6U1FTOjpRdWV1ZSdcbiAgICAgICAgXTtcbiAgICAgICAgY29uc3QgdGVtcGxhdGUgPSBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spO1xuICAgICAgICBleHBlY3RlZFJlc291cmNlcy5mb3JFYWNoKCAocmVzb3VyY2UpID0+IHtcbiAgICAgICAgICAgIHRlbXBsYXRlLmZpbmRSZXNvdXJjZXMocmVzb3VyY2UpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn0pO1xuICAgXG5kZXNjcmliZSgnV2Vic29ja2V0TGF5ZXIgdmFsaWRhdGlvbicsICgpID0+IHtcbiAgICB0ZXN0KCdXZWJzb2NrZXRMYXllciB2YWxpZGF0aW9uJywgKCkgPT4ge1xuICAgICAgICBjb25zdCBzdGFjayA9IG5ldyBSZXNvdXJjZUF3YXJlU3RhY2soKTtcbiAgICAgICAgY29uc3QgcHJvcHMgPSBuZXcgTlJUQVByb3BzKCk7XG4gICAgICAgIHByb3BzLnJlZ2lvbiA9IHByb2Nlc3MuZW52LnJlZ2lvbjtcbiAgICAgICAgcHJvcHMuYWNjb3VudElkID0gcHJvY2Vzcy5lbnYuYWNjb3VudDtcbiAgICAgICAgcHJvcHMuYWRkUGFyYW1ldGVyKCd0YWJsZS5zZXNzaW9uY29udHJvbCcsJ1RCTF9URVNUX1NFU1NJT05DT05UUk9MJyk7XG4gICAgICAgIG5ldyB3ZWJzb2NrZXRMYXllci5XZWJTb2NrZXRMYXllcihzdGFjaywgJ1dlYlNvY2tldExheWVyJywgcHJvcHMpO1xuICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IFRlbXBsYXRlLmZyb21TdGFjayhzdGFjayk7XG4gICAgICAgIHRlbXBsYXRlLmZpbmRSZXNvdXJjZXMoJ0FXUzo6TGFtYmRhOjpGdW5jdGlvbicpO1xuICAgICAgICB0ZW1wbGF0ZS5maW5kUmVzb3VyY2VzKCdBV1M6OklBTTo6Um9sZScpO1xuICAgIH0pO1xufSk7XG4gICBcbmRlc2NyaWJlKCdJbmdlc3Rpb25Db25zdW1wdGlvbkxheWVyIHZhbGlkYXRpb24nLCAoKSA9PiB7XG4gICAgdGVzdCgnSW5nZXN0aW9uQ29uc3VtcHRpb25MYXllciB2YWxpZGF0aW9uJywgKCkgPT4ge1xuICAgICAgICBjb25zdCBzdGFjayA9IG5ldyBSZXNvdXJjZUF3YXJlU3RhY2soKTtcbiAgICAgICAgY29uc3QgcHJvcHMgPSBuZXcgTlJUQVByb3BzKCk7XG4gICAgICAgIHByb3BzLnJlZ2lvbiA9IHByb2Nlc3MuZW52LnJlZ2lvbjtcbiAgICAgICAgcHJvcHMuYWNjb3VudElkID0gcHJvY2Vzcy5lbnYuYWNjb3VudDtcblxuICAgICAgICBwcm9wcy5hZGRQYXJhbWV0ZXIoJ2tpbmVzaXNpbnRlZ3JhdGlvbicsIHRydWUpO1xuICAgICAgICBwcm9wcy5hZGRQYXJhbWV0ZXIoJ2ZpcmVob3NlJyx0cnVlKTtcbiAgICAgICAgbGV0IHNlY2wgPSBuZXcgc2VjdXJpdHlMYXllci5TZWN1cml0eUxheWVyKHN0YWNrLCAnU2VjdXJpdHlMYXllcicsIHByb3BzKTtcbiAgICAgICAgcHJvcHMuYWRkUGFyYW1ldGVyKCdleGlzdGluZ2J1Y2tldHMnLFtdKTtcbiAgICAgICAgbGV0IHN0b2wgPSBuZXcgc3RvcmFnZUxheWVyLlN0b3JhZ2VMYXllcihzdGFjaywgJ1N0b3JhZ2VMYXllcicsIHByb3BzKTtcbiAgICAgICAgcHJvcHMuYWRkUGFyYW1ldGVyKCdyYXdidWNrZXRhcm4nLHN0b2wuZ2V0UmF3RGF0YUJ1Y2tldEFybigpKTtcbiAgICAgICAgbGV0IGRibCA9ICBuZXcgZGF0YWJhc2VMYXllci5EYXRhYmFzZUxheWVyKHN0YWNrLCAnRGF0YWJhc2VMYXllcicsIHByb3BzKTtcbiAgICAgICAgcHJvcHMuYWRkUGFyYW1ldGVyKCd0YWJsZS5zZXNzaW9uVG9wWCcsZGJsLmdldFJlc291cmNlKCd0YWJsZS5zZXNzaW9udG9weCcpKTtcbiAgICAgICAgcHJvcHMuYWRkUGFyYW1ldGVyKCd0YWJsZS5zZXNzaW9uJyxkYmwuZ2V0UmVzb3VyY2UoJ3RhYmxlLnNlc3Npb24nKSk7XG4gICAgICAgIHByb3BzLmFkZFBhcmFtZXRlcigndGFibGUuc2Vzc2lvbkNvbnRyb2wnLGRibC5nZXRSZXNvdXJjZSgndGFibGUuc2Vzc2lvbmNvbnRyb2wnKSk7XG4gICAgICAgIGxldCBwbCA9IG5ldyBwcm9jZXNzaW5nTGF5ZXIuUHJvY2Vzc2luZ0xheWVyKHN0YWNrLCAnUHJvY2Vzc2luZ0xheWVyJywgcHJvcHMpO1xuICAgICAgICBwcm9wcy5hZGRQYXJhbWV0ZXIoJ3Jhd2J1Y2tldGFybicsIHN0b2wuZ2V0UmF3RGF0YUJ1Y2tldEFybigpKTtcbiAgICAgICAgcHJvcHMuYWRkUGFyYW1ldGVyKCd1c2VycG9vbCcsc2VjbC5nZXRVc2VyUG9vbEFybigpKTtcbiAgICAgICAgcHJvcHMuYWRkUGFyYW1ldGVyKCd1c2VycG9vbGlkJywgc2VjbC5nZXRVc2VyUG9vbElkKCkpO1xuICAgICAgICBwcm9wcy5hZGRQYXJhbWV0ZXIoJ3RhYmxlLnNlc3Npb24nLGRibC5nZXRSZXNvdXJjZSgndGFibGUuc2Vzc2lvbicpKTtcbiAgICAgICAgcHJvcHMuYWRkUGFyYW1ldGVyKCd0YWJsZS5zZXNzaW9udG9weCcsZGJsLmdldFJlc291cmNlKCd0YWJsZS5zZXNzaW9udG9weCcpKTtcbiAgICAgICAgcHJvcHMuYWRkUGFyYW1ldGVyKCdsYW1iZGEuYWxsb2NhdGUnLHBsLmdldEFsbG9jYXRlRnVuY3Rpb25SZWYoKSk7XG4gICAgICAgIHByb3BzLmFkZFBhcmFtZXRlcignbGFtYmRhLmRlYWxsb2NhdGUnLHBsLmdldERlYWxsb2NhdGVGdW5jdGlvbkFybigpKTtcbiAgICAgICAgcHJvcHMuYWRkUGFyYW1ldGVyKCdsYW1iZGEuc2NvcmVib2FyZCcscGwuZ2V0U2NvcmVib2FyZEZ1bmN0aW9uUmVmKCkpO1xuICAgICAgICBwcm9wcy5hZGRQYXJhbWV0ZXIoJ3NlY3VyaXR5LnBsYXllcnNyb2xlJywgc2VjbC5nZXRSZXNvdXJjZSgnc2VjdXJpdHkucGxheWVyc3JvbGUnKSk7XG4gICAgICAgIHByb3BzLmFkZFBhcmFtZXRlcignc2VjdXJpdHkubWFuYWdlcnNyb2xlJywgc2VjbC5nZXRSZXNvdXJjZSgnc2VjdXJpdHkubWFuYWdlcnNyb2xlJykpO1xuICAgICAgICBuZXcgaW5nZXN0aW9uQ29uc3VtcHRpb25MYXllci5Jbmdlc3Rpb25Db25zdW1wdGlvbkxheWVyKHN0YWNrLCAnSW5nZXN0aW9uQ29uc3VtcHRpb25MYXllcicscHJvcHMpOyBcbiAgICAgICAgbGV0IGV4cGVjdGVkUmVzb3VyY2VzID0gW1xuICAgICAgICAgICAgJ0FXUzo6S2luZXNpczo6U3RyZWFtJyxcbiAgICAgICAgICAgICdBV1M6OktpbmVzaXNGaXJlaG9zZTo6RGVsaXZlcnlTdHJlYW0nLFxuICAgICAgICAgICAgJ0FXUzo6SUFNOjpSb2xlJyxcbiAgICAgICAgICAgICdBV1M6OkFwaUdhdGV3YXk6OlJlc3RBcGknLFxuICAgICAgICAgICAgJ0FXUzo6QXBpR2F0ZXdheTo6R2F0ZXdheVJlc3BvbnNlJyxcbiAgICAgICAgICAgICdBV1M6OkFwaUdhdGV3YXk6OkF1dGhvcml6ZXInLFxuICAgICAgICAgICAgJ0FXUzo6QXBpR2F0ZXdheTo6TW9kZWwnLFxuICAgICAgICAgICAgJ0FXUzo6QXBpR2F0ZXdheTo6UmVzb3VyY2UnLFxuICAgICAgICAgICAgJ0FXUzo6QXBpR2F0ZXdheTo6TWV0aG9kJyxcbiAgICAgICAgICAgICdBV1M6OkFwaUdhdGV3YXk6OkRlcGxveW1lbnQnXG4gICAgICAgIF07XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKTtcbiAgICAgICAgZXhwZWN0ZWRSZXNvdXJjZXMuZm9yRWFjaCggKHJlc291cmNlKSA9PiB7XG4gICAgICAgICAgIHRlbXBsYXRlLmZpbmRSZXNvdXJjZXMocmVzb3VyY2UpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn0pO1xuXG4iXX0=
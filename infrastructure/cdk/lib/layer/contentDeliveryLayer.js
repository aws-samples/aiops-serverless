"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentDeliveryLayer = void 0;
const resourceawarestack_1 = require("./../resourceawarestack");
const aws_cloudfront_1 = require("aws-cdk-lib/aws-cloudfront");
const aws_s3_1 = require("aws-cdk-lib/aws-s3");
const IAM = require("aws-cdk-lib/aws-iam");
class ContentDeliveryLayer extends resourceawarestack_1.ResourceAwareConstruct {
    constructor(parent, name, props) {
        super(parent, name, props);
        this.createDistribution(props);
    }
    createDistribution(props) {
        let s3BucketOrCnfBucket = props.getParameter('appBucket');
        let appBucket = aws_s3_1.Bucket.fromBucketName(this, props.getApplicationName() + 'ImportedBucket', s3BucketOrCnfBucket.bucketName);
        let cloudFrontAccessIdentity = new aws_cloudfront_1.OriginAccessIdentity(this, this.properties.getApplicationName() + 'CDNAccessId', {
            comment: "Under The Sea OAI for " + s3BucketOrCnfBucket.bucketName
        });
        appBucket.grantRead(cloudFrontAccessIdentity);
        let distribution = new aws_cloudfront_1.CloudFrontWebDistribution(this, props.getApplicationName(), {
            originConfigs: [
                {
                    s3OriginSource: {
                        s3BucketSource: appBucket,
                        originAccessIdentity: cloudFrontAccessIdentity
                    },
                    behaviors: [{ isDefaultBehavior: true }]
                }
            ]
        });
        new aws_s3_1.BucketPolicy(this, props.getApplicationName() + 'AppBucketPolicy', {
            bucket: appBucket,
        }).document.addStatements(new IAM.PolicyStatement({
            actions: ["s3:GetObject"],
            effect: IAM.Effect.ALLOW,
            resources: [
                appBucket.arnForObjects("*")
            ],
            principals: [new IAM.ArnPrincipal("arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity " + cloudFrontAccessIdentity.originAccessIdentityName)]
        }));
        this.addResource("cdndomain", distribution.distributionDomainName);
    }
}
exports.ContentDeliveryLayer = ContentDeliveryLayer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudERlbGl2ZXJ5TGF5ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjb250ZW50RGVsaXZlcnlMYXllci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFHQSxnRUFBc0Y7QUFDdEYsK0RBQTZGO0FBQzdGLCtDQUF5RDtBQUN6RCwyQ0FBNEM7QUFHNUMsTUFBYSxvQkFBcUIsU0FBUSwyQ0FBc0I7SUFFNUQsWUFBWSxNQUFpQixFQUFFLElBQVksRUFBRSxLQUEyQjtRQUNwRSxLQUFLLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMzQixJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUVPLGtCQUFrQixDQUFDLEtBQTJCO1FBRWxELElBQUksbUJBQW1CLEdBQUcsS0FBSyxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUMxRCxJQUFJLFNBQVMsR0FBWSxlQUFNLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsa0JBQWtCLEVBQUUsR0FBQyxnQkFBZ0IsRUFBRSxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUVsSSxJQUFJLHdCQUF3QixHQUFHLElBQUkscUNBQW9CLENBQUMsSUFBSSxFQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsa0JBQWtCLEVBQUUsR0FBQyxhQUFhLEVBQUU7WUFDN0csT0FBTyxFQUFHLHdCQUF3QixHQUFDLG1CQUFtQixDQUFDLFVBQVU7U0FDcEUsQ0FBQyxDQUFDO1FBQ0gsU0FBUyxDQUFDLFNBQVMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBRzlDLElBQUksWUFBWSxHQUFHLElBQUksMENBQXlCLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxFQUFDO1lBQzlFLGFBQWEsRUFBRztnQkFDWjtvQkFDSSxjQUFjLEVBQUc7d0JBQ2IsY0FBYyxFQUFFLFNBQVM7d0JBQ3pCLG9CQUFvQixFQUFHLHdCQUF3QjtxQkFDbEQ7b0JBQ0QsU0FBUyxFQUFHLENBQUUsRUFBQyxpQkFBaUIsRUFBRSxJQUFJLEVBQUMsQ0FBQztpQkFDM0M7YUFDSjtTQUNKLENBQUMsQ0FBQztRQUdILElBQUkscUJBQVksQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLGtCQUFrQixFQUFFLEdBQUMsaUJBQWlCLEVBQUU7WUFDakUsTUFBTSxFQUFHLFNBQVM7U0FDckIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDO1lBQzlDLE9BQU8sRUFBRyxDQUFFLGNBQWMsQ0FBRTtZQUM1QixNQUFNLEVBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLO1lBQzFCLFNBQVMsRUFBRTtnQkFDUCxTQUFTLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQzthQUMvQjtZQUNELFVBQVUsRUFBRyxDQUFFLElBQUksR0FBRyxDQUFDLFlBQVksQ0FBQyxpRUFBaUUsR0FBQyx3QkFBd0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFFO1NBQzdKLENBQUMsQ0FDRCxDQUFDO1FBRUYsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUMsWUFBWSxDQUFDLHNCQUFzQixDQUFDLENBQUM7SUFDdEUsQ0FBQztDQUNKO0FBN0NELG9EQTZDQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCBBbWF6b24uY29tLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuLy8gU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IE1JVC0wXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IFJlc291cmNlQXdhcmVDb25zdHJ1Y3QsIElQYXJhbWV0ZXJBd2FyZVByb3BzIH0gZnJvbSAnLi8uLi9yZXNvdXJjZWF3YXJlc3RhY2snXG5pbXBvcnQgeyBDbG91ZEZyb250V2ViRGlzdHJpYnV0aW9uLCBPcmlnaW5BY2Nlc3NJZGVudGl0eSB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250JztcbmltcG9ydCB7IEJ1Y2tldCwgQnVja2V0UG9saWN5fSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xuaW1wb3J0IElBTSA9IHJlcXVpcmUoJ2F3cy1jZGstbGliL2F3cy1pYW0nKTtcblxuXG5leHBvcnQgY2xhc3MgQ29udGVudERlbGl2ZXJ5TGF5ZXIgZXh0ZW5kcyBSZXNvdXJjZUF3YXJlQ29uc3RydWN0IHtcblxuICAgIGNvbnN0cnVjdG9yKHBhcmVudDogQ29uc3RydWN0LCBuYW1lOiBzdHJpbmcsIHByb3BzOiBJUGFyYW1ldGVyQXdhcmVQcm9wcykge1xuICAgICAgICBzdXBlcihwYXJlbnQsIG5hbWUsIHByb3BzKTtcbiAgICAgICAgdGhpcy5jcmVhdGVEaXN0cmlidXRpb24ocHJvcHMpO1xuICAgIH1cblxuICAgIHByaXZhdGUgY3JlYXRlRGlzdHJpYnV0aW9uKHByb3BzOiBJUGFyYW1ldGVyQXdhcmVQcm9wcykge1xuXG4gICAgICAgIGxldCBzM0J1Y2tldE9yQ25mQnVja2V0ID0gcHJvcHMuZ2V0UGFyYW1ldGVyKCdhcHBCdWNrZXQnKTtcbiAgICAgICAgbGV0IGFwcEJ1Y2tldCA9IDxCdWNrZXQ+IEJ1Y2tldC5mcm9tQnVja2V0TmFtZSh0aGlzLCBwcm9wcy5nZXRBcHBsaWNhdGlvbk5hbWUoKSsnSW1wb3J0ZWRCdWNrZXQnLCBzM0J1Y2tldE9yQ25mQnVja2V0LmJ1Y2tldE5hbWUpO1xuICAgICAgICBcbiAgICAgICAgbGV0IGNsb3VkRnJvbnRBY2Nlc3NJZGVudGl0eSA9IG5ldyBPcmlnaW5BY2Nlc3NJZGVudGl0eSh0aGlzLHRoaXMucHJvcGVydGllcy5nZXRBcHBsaWNhdGlvbk5hbWUoKSsnQ0ROQWNjZXNzSWQnLCB7XG4gICAgICAgICAgICBjb21tZW50IDogXCJVbmRlciBUaGUgU2VhIE9BSSBmb3IgXCIrczNCdWNrZXRPckNuZkJ1Y2tldC5idWNrZXROYW1lXG4gICAgICAgIH0pO1xuICAgICAgICBhcHBCdWNrZXQuZ3JhbnRSZWFkKGNsb3VkRnJvbnRBY2Nlc3NJZGVudGl0eSk7XG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgbGV0IGRpc3RyaWJ1dGlvbiA9IG5ldyBDbG91ZEZyb250V2ViRGlzdHJpYnV0aW9uKHRoaXMsIHByb3BzLmdldEFwcGxpY2F0aW9uTmFtZSgpLHtcbiAgICAgICAgICAgIG9yaWdpbkNvbmZpZ3MgOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBzM09yaWdpblNvdXJjZSA6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHMzQnVja2V0U291cmNlOiBhcHBCdWNrZXQsXG4gICAgICAgICAgICAgICAgICAgICAgICBvcmlnaW5BY2Nlc3NJZGVudGl0eSA6IGNsb3VkRnJvbnRBY2Nlc3NJZGVudGl0eVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBiZWhhdmlvcnMgOiBbIHtpc0RlZmF1bHRCZWhhdmlvcjogdHJ1ZX1dXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgICAgICAgICAgXG4gICAgICAgIG5ldyBCdWNrZXRQb2xpY3kodGhpcywgcHJvcHMuZ2V0QXBwbGljYXRpb25OYW1lKCkrJ0FwcEJ1Y2tldFBvbGljeScsIHtcbiAgICAgICAgICAgIGJ1Y2tldCA6IGFwcEJ1Y2tldCxcbiAgICAgICAgfSkuZG9jdW1lbnQuYWRkU3RhdGVtZW50cyhuZXcgSUFNLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICBhY3Rpb25zIDogWyBcInMzOkdldE9iamVjdFwiIF0sXG4gICAgICAgICAgICBlZmZlY3QgOiAgSUFNLkVmZmVjdC5BTExPVyxcbiAgICAgICAgICAgIHJlc291cmNlczogW1xuICAgICAgICAgICAgICAgIGFwcEJ1Y2tldC5hcm5Gb3JPYmplY3RzKFwiKlwiKVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHByaW5jaXBhbHMgOiBbIG5ldyBJQU0uQXJuUHJpbmNpcGFsKFwiYXJuOmF3czppYW06OmNsb3VkZnJvbnQ6dXNlci9DbG91ZEZyb250IE9yaWdpbiBBY2Nlc3MgSWRlbnRpdHkgXCIrY2xvdWRGcm9udEFjY2Vzc0lkZW50aXR5Lm9yaWdpbkFjY2Vzc0lkZW50aXR5TmFtZSkgXVxuICAgICAgICB9KVxuICAgICAgICApO1xuXG4gICAgICAgIHRoaXMuYWRkUmVzb3VyY2UoXCJjZG5kb21haW5cIixkaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uRG9tYWluTmFtZSk7XG4gICAgfVxufSJdfQ==
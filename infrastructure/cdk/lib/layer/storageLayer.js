"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageLayer = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const resourceawarestack_1 = require("./../resourceawarestack");
const aws_s3_1 = require("aws-cdk-lib/aws-s3");
/**
 * StorageLayer is a construct that describes the required resources
 * to store the static data. That includes both S3 and SystemsManager.
 */
class StorageLayer extends resourceawarestack_1.ResourceAwareConstruct {
    constructor(parent, name, props) {
        super(parent, name, props);
        this.createBuckets();
    }
    /**
     * This function receives the desired bucket configuration
     * and then creates (or imports) the bucket
     */
    createBucket(props) {
        let bucket;
        if (props.alreadyExists) {
            bucket = aws_s3_1.Bucket.fromBucketArn(this, props.bucketName, 'arn:aws:s3:::' + props.bucketName);
        }
        else {
            var bucketProperties;
            if (props.isWeb) {
                if (props.retain)
                    bucketProperties = {
                        bucketName: props.bucketName,
                        cors: [
                            {
                                allowedHeaders: ["*"],
                                allowedMethods: [
                                    aws_s3_1.HttpMethods.GET,
                                    aws_s3_1.HttpMethods.PUT,
                                    aws_s3_1.HttpMethods.DELETE,
                                    aws_s3_1.HttpMethods.POST
                                ],
                                allowedOrigins: ["*"]
                            }
                        ],
                        websiteIndexDocument: 'index.html',
                        websiteErrorDocument: 'error.html',
                        removalPolicy: aws_cdk_lib_1.RemovalPolicy.RETAIN
                    };
                else
                    bucketProperties = {
                        bucketName: props.bucketName,
                        cors: [
                            {
                                allowedHeaders: ["*"],
                                allowedMethods: [
                                    aws_s3_1.HttpMethods.GET,
                                    aws_s3_1.HttpMethods.PUT,
                                    aws_s3_1.HttpMethods.DELETE,
                                    aws_s3_1.HttpMethods.POST
                                ],
                                allowedOrigins: ["*"]
                            }
                        ],
                        websiteIndexDocument: 'index.html',
                        websiteErrorDocument: 'error.html',
                        removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY
                    };
                bucket = new aws_s3_1.Bucket(this, props.bucketName, bucketProperties);
            }
            else {
                if (props.retain)
                    bucketProperties = {
                        bucketName: props.bucketName,
                        removalPolicy: aws_cdk_lib_1.RemovalPolicy.RETAIN
                    };
                else
                    bucketProperties = {
                        bucketName: props.bucketName,
                        removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY
                    };
                bucket = new aws_s3_1.Bucket(this, props.bucketName, bucketProperties);
            }
        }
        return bucket;
    }
    createBuckets() {
        let appBucketName = this.properties.getApplicationName().toLowerCase() + '.app';
        let rawDataBucketName = this.properties.getApplicationName().toLowerCase() + '.raw';
        let appBucket = this.createBucket({
            bucketName: appBucketName,
            isWeb: true,
            alreadyExists: this.properties.getParameter('existingbuckets').includes(appBucketName),
            retain: true
        });
        this.addResource('appBucket', appBucket);
        let rawDataBucket = this.createBucket({
            bucketName: rawDataBucketName,
            alreadyExists: this.properties.getParameter('existingbuckets').includes(rawDataBucketName),
            retain: true
        });
        this.addResource('rawDataBucket', rawDataBucket);
    }
    getRawDataBucketArn() {
        let rawDataBucketName = this.properties.getApplicationName().toLowerCase() + '.raw';
        return 'arn:aws:s3:::' + rawDataBucketName;
    }
}
exports.StorageLayer = StorageLayer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZUxheWVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic3RvcmFnZUxheWVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUdBLDZDQUE0QztBQUM1QyxnRUFBc0Y7QUFDdEYsK0NBQStFO0FBVS9FOzs7R0FHRztBQUNILE1BQWEsWUFBYSxTQUFRLDJDQUFzQjtJQUVwRCxZQUFZLE1BQWlCLEVBQUUsSUFBWSxFQUFFLEtBQTJCO1FBQ3BFLEtBQUssQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzNCLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztJQUN6QixDQUFDO0lBRUQ7OztPQUdHO0lBQ0ssWUFBWSxDQUFDLEtBQTJCO1FBQzVDLElBQUksTUFBZ0IsQ0FBQztRQUNyQixJQUFJLEtBQUssQ0FBQyxhQUFhLEVBQUU7WUFDckIsTUFBTSxHQUFHLGVBQU0sQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxVQUFVLEVBQUMsZUFBZSxHQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztTQUMxRjthQUFNO1lBQ0gsSUFBSSxnQkFBOEIsQ0FBQztZQUNuQyxJQUFJLEtBQUssQ0FBQyxLQUFLLEVBQUU7Z0JBQ2IsSUFBSSxLQUFLLENBQUMsTUFBTTtvQkFDYixnQkFBZ0IsR0FBSTt3QkFDZixVQUFVLEVBQUcsS0FBSyxDQUFDLFVBQVU7d0JBQzdCLElBQUksRUFBRzs0QkFDSjtnQ0FDSSxjQUFjLEVBQUcsQ0FBQyxHQUFHLENBQUM7Z0NBQ3JCLGNBQWMsRUFBRztvQ0FDZCxvQkFBVyxDQUFDLEdBQUc7b0NBQ2Ysb0JBQVcsQ0FBQyxHQUFHO29DQUNmLG9CQUFXLENBQUMsTUFBTTtvQ0FDbEIsb0JBQVcsQ0FBQyxJQUFJO2lDQUNuQjtnQ0FDQSxjQUFjLEVBQUcsQ0FBQyxHQUFHLENBQUM7NkJBQzFCO3lCQUNKO3dCQUNBLG9CQUFvQixFQUFHLFlBQVk7d0JBQ25DLG9CQUFvQixFQUFHLFlBQVk7d0JBQ25DLGFBQWEsRUFBRywyQkFBYSxDQUFDLE1BQU07cUJBQ3ZDLENBQUE7O29CQUVELGdCQUFnQixHQUFJO3dCQUNoQixVQUFVLEVBQUcsS0FBSyxDQUFDLFVBQVU7d0JBQzVCLElBQUksRUFBRzs0QkFDSjtnQ0FDSSxjQUFjLEVBQUcsQ0FBQyxHQUFHLENBQUM7Z0NBQ3JCLGNBQWMsRUFBRztvQ0FDZCxvQkFBVyxDQUFDLEdBQUc7b0NBQ2Ysb0JBQVcsQ0FBQyxHQUFHO29DQUNmLG9CQUFXLENBQUMsTUFBTTtvQ0FDbEIsb0JBQVcsQ0FBQyxJQUFJO2lDQUNuQjtnQ0FDQSxjQUFjLEVBQUcsQ0FBQyxHQUFHLENBQUM7NkJBQzFCO3lCQUNKO3dCQUNBLG9CQUFvQixFQUFHLFlBQVk7d0JBQ25DLG9CQUFvQixFQUFHLFlBQVk7d0JBQ25DLGFBQWEsRUFBRywyQkFBYSxDQUFDLE9BQU87cUJBQ3pDLENBQUM7Z0JBQ04sTUFBTSxHQUFHLElBQUksZUFBTSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsVUFBVSxFQUFFLGdCQUFnQixDQUFFLENBQUM7YUFDbEU7aUJBQU07Z0JBQ0gsSUFBSSxLQUFLLENBQUMsTUFBTTtvQkFDWixnQkFBZ0IsR0FBSTt3QkFDZixVQUFVLEVBQUcsS0FBSyxDQUFDLFVBQVU7d0JBQzdCLGFBQWEsRUFBRywyQkFBYSxDQUFDLE1BQU07cUJBQ3hDLENBQUM7O29CQUVGLGdCQUFnQixHQUFJO3dCQUNoQixVQUFVLEVBQUcsS0FBSyxDQUFDLFVBQVU7d0JBQzVCLGFBQWEsRUFBRywyQkFBYSxDQUFDLE9BQU87cUJBQ3pDLENBQUM7Z0JBQ04sTUFBTSxHQUFHLElBQUksZUFBTSxDQUFDLElBQUksRUFBQyxLQUFLLENBQUMsVUFBVSxFQUFDLGdCQUFnQixDQUFDLENBQUM7YUFDL0Q7U0FDSjtRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2xCLENBQUM7SUFFRCxhQUFhO1FBQ1QsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLFdBQVcsRUFBRSxHQUFHLE1BQU0sQ0FBQztRQUNoRixJQUFJLGlCQUFpQixHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxXQUFXLEVBQUUsR0FBRyxNQUFNLENBQUM7UUFFcEYsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBRTtZQUM5QixVQUFVLEVBQUcsYUFBYTtZQUMxQixLQUFLLEVBQUcsSUFBSTtZQUNaLGFBQWEsRUFBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUM7WUFDdkYsTUFBTSxFQUFHLElBQUk7U0FDakIsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUMsU0FBUyxDQUFDLENBQUM7UUFHeEMsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQztZQUNqQyxVQUFVLEVBQUcsaUJBQWlCO1lBQzlCLGFBQWEsRUFBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQztZQUMzRixNQUFNLEVBQUcsSUFBSTtTQUNqQixDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsV0FBVyxDQUFDLGVBQWUsRUFBQyxhQUFhLENBQUMsQ0FBQztJQUNwRCxDQUFDO0lBRUQsbUJBQW1CO1FBQ2YsSUFBSSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLGtCQUFrQixFQUFFLENBQUMsV0FBVyxFQUFFLEdBQUcsTUFBTSxDQUFDO1FBQ3BGLE9BQU8sZUFBZSxHQUFDLGlCQUFpQixDQUFDO0lBQzdDLENBQUM7Q0FDSjtBQW5HRCxvQ0FtR0MiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgQW1hem9uLmNvbSwgSW5jLiBvciBpdHMgYWZmaWxpYXRlcy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbi8vIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBNSVQtMFxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgeyBSZW1vdmFsUG9saWN5IH0gZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgUmVzb3VyY2VBd2FyZUNvbnN0cnVjdCwgSVBhcmFtZXRlckF3YXJlUHJvcHMgfSBmcm9tICcuLy4uL3Jlc291cmNlYXdhcmVzdGFjaydcbmltcG9ydCB7IElCdWNrZXQsIEJ1Y2tldCwgQnVja2V0UHJvcHMsIEh0dHBNZXRob2RzIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcblxuXG5pbnRlcmZhY2UgSUJ1Y2tldENyZWF0aW9uUHJvcHMge1xuICAgIGJ1Y2tldE5hbWUgOiBzdHJpbmcsXG4gICAgaXNXZWI/IDogYm9vbGVhbixcbiAgICBhbHJlYWR5RXhpc3RzOiBib29sZWFuLFxuICAgIHJldGFpbiA6IGJvb2xlYW5cbn1cblxuLyoqXG4gKiBTdG9yYWdlTGF5ZXIgaXMgYSBjb25zdHJ1Y3QgdGhhdCBkZXNjcmliZXMgdGhlIHJlcXVpcmVkIHJlc291cmNlc1xuICogdG8gc3RvcmUgdGhlIHN0YXRpYyBkYXRhLiBUaGF0IGluY2x1ZGVzIGJvdGggUzMgYW5kIFN5c3RlbXNNYW5hZ2VyLlxuICovXG5leHBvcnQgY2xhc3MgU3RvcmFnZUxheWVyIGV4dGVuZHMgUmVzb3VyY2VBd2FyZUNvbnN0cnVjdCB7XG5cbiAgICBjb25zdHJ1Y3RvcihwYXJlbnQ6IENvbnN0cnVjdCwgbmFtZTogc3RyaW5nLCBwcm9wczogSVBhcmFtZXRlckF3YXJlUHJvcHMpIHtcbiAgICAgICAgc3VwZXIocGFyZW50LCBuYW1lLCBwcm9wcyk7XG4gICAgICAgIHRoaXMuY3JlYXRlQnVja2V0cygpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRoaXMgZnVuY3Rpb24gcmVjZWl2ZXMgdGhlIGRlc2lyZWQgYnVja2V0IGNvbmZpZ3VyYXRpb25cbiAgICAgKiBhbmQgdGhlbiBjcmVhdGVzIChvciBpbXBvcnRzKSB0aGUgYnVja2V0XG4gICAgICovXG4gICAgcHJpdmF0ZSBjcmVhdGVCdWNrZXQocHJvcHM6IElCdWNrZXRDcmVhdGlvblByb3BzKSA6IElCdWNrZXQge1xuICAgICAgICBsZXQgYnVja2V0IDogSUJ1Y2tldDtcbiAgICAgICAgaWYgKHByb3BzLmFscmVhZHlFeGlzdHMpIHtcbiAgICAgICAgICAgIGJ1Y2tldCA9IEJ1Y2tldC5mcm9tQnVja2V0QXJuKHRoaXMsIHByb3BzLmJ1Y2tldE5hbWUsJ2Fybjphd3M6czM6OjonK3Byb3BzLmJ1Y2tldE5hbWUpOyAgICAgIFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIGJ1Y2tldFByb3BlcnRpZXMgOiBCdWNrZXRQcm9wcztcbiAgICAgICAgICAgIGlmIChwcm9wcy5pc1dlYikge1xuICAgICAgICAgICAgICAgIGlmIChwcm9wcy5yZXRhaW4pXG4gICAgICAgICAgICAgICAgICAgYnVja2V0UHJvcGVydGllcyAgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBidWNrZXROYW1lIDogcHJvcHMuYnVja2V0TmFtZVxuICAgICAgICAgICAgICAgICAgICAgICAsY29ycyA6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbGxvd2VkSGVhZGVycyA6IFtcIipcIl1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAsYWxsb3dlZE1ldGhvZHMgOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEh0dHBNZXRob2RzLkdFVCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSHR0cE1ldGhvZHMuUFVULFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBIdHRwTWV0aG9kcy5ERUxFVEUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEh0dHBNZXRob2RzLlBPU1RcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICxhbGxvd2VkT3JpZ2lucyA6IFtcIipcIl1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAsd2Vic2l0ZUluZGV4RG9jdW1lbnQgOiAnaW5kZXguaHRtbCdcbiAgICAgICAgICAgICAgICAgICAgICAgLHdlYnNpdGVFcnJvckRvY3VtZW50IDogJ2Vycm9yLmh0bWwnXG4gICAgICAgICAgICAgICAgICAgICAgICxyZW1vdmFsUG9saWN5IDogUmVtb3ZhbFBvbGljeS5SRVRBSU5cbiAgICAgICAgICAgICAgICAgICAgfSAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgZWxzZSBcbiAgICAgICAgICAgICAgICAgICAgYnVja2V0UHJvcGVydGllcyAgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBidWNrZXROYW1lIDogcHJvcHMuYnVja2V0TmFtZVxuICAgICAgICAgICAgICAgICAgICAgICAgLGNvcnMgOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbGxvd2VkSGVhZGVycyA6IFtcIipcIl1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLGFsbG93ZWRNZXRob2RzIDogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSHR0cE1ldGhvZHMuR0VULFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSHR0cE1ldGhvZHMuUFVULFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSHR0cE1ldGhvZHMuREVMRVRFLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSHR0cE1ldGhvZHMuUE9TVFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAsYWxsb3dlZE9yaWdpbnMgOiBbXCIqXCJdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgLHdlYnNpdGVJbmRleERvY3VtZW50IDogJ2luZGV4Lmh0bWwnXG4gICAgICAgICAgICAgICAgICAgICAgICAsd2Vic2l0ZUVycm9yRG9jdW1lbnQgOiAnZXJyb3IuaHRtbCdcbiAgICAgICAgICAgICAgICAgICAgICAgICxyZW1vdmFsUG9saWN5IDogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgYnVja2V0ID0gbmV3IEJ1Y2tldCh0aGlzLCBwcm9wcy5idWNrZXROYW1lLCBidWNrZXRQcm9wZXJ0aWVzICk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChwcm9wcy5yZXRhaW4pIFxuICAgICAgICAgICAgICAgICAgICBidWNrZXRQcm9wZXJ0aWVzID0gIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBidWNrZXROYW1lIDogcHJvcHMuYnVja2V0TmFtZVxuICAgICAgICAgICAgICAgICAgICAgICAgLHJlbW92YWxQb2xpY3kgOiBSZW1vdmFsUG9saWN5LlJFVEFJTlxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGVsc2UgXG4gICAgICAgICAgICAgICAgICAgIGJ1Y2tldFByb3BlcnRpZXMgPSAge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnVja2V0TmFtZSA6IHByb3BzLmJ1Y2tldE5hbWVcbiAgICAgICAgICAgICAgICAgICAgICAgICxyZW1vdmFsUG9saWN5IDogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZXG4gICAgICAgICAgICAgICAgICAgIH07ICAgICBcbiAgICAgICAgICAgICAgICBidWNrZXQgPSBuZXcgQnVja2V0KHRoaXMscHJvcHMuYnVja2V0TmFtZSxidWNrZXRQcm9wZXJ0aWVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYnVja2V0O1xuICAgIH1cblxuICAgIGNyZWF0ZUJ1Y2tldHMoKSB7XG4gICAgICAgIGxldCBhcHBCdWNrZXROYW1lID0gdGhpcy5wcm9wZXJ0aWVzLmdldEFwcGxpY2F0aW9uTmFtZSgpLnRvTG93ZXJDYXNlKCkgKyAnLmFwcCc7XG4gICAgICAgIGxldCByYXdEYXRhQnVja2V0TmFtZSA9IHRoaXMucHJvcGVydGllcy5nZXRBcHBsaWNhdGlvbk5hbWUoKS50b0xvd2VyQ2FzZSgpICsgJy5yYXcnO1xuXG4gICAgICAgIGxldCBhcHBCdWNrZXQgPSB0aGlzLmNyZWF0ZUJ1Y2tldCgge1xuICAgICAgICAgICAgIGJ1Y2tldE5hbWUgOiBhcHBCdWNrZXROYW1lXG4gICAgICAgICAgICAsaXNXZWIgOiB0cnVlXG4gICAgICAgICAgICAsYWxyZWFkeUV4aXN0cyA6IHRoaXMucHJvcGVydGllcy5nZXRQYXJhbWV0ZXIoJ2V4aXN0aW5nYnVja2V0cycpLmluY2x1ZGVzKGFwcEJ1Y2tldE5hbWUpXG4gICAgICAgICAgICAscmV0YWluIDogdHJ1ZVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5hZGRSZXNvdXJjZSgnYXBwQnVja2V0JyxhcHBCdWNrZXQpO1xuXG5cbiAgICAgICAgbGV0IHJhd0RhdGFCdWNrZXQgPSB0aGlzLmNyZWF0ZUJ1Y2tldCh7XG4gICAgICAgICAgICAgYnVja2V0TmFtZSA6IHJhd0RhdGFCdWNrZXROYW1lXG4gICAgICAgICAgICAsYWxyZWFkeUV4aXN0cyA6IHRoaXMucHJvcGVydGllcy5nZXRQYXJhbWV0ZXIoJ2V4aXN0aW5nYnVja2V0cycpLmluY2x1ZGVzKHJhd0RhdGFCdWNrZXROYW1lKVxuICAgICAgICAgICAgLHJldGFpbiA6IHRydWVcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuYWRkUmVzb3VyY2UoJ3Jhd0RhdGFCdWNrZXQnLHJhd0RhdGFCdWNrZXQpO1xuICAgIH1cblxuICAgIGdldFJhd0RhdGFCdWNrZXRBcm4oKSA6IHN0cmluZyB7XG4gICAgICAgIGxldCByYXdEYXRhQnVja2V0TmFtZSA9IHRoaXMucHJvcGVydGllcy5nZXRBcHBsaWNhdGlvbk5hbWUoKS50b0xvd2VyQ2FzZSgpICsgJy5yYXcnO1xuICAgICAgICByZXR1cm4gJ2Fybjphd3M6czM6OjonK3Jhd0RhdGFCdWNrZXROYW1lO1xuICAgIH1cbn0iXX0=
import { Construct } from 'constructs';
import { ResourceAwareConstruct, IParameterAwareProps } from './../resourceawarestack';
/**
 * StorageLayer is a construct that describes the required resources
 * to store the static data. That includes both S3 and SystemsManager.
 */
export declare class StorageLayer extends ResourceAwareConstruct {
    constructor(parent: Construct, name: string, props: IParameterAwareProps);
    /**
     * This function receives the desired bucket configuration
     * and then creates (or imports) the bucket
     */
    private createBucket;
    createBuckets(): void;
    getRawDataBucketArn(): string;
}

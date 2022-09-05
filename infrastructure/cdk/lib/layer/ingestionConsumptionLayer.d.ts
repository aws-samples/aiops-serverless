import { Construct } from 'constructs';
import { ResourceAwareConstruct, IParameterAwareProps } from './../resourceawarestack';
import KDS = require('aws-cdk-lib/aws-kinesis');
import KDF = require('aws-cdk-lib/aws-kinesisfirehose');
export declare class IngestionConsumptionLayer extends ResourceAwareConstruct {
    kinesisStreams: KDS.IStream;
    kinesisFirehose: KDF.CfnDeliveryStream;
    private rawbucketarn;
    private userpool;
    private api;
    private KINESIS_INTEGRATION;
    private FIREHOSE;
    constructor(parent: Construct, name: string, props: IParameterAwareProps);
    createKinesis(props: IParameterAwareProps): void;
    createAPIGateway(props: IParameterAwareProps): void;
    updateUsersRoles(props: IParameterAwareProps): void;
}

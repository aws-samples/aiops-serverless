import { Construct } from 'constructs';
import { ResourceAwareConstruct, IParameterAwareProps } from './../resourceawarestack';
export declare class ContentDeliveryLayer extends ResourceAwareConstruct {
    constructor(parent: Construct, name: string, props: IParameterAwareProps);
    private createDistribution;
}

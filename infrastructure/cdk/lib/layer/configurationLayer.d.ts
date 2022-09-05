import { ResourceAwareConstruct, IParameterAwareProps } from './../resourceawarestack';
import { Construct } from 'constructs';
/**
 * Configuration Layer is a construct designed to acquire and store configuration
 * data to be used by the system
 */
export declare class ConfigurationLayer extends ResourceAwareConstruct {
    constructor(parent: Construct, name: string, props: IParameterAwareProps);
    private createParameter;
}

import { App } from 'aws-cdk-lib';
import { IParameterAwareProps, ResourceAwareStack } from '../resourceawarestack';
export declare class MainLayer extends ResourceAwareStack {
    constructor(scope: App, id: string, props?: IParameterAwareProps);
    buildResources(): void;
}

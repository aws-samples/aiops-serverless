import { Construct } from 'constructs';
import { ResourceAwareConstruct, IParameterAwareProps } from './../resourceawarestack';
import Lambda = require('aws-cdk-lib/aws-lambda');
export declare class ProcessingLayer extends ResourceAwareConstruct {
    private allocateFunction;
    getAllocateFunctionArn(): string;
    getAllocateFunctionRef(): Lambda.Function;
    private deallocateFunction;
    getDeallocateFunctionArn(): string;
    private scoreboardFunction;
    getScoreboardFunctionArn(): string;
    getScoreboardFunctionRef(): Lambda.Function;
    constructor(parent: Construct, name: string, props: IParameterAwareProps);
    private getAllocateGamerFunction;
    private getDeallocateGamerFunction;
    private getScoreboardFunction;
}

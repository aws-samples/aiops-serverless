import { Construct } from 'constructs';
import { ResourceAwareConstruct, IParameterAwareProps } from './../resourceawarestack';
import Lambda = require('aws-cdk-lib/aws-lambda');
export declare class WebSocketLayer extends ResourceAwareConstruct {
    private webSocketConnectFunction;
    getWebSocketFunctionArn(): string;
    getWebSocketFunctionRef(): Lambda.Function;
    private webSocketSynchronizeFunction;
    getWebSocketSynchronizeFunctionArn(): string;
    getWebSocketSynchronizeFunctionRef(): Lambda.Function;
    private webSocketDisconnectFunction;
    getWebSocketDisconnectFunctionArn(): string;
    getWebSocketDisconnectFunctionRef(): Lambda.Function;
    constructor(parent: Construct, name: string, props: IParameterAwareProps);
    private getWebSocketConnectFunction;
    private getWebSocketSynchronizeFunction;
    private getWebSocketDisconnectFunction;
}

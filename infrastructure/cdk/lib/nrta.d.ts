import { ParameterAwareProps, IParameterAwareProps } from '../lib/resourceawarestack';
export declare class NRTAProps extends ParameterAwareProps {
    constructor(props?: IParameterAwareProps);
    getBucketNames(): string[];
}

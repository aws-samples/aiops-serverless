"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigurationLayer = void 0;
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const resourceawarestack_1 = require("./../resourceawarestack");
const ssm = require("aws-cdk-lib/aws-ssm");
/**
 * Configuration Layer is a construct designed to acquire and store configuration
 * data to be used by the system
 */
class ConfigurationLayer extends resourceawarestack_1.ResourceAwareConstruct {
    constructor(parent, name, props) {
        super(parent, name, props);
        if (props) {
            let parametersToBeCreated = props.getParameter('ssmParameters');
            if (parametersToBeCreated) {
                parametersToBeCreated.forEach((v, k) => {
                    let parameter = this.createParameter(props.getApplicationName(), k, v);
                    this.addResource('parameter.' + k, parameter);
                });
            }
        }
    }
    createParameter(appName, keyName, value) {
        let baseName = '/' + appName.toLowerCase();
        let parameter = new ssm.StringParameter(this, 'SSMParameter' + appName + keyName, {
            parameterName: baseName + '/' + keyName.toLowerCase(),
            stringValue: value
        });
        return parameter;
    }
}
exports.ConfigurationLayer = ConfigurationLayer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbkxheWVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY29uZmlndXJhdGlvbkxheWVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHFFQUFxRTtBQUNyRSxpQ0FBaUM7QUFDakMsZ0VBQXNGO0FBRXRGLDJDQUEyQztBQUczQzs7O0dBR0c7QUFDSCxNQUFhLGtCQUFtQixTQUFRLDJDQUFzQjtJQUUxRCxZQUFZLE1BQWlCLEVBQUUsSUFBWSxFQUFFLEtBQTJCO1FBQ3BFLEtBQUssQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzNCLElBQUksS0FBSyxFQUFFO1lBQ1AsSUFBSSxxQkFBcUIsR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQ2hFLElBQUkscUJBQXFCLEVBQUU7Z0JBQ3ZCLHFCQUFxQixDQUFDLE9BQU8sQ0FBRSxDQUFDLENBQU8sRUFBRSxDQUFVLEVBQUUsRUFBRTtvQkFDbkQsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLEVBQUUsRUFBQyxDQUFDLEVBQVUsQ0FBQyxDQUFDLENBQUM7b0JBQzlFLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxHQUFDLENBQUMsRUFBQyxTQUFTLENBQUMsQ0FBQztnQkFDL0MsQ0FBQyxDQUFDLENBQUM7YUFDTjtTQUNKO0lBQ0wsQ0FBQztJQUVPLGVBQWUsQ0FBQyxPQUFnQixFQUFFLE9BQWUsRUFBRSxLQUFjO1FBQ3JFLElBQUksUUFBUSxHQUFZLEdBQUcsR0FBRSxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDbkQsSUFBSSxTQUFTLEdBQUcsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxjQUFjLEdBQUMsT0FBTyxHQUFDLE9BQU8sRUFBRTtZQUMxRSxhQUFhLEVBQUcsUUFBUSxHQUFHLEdBQUcsR0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFO1lBQ3BELFdBQVcsRUFBRSxLQUFLO1NBQ3JCLENBQUMsQ0FBQztRQUNILE9BQU8sU0FBUyxDQUFDO0lBQ3JCLENBQUM7Q0FDSjtBQXZCRCxnREF1QkMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgQW1hem9uLmNvbSwgSW5jLiBvciBpdHMgYWZmaWxpYXRlcy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbi8vIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBNSVQtMFxuaW1wb3J0IHsgUmVzb3VyY2VBd2FyZUNvbnN0cnVjdCwgSVBhcmFtZXRlckF3YXJlUHJvcHMgfSBmcm9tICcuLy4uL3Jlc291cmNlYXdhcmVzdGFjaydcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0ICogYXMgc3NtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zc20nOyAgXG5cblxuLyoqXG4gKiBDb25maWd1cmF0aW9uIExheWVyIGlzIGEgY29uc3RydWN0IGRlc2lnbmVkIHRvIGFjcXVpcmUgYW5kIHN0b3JlIGNvbmZpZ3VyYXRpb25cbiAqIGRhdGEgdG8gYmUgdXNlZCBieSB0aGUgc3lzdGVtXG4gKi9cbmV4cG9ydCBjbGFzcyBDb25maWd1cmF0aW9uTGF5ZXIgZXh0ZW5kcyBSZXNvdXJjZUF3YXJlQ29uc3RydWN0IHtcblxuICAgIGNvbnN0cnVjdG9yKHBhcmVudDogQ29uc3RydWN0LCBuYW1lOiBzdHJpbmcsIHByb3BzOiBJUGFyYW1ldGVyQXdhcmVQcm9wcykge1xuICAgICAgICBzdXBlcihwYXJlbnQsIG5hbWUsIHByb3BzKTtcbiAgICAgICAgaWYgKHByb3BzKSB7XG4gICAgICAgICAgICBsZXQgcGFyYW1ldGVyc1RvQmVDcmVhdGVkID0gcHJvcHMuZ2V0UGFyYW1ldGVyKCdzc21QYXJhbWV0ZXJzJyk7XG4gICAgICAgICAgICBpZiAocGFyYW1ldGVyc1RvQmVDcmVhdGVkKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1ldGVyc1RvQmVDcmVhdGVkLmZvckVhY2goICh2IDogYW55LCBrIDogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBwYXJhbWV0ZXIgPSB0aGlzLmNyZWF0ZVBhcmFtZXRlcihwcm9wcy5nZXRBcHBsaWNhdGlvbk5hbWUoKSxrLDxzdHJpbmc+IHYpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZFJlc291cmNlKCdwYXJhbWV0ZXIuJytrLHBhcmFtZXRlcik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9ICAgICAgIFxuXG4gICAgcHJpdmF0ZSBjcmVhdGVQYXJhbWV0ZXIoYXBwTmFtZSA6IHN0cmluZywga2V5TmFtZTogc3RyaW5nLCB2YWx1ZSA6IHN0cmluZykgeyAgICBcbiAgICAgICAgbGV0IGJhc2VOYW1lIDogc3RyaW5nID0gJy8nKyBhcHBOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIGxldCBwYXJhbWV0ZXIgPSBuZXcgc3NtLlN0cmluZ1BhcmFtZXRlcih0aGlzLCAnU1NNUGFyYW1ldGVyJythcHBOYW1lK2tleU5hbWUsIHtcbiAgICAgICAgICAgIHBhcmFtZXRlck5hbWUgOiBiYXNlTmFtZSArICcvJytrZXlOYW1lLnRvTG93ZXJDYXNlKCksXG4gICAgICAgICAgICBzdHJpbmdWYWx1ZTogdmFsdWVcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBwYXJhbWV0ZXI7XG4gICAgfVxufVxuIl19
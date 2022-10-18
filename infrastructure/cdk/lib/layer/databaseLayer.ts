import {
  IParameterAwareProps,
  ResourceAwareConstruct,
} from "./../resourceawarestack";

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { Construct } from "constructs";
import { RemovalPolicy } from "aws-cdk-lib";

import DynamoDB = require("aws-cdk-lib/aws-dynamodb");

export class DatabaseLayer extends ResourceAwareConstruct {
  tables: Map<string, DynamoDB.Table> = new Map();

  constructor(parent: Construct, name: string, props: IParameterAwareProps) {
    super(parent, name, props);

    let sessionTable = new DynamoDB.Table(
      this,
      props.getApplicationName() + "Session",
      {
        tableName: props.getApplicationName() + "Session",
        partitionKey: {
          name: "SessionId",
          type: DynamoDB.AttributeType.STRING,
        },
        billingMode: DynamoDB.BillingMode.PROVISIONED,
        removalPolicy: RemovalPolicy.DESTROY,
      }
    );
    sessionTable.autoScaleWriteCapacity({
      minCapacity: 1,
      maxCapacity: 1,
    });
    this.addResource("table.session", sessionTable);

    let sessionControlTable = new DynamoDB.Table(
      this,
      props.getApplicationName() + "SessionControl",
      {
        tableName: props.getApplicationName() + "SessionControl",
        partitionKey: {
          name: "SessionId",
          type: DynamoDB.AttributeType.STRING,
        },
        billingMode: DynamoDB.BillingMode.PAY_PER_REQUEST,
        removalPolicy: RemovalPolicy.DESTROY,
      }
    );
    this.addResource("table.sessioncontrol", sessionControlTable);

    let sessionTopXTable = new DynamoDB.Table(
      this,
      props.getApplicationName() + "SessionTopX",
      {
        tableName: props.getApplicationName() + "SessionTopX",
        partitionKey: {
          name: "SessionId",
          type: DynamoDB.AttributeType.STRING,
        },
        billingMode: DynamoDB.BillingMode.PAY_PER_REQUEST,
        removalPolicy: RemovalPolicy.DESTROY,
      }
    );
    this.addResource("table.sessiontopx", sessionTopXTable);
  }
}

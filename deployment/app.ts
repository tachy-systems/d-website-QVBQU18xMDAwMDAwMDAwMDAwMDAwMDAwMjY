#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import inputs from "./inputs.json";
import {GlobalCertificateStack} from "./GlobalCertificateStack";
import {WebsiteHostingStack} from "./WebsiteHostingStack";

export interface UserProps extends cdk.StackProps {
     domainName: string;
     dedicatedHostedZone: boolean;
     appName: string;
     defaultDomain: string;
     isHostedZoneAvailable?: boolean;
     stage: string;
     appId: string;
}

const app = new cdk.App();
const {domainName, stage} = inputs;

const certStack = new GlobalCertificateStack(app, `${stage}-${domainName.replace(/\./g, "-")}-global-certificate-stack`, {
     env: {
          account: process.env.CDK_DEFAULT_ACCOUNT,
          region: "us-east-1"
     },
     crossRegionReferences: true,
     stackName: `${stage}-${domainName.replace(/\./g, "-")}-global-certificate-stack`,
     ...inputs
});

new WebsiteHostingStack(app, `${stage}-${domainName.replace(/\./g, "-")}-hosting-stack`, certStack, {
     env: {
          account: process.env.CDK_DEFAULT_ACCOUNT,
          region: process.env.CDK_DEFAULT_REGION
     },
     crossRegionReferences: true,
     stackName: `${stage}-${domainName.replace(/\./g, "-")}-hosting-stack`,
     ...inputs
});

app.synth();

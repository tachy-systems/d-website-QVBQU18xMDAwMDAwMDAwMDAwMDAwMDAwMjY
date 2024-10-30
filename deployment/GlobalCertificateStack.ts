import * as route53 from "aws-cdk-lib/aws-route53";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import {Certificate, CertificateValidation} from "aws-cdk-lib/aws-certificatemanager";
import {Stack, App, Duration} from "aws-cdk-lib";
import {UserProps} from "./app";

const DEV = "dev";
const EXP = "exp";
const HOSTED_ZONE_AVAILABLE_DEFAULT_VALUE = false;

export class GlobalCertificateStack extends Stack {
     public readonly certificate: Certificate;
     constructor(scope: App, name: string, props: UserProps) {
          super(scope, name, props);
          //apex domain hostedzone should not be created

          let {
               domainName,
               stage,
               dedicatedHostedZone,
               appName,
               defaultDomain,
               isHostedZoneAvailable = HOSTED_ZONE_AVAILABLE_DEFAULT_VALUE
          } = props;

          domainName = `${stage}-${domainName}`;
          const defaultDeploymentDomain = `${appName}.${defaultDomain}`;

          if (stage === DEV || stage === EXP) {
               domainName = defaultDeploymentDomain;
          }
          let hostedZoneName = domainName;
          let aRecordName: string | undefined;

          if (!dedicatedHostedZone) {
               hostedZoneName = extractApexDomain(domainName);
               aRecordName = extractSubdomain(domainName);
          }

          let hostedZone: route53.HostedZone | route53.IHostedZone;
          // if (stage === DEV || stage === EXP) {
          //      hostedZone = route53.HostedZone.fromLookup(this, `${stage}-${hostedZoneName}-hostedZone`, {
          //           domainName: hostedZoneName
          //      });
          // } else {
          // if (isHostedZoneAvailable) {
          hostedZone = route53.HostedZone.fromLookup(this, `${stage}-${hostedZoneName}-hostedZone`, {
               domainName: hostedZoneName
          });
          // } else {
          //      hostedZone = new route53.HostedZone(this, `${stage}-${hostedZoneName}-hostedZone`, {
          //           zoneName: `${hostedZoneName}`
          //      });

          //      let values: string[] = hostedZone.hostedZoneNameServers!;
          //      let NsRecord = `${stage}-NsRecord`;
          //      new route53.NsRecord(this, NsRecord, {
          //           zone: hostedZone,
          //           deleteExisting: false,
          //           recordName: aRecordName,
          //           values,
          //           ttl: Duration.minutes(30)
          //      });
          // }
          // }

          let logicalCerticateName = `${domainName}-certificate`;
          this.certificate = new acm.Certificate(this, logicalCerticateName, {
               domainName: domainName,
               certificateName: logicalCerticateName,
               subjectAlternativeNames: [`*.${domainName}`, `www.${domainName}`],
               validation: CertificateValidation.fromDns(hostedZone)
          });
     }
}

function extractApexDomain(url: string): string {
     let domain = url.replace(/(^\w+:|^)\/\/(www\.)?/, "");

     domain = domain.split("/")[0];

     const parts = domain.split(".");

     if (parts.length > 2) {
          return parts.slice(-2).join(".");
     }

     return domain;
}

function extractSubdomain(url: string): string | undefined {
     console.log("url: ", url);
     let domain = url.replace(/(^\w+:|^)\/\/(www\.)?/, "");
     domain = domain.split("/")[0];

     const parts = domain.split(".");

     if (parts.length > 2) {
          console.log(`Subdomain: ${parts.slice(0, -2).join(".")}`);
          return parts.slice(0, -2).join(".");
     }
     return undefined;
}

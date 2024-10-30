import * as route53 from "aws-cdk-lib/aws-route53";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import {RemovalPolicy, Stack, App, Duration} from "aws-cdk-lib";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import {GlobalCertificateStack} from "./GlobalCertificateStack";
import {UserProps} from "./app";

const DEV = "dev";
const EXP = "exp";
const INDEX_FILE = "index.html";
const DUMMY_IP_ADDRESS = "192.0.2.235";
const HOSTED_ZONE_AVAILABLE_DEFAULT_VALUE = false;

export class WebsiteHostingStack extends Stack {
     constructor(scope: App, name: string, certStack: GlobalCertificateStack, props: UserProps) {
          super(scope, name, props);

          let {
               domainName,
               stage,
               appName,
               dedicatedHostedZone,
               defaultDomain,
               isHostedZoneAvailable = HOSTED_ZONE_AVAILABLE_DEFAULT_VALUE,
               appId
          } = props;
          domainName = `${stage}-${domainName}`;

          appName = appName.toLowerCase();
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

          let bucketName = `${domainName}`;
          const websiteBucket = new s3.Bucket(this, `${domainName}-bucket`, {
               bucketName,
               publicReadAccess: true,
               removalPolicy: RemovalPolicy.DESTROY,
               autoDeleteObjects: true,
               websiteIndexDocument: INDEX_FILE,
               blockPublicAccess: {
                    blockPublicPolicy: false,
                    blockPublicAcls: false,
                    ignorePublicAcls: false,
                    restrictPublicBuckets: false
               }
          });

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
               //      console.log("creating Hosted zone");
               //      hostedZone = new route53.HostedZone(this, `${stage}-${hostedZoneName}-hostedZone`, {
               //           zoneName: `${hostedZoneName}`
               //      });

               //      new route53.ARecord(this, `${stage}-${hostedZone}`, {
               //           zone: hostedZone,
               //           target: route53.RecordTarget.fromIpAddresses(DUMMY_IP_ADDRESS),
               //           deleteExisting: false
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

          let logicalDistribution = `${stage}-distribution`;
          const distribution = new cloudfront.Distribution(this, logicalDistribution, {
               certificate: certStack.certificate,
               domainNames: [`${domainName}`, `www.${domainName}`],
               defaultBehavior: {
                    origin: new origins.S3Origin(websiteBucket)
               },
               defaultRootObject: INDEX_FILE
          });

          new route53.ARecord(this, `${stage}-${aRecordName}-${hostedZone}`, {
               zone: hostedZone,
               recordName: aRecordName,
               target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
               deleteExisting: false
          });

          let logicalBucketDeployment = `${stage}.${hostedZoneName}-deploy`;
          new s3deploy.BucketDeployment(this, logicalBucketDeployment, {
               sources: [s3deploy.Source.asset(`../s-website-${appId}`)],
               destinationBucket: websiteBucket,
               distribution,
               distributionPaths: ["/*"]
          });

          this.addDependency(certStack);
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

// //create HostedZone

// // GET HOSTEDzONE IF NOT AVAILABEL CREATE IT
// // hostedZone = await getHostedZone(domainName);

//  function getHostedZone(stack: Stack, stage: string, domainName: string, isToBeCreated = false) {
//      let hostedZone = await getHostedZoneByName(domainName);

//      if (hostedZone) {
//           return route53.HostedZone.fromLookup(stack, `${domainName}-hostedZone-${stage}`, {
//                domainName: domainName
//           });
//      } else {
//           return await createHostedZone(domainName);
//      }
// }

//  function createHostedZone(domainName: string) {
//      let hostedZone = new route53.HostedZone(this, logicalSubZone, {
//           zoneName: `${stageName}.${domainName}`
//      });

//      let values: string[] = subZone.hostedZoneNameServers!;
//      let NsRecord = `${stageName}-NsRecord`;
//      new route53.NsRecord(this, NsRecord, {
//           zone: zone,
//           deleteExisting: false,
//           recordName: `${stageName}.${domainName}`,
//           values,
//           ttl: Duration.minutes(90)
//      });

//      return hostedZone;
// }

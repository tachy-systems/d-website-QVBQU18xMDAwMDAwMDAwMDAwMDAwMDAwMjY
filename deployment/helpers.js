import {Route53Client, ListHostedZonesByNameCommand} from "@aws-sdk/client-route-53";
const client = new Route53Client({region: process.env.AWS_REGION});

export async function getHostedZoneByName(hostedZoneName) {
     try {
          const input = {
               DNSName: hostedZoneName
          };
          const command = new ListHostedZonesByNameCommand(input);
          const response = await client.send(command);
          console.log(response);
          if (response.HostedZones.length > 0 && response.HostedZones[0].Name === `${hostedZoneName}.`) {
               console.log("Exact match found:", response.HostedZones[0]);
               return response.HostedZones[0];
          } else {
               return;
          }
     } catch (error) {
          throw new Error("Error happened while fetching hostedZones.");
     }
}

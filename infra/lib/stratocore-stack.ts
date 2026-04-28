import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2_integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export class StratocoreStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // -------------------------
    // 1. S3 Bucket
    // -------------------------
    const bucket = new s3.Bucket(this, 'FilesBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // -------------------------
    // 2. ECR Repository
    // -------------------------
    const repo = new ecr.Repository(this, 'ApiRepo', {
      repositoryName: 'stratocore-api',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
    });

    // -------------------------
    // 3. VPC
    // -------------------------
    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways: 1,
    });

    // -------------------------
    // 4. ECS Fargate + ALB
    // -------------------------

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'Cluster', { vpc });

    // Fargate Task Definition
    const taskDef = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      cpu: 512,
      memoryLimitMiB: 1024,
    });

    // Container from ECR
    const container = taskDef.addContainer('ApiContainer', {
      image: ecs.ContainerImage.fromEcrRepository(repo, 'latest'),
      memoryLimitMiB: 512,
      environment: {
        BUCKET_NAME: bucket.bucketName,
      },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'stratocore',
        logRetention: logs.RetentionDays.ONE_WEEK,
      }),
    });

    container.addPortMappings({ containerPort: 8000 });

    // Security Groups
    const albSg = new ec2.SecurityGroup(this, 'AlbSg', { vpc });
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));

    const ecsSg = new ec2.SecurityGroup(this, 'EcsSg', { vpc });
    ecsSg.addIngressRule(albSg, ec2.Port.tcp(8000));

    // ALB
    const alb = new elbv2.ApplicationLoadBalancer(this, 'Alb', {
      vpc,
      internetFacing: true,
      securityGroup: albSg,
    });

    // Fargate Service
    const service = new ecs.FargateService(this, 'ApiService', {
      cluster,
      taskDefinition: taskDef,
      desiredCount: 1,
      securityGroups: [ecsSg],
      assignPublicIp: false,
      minHealthyPercent: 100,
    });

    // Listener + Target Group
    const listener = alb.addListener('HttpListener', { port: 80, open: false });

    listener.addTargets('EcsTargets', {
      port: 8000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [service],
      healthCheck: {
        path: '/health',
        interval: cdk.Duration.seconds(30),
      },
    });

    // IAM: grant ECS task role access to S3
    bucket.grantReadWrite(taskDef.taskRole);

    // -------------------------
    // 5. Lambda (container image) + API Gateway
    // -------------------------

    const lambdaLogGroup = new logs.LogGroup(this, 'ApiLambdaLogGroup', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const lambdaFn = new lambda.DockerImageFunction(this, 'ApiLambda', {
      code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, '../../app'), {
        entrypoint: ['python', '-m', 'awslambdaric'],
        cmd: ['main.handler'],
      }),
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      environment: {
        BUCKET_NAME: bucket.bucketName,
      },
      logGroup: lambdaLogGroup,
    });

    // Grant Lambda execution role read/write access to S3
    bucket.grantReadWrite(lambdaFn);

    // API Gateway HTTP API
    const httpApi = new apigatewayv2.HttpApi(this, 'HttpApi', {
      apiName: 'stratocore-api',
    });

    const integration = new apigatewayv2_integrations.HttpLambdaIntegration(
      'LambdaIntegration',
      lambdaFn,
    );

    httpApi.addRoutes({
      path: '/{proxy+}',
      methods: [apigatewayv2.HttpMethod.ANY],
      integration,
    });

    // Also add root path
    httpApi.addRoutes({
      path: '/',
      methods: [apigatewayv2.HttpMethod.ANY],
      integration,
    });

    // -------------------------
    // 6. CfnOutputs
    // -------------------------
    new cdk.CfnOutput(this, 'AlbUrl', { value: `http://${alb.loadBalancerDnsName}` });
    new cdk.CfnOutput(this, 'ApiGatewayUrl', { value: httpApi.url! });
    new cdk.CfnOutput(this, 'BucketName', { value: bucket.bucketName });
    new cdk.CfnOutput(this, 'EcrRepo', { value: repo.repositoryUri });
  }
}

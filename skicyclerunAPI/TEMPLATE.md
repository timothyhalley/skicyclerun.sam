* References









<!-- Outputs:
  # ServerlessRestApi is an implicit API created out of Events key under Serverless::Function
  # Find out more about other implicit resources you can reference within SAM
  # https://github.com/awslabs/serverless-application-model/blob/master/docs/internals/generated_resources.rst#api
  # Welcome Function
  WelcomeApi:
    Description: "API Gateway endpoint URL for Prod stage for Welcome function"
    Value: !Sub "https://${ServerlessRestApi}.execute-api.${AWS::Region}.amazonaws.com/Prod/welcome/"
  WelcomeFunction:
    Description: "Welcome Lambda Function ARN"
    Value: !GetAtt WelcomeFunction.Arn
  WelcomeFunctionIamRole:
    Description: "Implicit IAM Role created for Welcome function"
    Value: !GetAtt WelcomeFunctionRole.Arn
  ## Random Function
  RandomApi:
    Description: "API Gateway endpoint URL for Prod stage for Random function"
    Value: !Sub "https://${ServerlessRestApi}.execute-api.${AWS::Region}.amazonaws.com/Prod/random/"
  RandomFunction:
    Description: "Random Lambda Function ARN"
    Value: !GetAtt RandomFunction.Arn
  RandomFunctionIamRole:
    Description: "Implicit IAM Role created for Random function"
    Value: !GetAtt RandomFunctionRole.Arn
  ## GetAlbums Function
  GetAlbumsApi:
    Description: "API Gateway endpoint URL for Prod stage for GetAlbums function"
    Value: !Sub "https://${ServerlessRestApi}.execute-api.${AWS::Region}.amazonaws.com/Prod/getalbums/"
  GetAlbumsFunction:
    Description: "GetAlbums Lambda Function ARN"
    Value: !GetAtt GetAlbumsFunction.Arn
  GetAlbumsFunctionIamRole:
    Description: "Implicit IAM Role created for GetAlbums function"
    Value: !GetAtt GetAlbumsFunctionRole.Arn
  ## S3TestGetKey Function
  S3TestGetKeyApi:
    Description: "API Gateway - S3TestGetKey function"
    Value: !Sub "https://${ServerlessRestApi}.execute-api.${AWS::Region}.amazonaws.com/Prod/s3testgetkey/"
  S3TestGetKeyFunction:
    Description: "S3TestGetKey Lambda Function ARN"
    Value: !GetAtt S3TestGetKeyFunction.Arn
  S3TestGetKeyFunctionIamRole:
    Description: "Implicit IAM Role created for S3TestGetKey function"
    Value: !GetAtt S3TestGetKeyFunctionRole.Arn -->
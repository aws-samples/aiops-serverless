// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const {AWS_CONFIG} = require('./../application/resources/js/awsconfig.js');
const AWS = require('aws-sdk')
const AmazonCognitoIdentity = require('amazon-cognito-identity-js');

var gameShots = {};
var gameLevel = {};
var gameScore = {};

module.exports = {
  setJWTToken: setJWTToken,
  getUserPoolData: getUserPoolData,
  getSessionId: getSessionId,
  logAllocationResponse: logAllocationResponse,
  logUpdateStatusResponse: logUpdateStatusResponse,
  setDateTime,
  setGameData
}

async function setJWTToken(context, ee, next) {
    
    var username = context.vars.username;
    var password = context.vars.password;
    var poolid = context.vars.poolId;
    var clientid = context.vars.clientId;
    var region = AWS_CONFIG.region;

    await loginUser(username, password,poolid,clientid,region)
        .then(resopnse => {
            console.error("Login successful for user: " + username)
            context.vars.jwttoken = resopnse;
        })
        .catch(err => {
            console.error("Login failed for user: " + username + ". Error" +  err)
        })
                        
    return next(); // MUST be called for the scenario to continue
}

function logAllocationResponse(requestParams, response, context, ee, next) {
  console.log("Player: " + context.vars.username + " Status: "  + response.body);
  return next(); // MUST be called for the scenario to continue
}

function setDateTime(requestParams, context, ee, next) {
  console.log((new Date()).toJSON());
  context.vars.currentdatetime = (new Date()).toJSON();
  return next(); // MUST be called for the scenario to continue
}

function setGameData(requestParams, context, ee, next) {
    
  var username = context.vars.username;
  
  var lives = 3 ;
  var level = gameLevel[username]  ? gameLevel[username]  : 1 ;
  var score = gameScore[username] ? gameScore[username]  : 0  ;
  var shots = gameShots[username] ? gameShots[username]  : 0 ;
  
  console.log("Before:" + shots)
  
  var randomShots = getRandomInt(0,6);
  var randomMissedShots = getRandomInt(0,4);
  
  shots = shots+ randomShots;
  score = randomMissedShots ==0 ? score  : score + (randomShots*5);
  if (score >= 250){
      level = level + 1;
  }
  
  console.log("After:" + shots )
  console.log("Score:" + score )
  context.vars.lives = lives;
  context.vars.level = level;
  context.vars.score = score;
  context.vars.shots = shots
  
  
  gameShots[username] = shots;
  gameLevel[username] = level;
  gameScore[username] = score;
  return next(); // MUST be called for the scenario to continue
}


function getRandomInt(min, max)
{
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}

function logUpdateStatusResponse(requestParams, response, context, ee, next) {
  console.log("Status updated: " + response.body);
  return next(); // MUST be called for the scenario to continue
}

function getUserPoolData(requestParams, response, context, ee, next) {

    let dataAsJSON = JSON.parse(response.body);
    console.log('Parameters' + dataAsJSON.Parameters[1].Name);
    let userPoolConfiguration = dataAsJSON.Parameters;
    
    let poolid = userPoolConfiguration.filter((e) => { return e.Name.indexOf("userpoolid") > -1 });
    context.vars.poolId= poolid[0].Value;
    let clientid = userPoolConfiguration.filter((e) => { return e.Name.indexOf("clientid") > -1 });
    context.vars.clientId= clientid[0].Value;
    let userpoolurl = userPoolConfiguration.filter((e) => { return e.Name.indexOf("userpoolurl") > -1 });
    context.vars.userPoolURL= userpoolurl[0].Value
    return next();
}

function getSessionId(requestParams, response, context, ee, next) {

    //Adding try catch to continue with scenario even though artillery is throwing error while parsing session in first line
    try{
        let dataAsJSON = JSON.parse(response.body);
        if (typeof dataAsJSON == 'string') dataAsJSON = JSON.parse(dataAsJSON);
        let sessionId = dataAsJSON.SessionId;
        context.vars.sessionid = sessionId;

    }
    catch(err){
        console.log("Error while getting session id: " + err)
    }
    finally{
        return next();
    }
}



async function  loginUser(username, password, poolid, clientid,region) {
        var usernameForLogin = username.toLowerCase();
        var loginUserParams = { 'Username': usernameForLogin, 'Password': password };
        var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(loginUserParams);
        var poolData = {
        	UserPoolId: poolid, 
        	ClientId: clientid 
        };
        var userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData)
        var userData = {
            Pool: userPool,
            Username: usernameForLogin
        };
        var cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
        
        return new Promise((resolve, reject) =>(
                cognitoUser.authenticateUser(authenticationDetails, {
                    onSuccess: (result) => resolve(result.getIdToken().getJwtToken()),
                    onFailure: (err) => reject(err)
                    
                }
            )
        
        
        ));
        
    }    
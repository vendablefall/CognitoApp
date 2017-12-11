appConfig = {
    "general":{
        "region": "ap-southeast-2"
    },
    "cognito":{
        "cognitoUserPoolId" : "ap-southeast-2_FbqbUAeXA",
        "cognitoApplicationClientId" : "7ol8hn0eolq57v24jmf9t8ituk",
        "cognitoIdentityPoolId" : "ap-southeast-2:89615141-8906-4d7c-bf15-2ef574c61943"
    }
}

var ActiveSession = false;

var UI_SIGNUP_SIGNIN = 0;
var GENERAL_AWS_REGION = appConfig.general.region;
var COGNITO_IDENTITY_POOL_ID = appConfig.cognito.cognitoIdentityPoolId;
var COGNITO_USER_POOL_ID = appConfig.cognito.cognitoUserPoolId;
var COGNITO_APP_CLIENT_ID = appConfig.cognito.cognitoApplicationClientId;

var COGNITO_LOGIN_PROVIDER = "cognito-idp." + GENERAL_AWS_REGION + ".amazonaws.com/"+COGNITO_USER_POOL_ID;

AWSCognito.config.region = GENERAL_AWS_REGION;
var poolData = { 
    UserPoolId : COGNITO_USER_POOL_ID,
    ClientId : COGNITO_APP_CLIENT_ID
};

var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(poolData);

//This is set in refreshSessionStatus() further down the page, this can be used to access tokens.
var SignInStatus = {
    currentCognitoUser: userPool.getCurrentUser(),
    lastIdentityToken: null,
    lastAccessToken: null,
    cognitoSubNumber: null
};

(function() {
    var storedSession = sessionStorage.getItem("storedSession");
    if(storedSession){
        var SignInStatus = storedSession;
    }else{
        var SignInStatus = {
            currentCognitoUser: userPool.getCurrentUser(),
            lastIdentityToken: null,
            lastAccessToken: null
        };
        switchToScreen("screen-login");
    }
    console.log("validating stored session with Amazon Cognito...");

    if(refreshSessionStatus()){
        console.log("resumed session is still good.");
        switchToScreen("screen-logged-in", function(err, data){
            if(err){
                console.log("There was an existing session from previous visit, but then there wasn't. Something went wrong.");
            }
            else{
                console.log("existing session from previous visit, redirected to welcome screen.");
            }
        });
    }
    else{
        console.log("Amazon Cognito rejected the stored session. clearing and redirecting to login.");
        switchToScreen("screen-login", function(err,data){
            console.log("ready for user login.");
        });
    }
})();



function registerCognitoUser(clinicName, email, password, phoneNumber, streetAddress, postCode, cityTown, callback){
    
        var attributeList = [];
    
        var dataClinicName = {
            Name : 'custom:clinicName',
            Value : clinicName
        };
    
        var dataEmail = {
            Name : 'email',
            Value : email
        };
    
        var dataPhoneNumber = {
            Name : 'custom:phoneNumber',
            Value : phoneNumber
        };
    
        var dataStreetAddress = {
            Name : 'custom:address',
            Value : streetAddress
        };
    
        var dataPostCode = {
            Name : 'custom:postcode',
            Value : postCode
        };
    
        var dataCityTown = {
            Name : 'custom:cityTown',
            Value : cityTown
        };

    
        var attributeClinicName = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute(dataClinicName);
        var attributeEmail = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute(dataEmail);
        var attributePhoneNumber = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute(dataPhoneNumber);
        var attributeStreetAddress = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute(dataStreetAddress);
        var attributePostCode = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute(dataPostCode);
        var attributeCityTown = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute(dataCityTown);
    
        attributeList.push(attributeClinicName);
        attributeList.push(attributeEmail);
        attributeList.push(attributePhoneNumber);
        attributeList.push(attributeStreetAddress);
        attributeList.push(attributePostCode);
        attributeList.push(attributeCityTown);
    
        userPool.signUp(email, password, attributeList, null, function(err, result){
            if (err) {
                alert(err);
                callback(err, null);
                return;
            }
            cognitoUser = result.user;
            console.log('user name is ' + cognitoUser.getUsername());
            callback(null, result);
        });
    }

function authenticateUser(username, password, callback){
    var authenticationData = {
        Username : username,
        Password : password,
    };
    var authenticationDetails = new AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails(authenticationData);
    
    var userData = {
        Username : username,
        Pool : userPool
    };
    var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function (result) {
            AWS.config.region = GENERAL_AWS_REGION; // Region
            var cognitoIdentityCredentials = {
                IdentityPoolId: COGNITO_IDENTITY_POOL_ID,
                Logins : {}
            };
            cognitoIdentityCredentials.Logins[COGNITO_LOGIN_PROVIDER] = result.getIdToken().getJwtToken();
            AWS.config.credentials = new AWS.CognitoIdentityCredentials(cognitoIdentityCredentials);
            SignInStatus.currentCognitoUser = cognitoUser;
            refreshSessionStatus();
            callback(null, result);
        },

        onFailure: function(err) {
            callback(err, null);
        },

    });
}

function getCurrentCognitoUser(){
    var cognitoUser = userPool.getCurrentUser();

    if (cognitoUser != null) {
        cognitoUser.getSession(function(err, session) {
            if (err) {
                console.log(err);
                return null;
            }
            else{
                console.log('session validity: ' + session.isValid());
                return cognitoUser;
            }
        });
    }
}

function changeUserPassword(oldPassword, newPassword, callback){
    var cognitoUser = getCurrentCognitoUser();
    if(cognitoUser == null){
        console.log("Invalid operation, no user session is currently active. Please login and try again.")
        callback("Invalid operation, no user session is currently active. Please login and try again.", null);
    }
    else{
        cognitoUser.changePassword(oldPassword, newPassword, function(err, result) {
            if (err) {
                callback(err, null);
            }
            else{
                callback(null, result);
            }
        }); 
    }
}

function resendConfirmationCode(callback){
    var cognitoUser = getCurrentCognitoUser();
    if(cognitoUser == null){
        console.log("Invalid operation, no user session is currently active. Please login and try again.")
        callback("Invalid operation, no user session is currently active. Please login and try again.", null);
    }
    else{
        cognitoUser.resendConfirmationCode(function(err, result) {
            if (err) {
                callback(err, null);
            }
            else{
                callback(null, result);
            }
        });
    }
}

function confirmUnauthenicatedUserRegistration(username, registrationCode, callback){
    var userData = {
        Username : username,
        Pool : userPool
    };

    var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
    cognitoUser.confirmRegistration(registrationCode, true, function(err, result) {
        if (err) {
            callback(err, null);
        }
        else{
            callback(null, result);
        }
    });

}

function signoutLocally(){
    var cognitoUser = getCurrentCognitoUser();
    if (cognitoUser != null) {
        cognitoUser.signOut();
    }
    SignInStatus.currentCognitoUser.clearCachedTokens();
    SignInStatus.lastIdentityToken = null;
    SignInStatus.lastAccessToken = null;
    SignInStatus.currentCognitoUser = null;
    sessionStorage.setItem("storedSession", null);
}

function signoutGlobally(){
    var cognitoUser = getCurrentCognitoUser();
    if (cognitoUser != null) {
        cognitoUser.globalSignOut();
    }
    SignInStatus.currentCognitoUser.clearCachedTokens();
    SignInStatus.lastIdentityToken = null;
    SignInStatus.lastAccessToken = null;
    SignInStatus.currentCognitoUser = null;
    sessionStorage.setItem("storedSession", null);
}

function testS3(){
    var s3 = new AWS.S3();
    s3.listObjects({
        Bucket: "cognitodemo-bucket"
    }, 
    function(err, data){
        if(err){
            console.log("Unsuccessful S3 test. Details:");
            console.log(err);
        }
        else{
            console.log("Successful S3 test. Details:");
            console.log(data);
        }
    });
}

function switchToScreen(desiredScreenName, callback){
    var desiredScreen = $("#"+desiredScreenName);
    var nosessionScreen = desiredScreen.data('nosession-screen');

    refreshSessionStatus();
    if(desiredScreen){
        var protectedScreen = false;
        if(desiredScreen.data('protected') && desiredScreen.data('protected') == true){
            protectedScreen = true;
            console.log("Attempting to switch to a secured screen.");
        }

        if(protectedScreen && !SignInStatus.currentCognitoUser){
            var error = "Screen switch failed. No active user session and desired screen is secured. Attempting to redirect to no session target: " + nosessionScreen;
            console.log(error);
            switchToScreen(nosessionScreen, callback);
        }
        else{
            $('.screen').each(function(i, obj) {
                if($(obj).attr('id') != desiredScreenName){
                    $(obj).addClass("hidden-screen");
                    $(obj).removeClass("active-screen");
                }else{
                    $(obj).addClass("active-screen");
                    $(obj).removeClass("hidden-screen");
                }
            });
            callback(null, 0);
        }
    }
    else{
        var error = "Desired screen '"+desiredScreenName+"' does not exist. Unable to navigate."
        callback(error, null);
    }
}

function refreshSessionStatus(){
    console.log('Refreshing cognito session data prior to screen switch.');
    if (!SignInStatus.currentCognitoUser) {
        console.log("Not logged in.");
        sessionStorage.setItem("storedSession", null);
        return false;
    }
    else{
        SignInStatus.currentCognitoUser.getSession(function(err, session) {
            if (err) {
                SignInStatus.currentCognitoUser.clearCachedTokens();
                SignInStatus.lastIdentityToken = null;
                SignInStatus.lastAccessToken = null;
                SignInStatus.currentCognitoUser = null;
                sessionStorage.setItem("storedSession", null);
                console.log("Amazon Cognito reported an error: "+err);
                return;
            }else{
                SignInStatus.lastIdentityToken = session.getIdToken().getJwtToken();       
                SignInStatus.lastAccessToken = session.getAccessToken().getJwtToken();
                // TODO make this block set this variable to the cognito users cognitoSubNumber
                SignInStatus.cognitoSubNumber = null;
                sessionStorage.setItem("storedSession", SignInStatus);
                console.log("Current user session is valid.");
                return;
            }
        });
        return true;
    }
}

function deleteCognitoUser(userId, userpoolId, awsApiKey, awsApiSecret, region, callback){
    AWS.config.update({accessKeyId: awsApiKey, secretAccessKey: awsApiSecret});    
    AWS.config.update({region: region});
    
    var cognito = new AWS.CognitoIdentityServiceProvider();
    var params = {
        UserPoolId: userpoolId,
        Username: userId 
      };
    cognito.adminDeleteUser(params, function(err, data){
        if(err){
            console.log("unable to delete cognito user, details:");
            console.log(err);
        }else{
            console.log("successfully deleted cognito user: " + userId);
        }
        callback(err, data);
    });
}
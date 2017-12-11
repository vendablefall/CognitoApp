$("#form-activation-resendActivationCode-link").click(function(event){
    event.preventDefault();
    resendConfirmationCode(function(err,data){
        if(err){
            console.log("An error occured resending the confirmation code to the user. Details:");
            console.log(JSON.stringify(err));
        }
        else{
            switchToScreen("screen-activation-resent", function(err,data){
                
                            });
        }
    });
});

$("#activate-button").click(function(event){
    event.preventDefault();
    username = $('#inputUsername').val();
    activationCode = $('#inputActivationCode').val();
    confirmUnauthenicatedUserRegistration(username, activationCode, function(err, data){
        if(err){
            console.log("An error occured during user account activation. Details:");
            console.log(JSON.stringify(err));
        }
        else{
            switchToScreen("screen-activated", function(err,data){
                
                            });
        }
    });
});

$(".signout-button").click(function(event){
    event.preventDefault();
    signoutLocally();
    switchToScreen("screen-login", function(err, data){
        if(err){
            console.log("something went wring during signout.");
            console.log(err);
        }
        else{
            console.log("user signed out and redirected to login page.");
        }
    });
});

$('.screen-navigation-link').click(function(event){
    var desiredScreenName = $(this).attr("data-targetScreen");
    switchToScreen(desiredScreenName, function(err, data){
        if(err){
            console.log(err);
        }else{
            console.log("Screen switched to: " + desiredScreenName);
        }
    });
});

$('.signin-button').click(function(event){
    event.preventDefault();
    var username = $('#signinEmail').val();
    var password = $('#signinPassword').val();
    authenticateUser(username, password, function(err,data){
        if(err){
            console.log(JSON.stringify(err, null, 2));
        }
        else{
            console.log('You are now logged in.');
            switchToScreen("screen-logged-in", function(err,data){
                console.log("login complete, redirected user to welcome screen.");
            });
        }
    });
});

$('.register-button').click(function(event){
    event.preventDefault();
    var clinicName = $('#clinicName').val();
    var email = $('#registerEmail').val();
    var password = $('#registerPassword').val();
    var phoneNumber = $('#phoneNumber').val();
    var streetAddress = $('#streetAddress').val();
    var postCode = $('#postCode').val();
    var cityTown = $('#cityTown').val();

    registerCognitoUser(clinicName, email, password, phoneNumber, streetAddress, postCode, cityTown, function(err, data){
        if(err){
            console.log(JSON.stringify(err, null, 2));
        }
        else{
            console.log('You are now registered, please activate your account using the code emailed you to before attempting to login.');
            switchToScreen("screen-account-created", function(err,data){
                $("#inputUsername").val(username);
            });
        }
    });
});

$("#delete-user-button").click(function(event){
    var userId = $("#inputUserId").val();
    var userPoolId = appConfig.cognito.cognitoUserPoolId;
    var region = appConfig.general.region;
    var awsApiKey = $("#inputApiKey").val();
    var awsApiSecret = $("#inputApiSecret").val();
    deleteCognitoUser(userId, userPoolId, awsApiKey, awsApiSecret, region, function(err, data){
        if(err){
            console.log("error deleting cognito user.");
        }
        else{
            switchToScreen("screen-user-deleted", function(err, data){
                console.log("user deletion complete.");
            });
        }
    });
});
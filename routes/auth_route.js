var express  = require('../node_modules/express');
var authApp = express.Router();
var userAccount = require( '../modules/app_modules_user.js'); // User modules
var userProfile = require( '../modules/app_modules_profile.js'); // User modules
var connection = require('../modules/app_modules_mysql.js');
var mysqlQuery = require('../constance/mysql_constance');
var tokenAuth = require('../modules/app_modules_token'); // used to create, sign, and verify tokens
var jwt = require('../node_modules/jsonwebtoken'); // used to create, sign, and verify tokens
var config = require('../config/config.js');
var passHash = require('../modules/app_modules_hash');

authApp.post('/authenticate', function(req, res) {
	console.log("Authenticating");
	//Will need to work on this, mabey a join stuff?
	//Check for the user.

	//CALLBACK function for token function. Will return the responce from function once the token has
	//Been created.
	var tokenCreated = function(responce){
		res.json(responce);
	}

	//Password has been verified
	var passSuccess = function(id){
		console.log("Password matches");
		//As soon as the password has been match get the profile info and send it to the user.
		connection.query(
			'SELECT * FROM user_account WHERE user_id = '+id,
			function(err,rows){
				if(err) throw err;
				console.log(rows);
				if(rows.length != 0){
					var user = new userAccount(rows[0]);
					console.log(user);
					connection.query(
						'SELECT * FROM user_profile WHERE profile_id = '+user.profile_id,
						function(err,rows){
							if(err) throw err;
							console.log(rows);
							if(rows.length != 0){
								//Getting the last few infromatio peices for the user profile.
								console.log("Profile stuff");
								var profile = new userProfile(rows[0]);
								console.log(profile);
								tokenAuth.createToken(tokenCreated, user, profile);
							}
						}
					);
				}
			}
		);
	}
	//Password does not match
	var passErr = function(message){
		console.log("NO");
		console.log(message);
		res.send(false);
	}

	connection.query(
		'SELECT * FROM user_account WHERE user_email = '+"'"+req.body.email + "'",
		function(err,rows){
			if(err) throw err;
			console.log("Worked");
			console.log(connection);
			if(rows.length != 0){
				passHash.verify(req.body.password, rows[0].password, rows[0].user_id, passSuccess, passErr);
			}else{
				res.send(false);
			}
		}
	);
});

authApp.post('/sign_up', function(req, res, next){
	console.log("Sign up");
	console.log(req.body);
	// var user = new userProfile(req.body);
	// console.log(user);
	//Check if the user already exsists...
	connection.query(
		'SELECT user_email FROM user_account WHERE user_email = '+"'"+req.body.email+ "'",
		function(err,rows){
			if(err) throw err;
			console.log(rows)
			//If the db returns something to the user, a user is already using the given email.
			if(rows.length != 0){
				res.send("false");
				res.end();
			}else{
				//Is the db returns nothing, the user does not exsist and the profile can be created.
				// req.user = user;
				next();
			}
		}
	);
}, function(req, res){
	//Create the profile.
	console.log("next");
	var hashedSuccess = function(hashedPass){
		connection.query(
			'INSERT INTO user_profile (country, gender) VALUES (' + "'" + req.body.country + "', '" + req.body.gender + "')",
				function(err, rows){
					if(err) throw err;
					console.log("YES");
					console.log(rows);
					connection.query(
						'INSERT INTO user_account (profile_id, user_email, password, first_name, last_name, date_of_birth) VALUES (' + "'" +rows.insertId  + "', '" +  req.body.email + "', '" + hashedPass + "', '" + req.body.firstName
						+ "', '" + req.body.lastName + "', '" + req.body.dob + "')",
						function(err, rows){
							if(err) throw(err);
							res.send("User has logged in");
						}
					);
				}
		);
	}
	passHash.passwordHash(req.body.password, hashedSuccess);
});

module.exports = authApp;

'use strict';
var log = require('./logging.js').getLogger('RosterController.js');
var renderModule = require('./renderService.js');
var async = require('async');
var QueryFilter = require('./QueryFilter.js');
var hash = require('object-hash');

var universalDaoModule = require(process.cwd() + '/build/server/UniversalDao.js');

var RosterController = function(mongoDriver) {

	var renderService = new renderModule.RenderService();

	
	var rosterDao = new universalDaoModule.UniversalDao(
			mongoDriver,
			{collectionName: 'rosters'}
	);

	var seasonDao = new universalDaoModule.UniversalDao(
			mongoDriver,
			{collectionName: 'seasons'}
	);


	var peopleDao = new universalDaoModule.UniversalDao(
			mongoDriver,
			{collectionName: 'people'}
	);

	var competitionDao = new universalDaoModule.UniversalDao(
			mongoDriver,
			{collectionName: 'competitions'}
	);

	var clubDao = new universalDaoModule.UniversalDao(
			mongoDriver,
			{collectionName: 'organizations'}
	);

	var transferDao = new universalDaoModule.UniversalDao(
			mongoDriver,
			{collectionName: 'transfers'}
	);
	
	var ageCategoryDao = new universalDaoModule.UniversalDao(
			mongoDriver,
			{collectionName: 'ageCategories'}
	);


	this.mongoDriver=mongoDriver;

	this.search=function (req,res){

		var clubId=req.param('club');
		var compId=req.param('comp');
		var seasonId=req.param('season');

		var toCall=[];
		var seasons=null;
		var competitions=null;
		var clubs=null;
		var rosters=null;

		var qf=QueryFilter.create();
			qf.addCriterium('club','ex',null);

		toCall.push(function(callback){ seasonDao.list({},function(err,data){ if (err) {callback(err);return; } seasons=data;callback(); });} );
		toCall.push(function(callback){ competitionDao.list({},function(err,data){ if (err) {callback(err);return; } competitions=data;callback(); });} );
		toCall.push(function(callback){ clubDao.list(qf,function(err,data){ if (err) {callback(err);return; } clubs=data;callback(); });} );	

		if (seasonId || compId)	{
			var rosterqf=QueryFilter.create();
			if (clubId){
				rosterqf.addCriterium('baseData.club.oid','eq',clubId);
			}
			if (seasonId){
				rosterqf.addCriterium('baseData.season.oid','eq',seasonId);	
			}
			if (compId){
			rosterqf.addCriterium('baseData.competition.oid','eq',compId);
			}
			
			toCall.push(function(callback){ rosterDao.list(rosterqf,function(err,data){ if (err) {callback(err);return; } rosters=data;callback(); });} );	
		}
		
		async.parallel(toCall, function (err){
			if (err){
				log.err(err);
				res.send(500);
				return;
			}

			var i,j;

			if (rosters) {
				for (i = 0; i < rosters.length; ++i) {
					for (j = 0; j < clubs.length; ++j) {
						if (rosters[i].baseData.club.oid === clubs[j].id) {
							rosters[i].baseData.club.refData = {name: clubs[j].club.name};
							break;
						}
					}
					for (j = 0; j < seasons.length; ++j) {
						if (rosters[i].baseData.season.oid === seasons[j].id) {
							rosters[i].baseData.season.refData = {name: seasons[j].baseData.name};
							break;
						}
					}
					for (j = 0; j < competitions.length; ++j) {
						if (rosters[i].baseData.competition.oid === competitions[j].id) {
							rosters[i].baseData.competition.refData = {name: competitions[j].baseData.name};
							break;
						}
					}
				}
			}
			var page=renderService.render(renderModule.templates.SEARCH,{seasons:seasons,competitions:competitions,clubs:clubs,rosters:rosters,selectedClub:clubId,selectedSeason:seasonId,selectedComp:compId});
			res.send(200,page);
		} );

		
	};

	
	this.roster=function (req,res){
		var rosterId=req.params.id;
		

		rosterDao.get(rosterId,function(err,data){
				if (err){res.send(500); return;}
		
				var roster={prName:data.baseData.prName};
				
				var toCall=[];
				toCall.push(function(callback){ seasonDao.get(data.baseData.season.oid,function(err,data){ if (err) {callback(err);return; } roster.season=data.baseData.name;callback(); });} );
				toCall.push(function(callback){ clubDao.get(data.baseData.club.oid,function(err,data){ if (err) {callback(err);return;} roster.club=data.club.name;callback(); });} );
				toCall.push(function(callback){ seasonDao.get(data.baseData.season.oid,function(err,data){ if (err) {callback(err);return;} roster.season=data.baseData.name;callback(); });} );
				toCall.push(function(callback){ competitionDao.get(data.baseData.competition.oid,function(err,data){ if (err) {callback(err);return;} roster.competition=data.baseData.name;callback(); });} );

				if (data.coaches.coach.oid) {
					toCall.push(function(callback){ peopleDao.get(data.coaches.coach.oid,function(err,data){ if (err) {callback(err);return;} roster.coach={}; roster.coach.name=data.baseData.surName + ' '+ data.baseData.name; roster.coach.license=((data.coach && data.coach.coachLicense) || ' ') +' / '+ ((data.coach && data.coach.coachLicenseType) || ' ') ;callback(); });} );
				}

				toCall.push(function(callback){ ageCategoryDao.get(data.baseData.ageCategory.oid,function(err,data){ if (err) {callback(err);return;} roster.category=data.baseData.name;callback(); });} );

				
				if (data.coaches.aCoach1.oid){
					toCall.push(function(callback){ peopleDao.get(data.coaches.aCoach1.oid,function(err,data){ if (err) {callback(err);return;}  roster.assistant1={}; roster.assistant1.name=data.baseData.surName + ' '+ data.baseData.name;roster.assistant1.license=((data.coach && data.coach.coachLicense) || ' ') +' / '+ ((data.coach && data.coach.coachLicenseType) || ' ')  ;callback(); });} );
				}

				if (data.coaches.aCoach2.oid){
					toCall.push(function(callback){ peopleDao.get(data.coaches.aCoach2.oid,function(err,data){ if (err) {callback(err);return;} roster.assistant2={};roster.assistant2.name=data.baseData.surName + ' '+ data.baseData.name;roster.assistant2.license=((data.coach && data.coach.coachLicense) || ' ') +' / '+ ((data.coach && data.coach.coachLicenseType) || ' ') ;callback(); });} );
				}

				if (data.coaches.aCoach3.oid){
					toCall.push(function(callback){ peopleDao.get(data.coaches.aCoach3.oid,function(err,data){ if (err) {callback(err);return;} roster.assistant3={};roster.assistant3.name=data.baseData.surName + ' '+ data.baseData.name;roster.assistant3.license=((data.coach && data.coach.coachLicense) || '') +' / '+ ((data.coach && data.coach.coachLicenseType) || '') ;callback(); });} );
				}

				if (data.coaches.aCoach4.oid){
					toCall.push(function(callback){ peopleDao.get(data.coaches.aCoach4.oid,function(err,data){ if (err) {callback(err);return;} roster.assistant4={};roster.assistant4.name=data.baseData.surName + ' '+ data.baseData.name;roster.assistant4.license=((data.coach && data.coach.coachLicense) || '') +' / '+ ((data.coach && data.coach.coachLicenseType) || ' ') ;callback(); });} );
				}

				if (data.coaches.aCoach5.oid){
					toCall.push(function(callback){ peopleDao.get(data.coaches.aCoach5.oid,function(err,data){ if (err) {callback(err);return;} roster.assistant5={};roster.assistant5.name=data.baseData.surName + ' '+ data.baseData.name;roster.assistant5.license=((data.coach && data.coach.coachLicense) || ' ') +' / '+ ((data.coach && data.coach.coachLicenseType) || ' ') ;callback(); });} );
				}

				
				var players={};
				var index=0;


				data.listOfPlayers.players.map(function(item){
					item.id=index++;
					toCall.push(function(callback){  peopleDao.get(item.oid,function(err,data){
						if (err) {callback(err);return;} 
						var player={surName:data.baseData.surName,name: data.baseData.name,birthDate: convertDate(data.baseData.birthDate), license: data.player.playerLicense}; 
						players[item.id]= player;
						var pqf = QueryFilter.create();
						
						pqf.addCriterium('baseData.player.oid', 'eq', data.id);
						pqf.addCriterium('baseData.stateOfTransfer', 'eq', 'schválený');
						(function(localPlayer, callback) {
							transferDao.list(pqf, function(err, data) {
								if (err) {
									callback(err);
								}
								
								if (data && data.length > 0) {
								var ttype = data[0].baseData.typeOfTransfer || '';
								if (ttype === 'hosťovanie') {
									ttype = 'H';
								} else if (ttype === 'zahr. transfér') {
									ttype = 'T'
								} else {
									ttype = '';
								}
								if (ttype.length > 0) {
									localPlayer.note = ttype + ':' + (convertDate(data[0].baseData.dateTo) || '') ;
								} else {
									localPlayer.note = '';
								}
								} else {
									localPlayer.note = '';
								}
								callback();
							});
						})(player, callback);
					});
				} );	
				});


				async.parallel(toCall, function (err){
						if (data.baseData.gender=='M'){
							roster.gender='Muži';
						}
						else {
							roster.gender='Ženy';
						}
						roster.players=players;

						var d= new Date(data.baseData.lastModification);
						var strDate=''.concat(d.getDate(), '.', d.getMonth() + 1, '.' + d.getFullYear(), ' ', d.getHours(), ':', 
							(''.concat(d.getMinutes()).length === 1 ? '0'+d.getMinutes():d.getMinutes()), ':',
							(''.concat(d.getSeconds()).length === 1 ? '0'+d.getSeconds() : d.getSeconds()));
						roster.lastModification= strDate;
						var page=renderService.render(renderModule.templates.ROSTER,{roster:roster,hash:hash.sha1(JSON.stringify(roster))});
						res.send(200,page);
					} );

		});


	};

};

function convertDate(date){
	return date.substring(6)+'.'+date.substring(4,6)+'.'+date.substring(0,4) ;
}

module.exports = {
	RosterController: RosterController
};

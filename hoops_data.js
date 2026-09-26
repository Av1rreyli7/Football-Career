// NBA world as of September 26, 2026. Post 2026 offseason.
// Knicks are champions. LeBron is a Sixer. Giannis is on the Heat. Ja is a Blazer. Kawhi is a Raptor.
const HOOPS_TEAMS = {
"Boston Celtics": { conf: "East", cap: 19.6, roster: [
["Jayson Tatum","SF",28,94],["Paul George","SF",36,84],["Derrick White","SG",32,88],["Payton Pritchard","PG",28,85],["Mitchell Robinson","C",28,82],["Mike Conley","PG",39,74],["Sam Hauser","SF",28,78],["Neemias Queta","C",27,77],["Jordan Walsh","SF",22,72],["Baylor Scheierman","SG",26,74],["Ron Harper Jr.","SF",26,71],["Xavier Tillman","PF",27,72]]},
"Brooklyn Nets": { conf: "East", cap: 92.5, roster: [
["Julius Randle","PF",31,84],["Cam Thomas","SG",24,84],["Mikel Brown Jr.","PG",19,76],["Egor Demin","PG",20,75],["Nolan Traore","PG",19,72],["Danny Wolf","C",22,73],["Ben Saraf","SG",20,71],["Day'Ron Sharpe","C",24,76],["Keon Ellis","SG",26,77],["Moritz Wagner","C",29,74],["Terance Mann","SG",29,75],["Jalen Wilson","SF",25,73]]},
"New York Knicks": { conf: "East", cap: 0.6, roster: [
["Jalen Brunson","PG",30,95],["Karl-Anthony Towns","C",30,91],["OG Anunoby","SF",29,86],["Mikal Bridges","SF",30,85],["Josh Hart","SG",31,82],["Miles McBride","PG",26,79],["Jordan Clarkson","SG",34,75],["Landry Shamet","SG",29,75],["Jose Alvarado","PG",28,76],["Andre Drummond","C",33,73],["Tyler Kolek","PG",25,71],["Pacome Dadiet","SF",21,70]]},
"Philadelphia 76ers": { conf: "East", cap: 20.4, roster: [
["Tyrese Maxey","PG",25,92],["Jaylen Brown","SF",29,90],["LeBron James","SF",41,89],["Joel Embiid","C",32,87],["VJ Edgecombe","SG",21,81],["Anfernee Simons","SG",27,81],["Jared McCain","PG",22,79],["Kentavious Caldwell-Pope","SG",33,74],["Dean Wade","PF",29,74],["Adem Bona","C",23,74],["Ariel Hukporti","C",24,71],["Justin Edwards","SF",22,71]]},
"Toronto Raptors": { conf: "East", cap: 12.5, roster: [
["Kawhi Leonard","SF",35,88],["Scottie Barnes","PF",25,88],["RJ Barrett","SF",26,83],["Immanuel Quickley","PG",27,81],["Jakob Poeltl","C",30,81],["Ja'Kobe Walter","SG",22,75],["Collin Murray-Boyles","PF",21,74],["Gradey Dick","SG",22,0],["Jamal Shead","PG",24,74],["Ochai Agbaji","SG",26,74],["Kyle Anderson","PF",33,72],["Jonathan Mogbo","PF",24,71]]},
"Chicago Bulls": { conf: "East", cap: 104, roster: [
["Josh Giddey","PG",23,85],["Caleb Wilson","PF",19,78],["Matas Buzelis","SF",21,80],["Nic Claxton","C",27,81],["Norman Powell","SG",33,80],["Coby White","SG",26,0],["Tre Jones","PG",26,75],["Kam Jones","PG",24,72],["Julian Phillips","SF",22,72],["Jalen Smith","C",26,74],["Ayo Dosunmu","SG",26,0],["Noa Essengue","PF",19,72]]},
"Cleveland Cavaliers": { conf: "East", cap: 20.5, roster: [
["Donovan Mitchell","SG",30,93],["Evan Mobley","PF",25,92],["Darius Garland","PG",26,86],["Jarrett Allen","C",28,85],["Lonzo Ball","PG",28,78],["James Harden","PG",37,84],["Peyton Watson","SF",24,78],["Cam Whitmore","SF",22,77],["Sam Merrill","SG",30,74],["Craig Porter Jr.","PG",26,72],["Mario Hezonja","SF",31,72],["Thomas Bryant","C",29,71]]},
"Detroit Pistons": { conf: "East", cap: 65.5, roster: [
["Cade Cunningham","PG",25,94],["Jalen Duren","C",22,84],["Ausar Thompson","SF",23,84],["Jaden Ivey","SG",24,80],["Ron Holland II","SF",21,78],["John Collins","PF",29,79],["Isaiah Joe","SG",27,76],["Kevin Huerter","SG",28,75],["Gary Harris","SG",32,70],["Taurean Prince","SF",32,71],["Caleb Houstan","SF",23,71],["Chaz Lanier","SG",24,71]]},
"Indiana Pacers": { conf: "East", cap: 2.4, roster: [
["Tyrese Haliburton","PG",26,89],["Pascal Siakam","PF",32,87],["Andrew Nembhard","PG",26,80],["Aaron Nesmith","SF",27,79],["Obi Toppin","PF",28,77],["Kelly Oubre Jr.","SF",30,76],["T.J. McConnell","PG",34,74],["Jarace Walker","PF",23,75],["Ben Sheppard","SG",25,72],["Isaiah Jackson","C",24,74],["Larry Nance Jr.","PF",33,71],["Jay Huff","C",28,72]]},
"Milwaukee Bucks": { conf: "East", cap: 24.8, roster: [
["Tyler Herro","SG",26,84],["Myles Turner","C",30,82],["Kel'el Ware","C",22,80],["Kyle Kuzma","PF",31,76],["Jaime Jaquez Jr.","SF",25,78],["Kasparas Jakucionis","PG",20,74],["Caris LeVert","SG",32,75],["Gary Trent Jr.","SG",27,76],["Nate Ament","SF",19,76],["Brayden Burries","SG",19,74],["Kevin Porter Jr.","PG",26,76],["AJ Green","SG",27,74]]},
"Atlanta Hawks": { conf: "East", cap: 45.5, roster: [
["Jalen Johnson","SF",24,86],["Dyson Daniels","SG",23,83],["Kristaps Porzingis","C",31,0],["Onyeka Okongwu","C",25,80],["Nickeil Alexander-Walker","SG",28,80],["Buddy Hield","SG",33,74],["Luguentz Dort","SG",27,79],["Aaron Wiggins","SG",27,77],["Dorian Finney-Smith","PF",33,74],["Devin Carter","PG",24,74],["Kingston Flemings","PG",19,75],["Zaccharie Risacher","SF",21,0],["CJ McCollum","SG",35,75],["Jock Landale","C",30,70]]},
"Charlotte Hornets": { conf: "East", cap: 52, roster: [
["Brandon Miller","SF",23,84],["Kon Knueppel","SG",21,80],["Coby White","SG",26,80],["Naz Reid","C",27,80],["Grayson Allen","SG",31,75],["Dennis Schroder","PG",33,74],["Royce O'Neale","PF",33,72],["Hannes Steinbach","PF",20,74],["Ryan Kalkbrenner","C",24,74],["Sion James","SG",23,71],["Ryan Nembhard","PG",23,72]]},
"Miami Heat": { conf: "East", cap: 37.3, roster: [
["Giannis Antetokounmpo","PF",31,96],["Bam Adebayo","C",29,88],["Andrew Wiggins","SF",31,79],["Norman Powell","SG",33,0],["Klay Thompson","SG",36,75],["Bobby Portis","PF",31,76],["Davion Mitchell","PG",28,76],["Nikola Jovic","PF",23,77],["Tim Hardaway Jr.","SG",34,74],["Pelle Larsson","SG",25,74],["Simone Fontecchio","SF",30,72],["Nick Richards","C",28,73],["Kira Lewis Jr.","PG",25,70]]},
"Orlando Magic": { conf: "East", cap: 2.0, roster: [
["Paolo Banchero","PF",23,91],["Franz Wagner","SF",25,88],["Desmond Bane","SG",28,85],["Jalen Suggs","PG",25,81],["Wendell Carter Jr.","C",27,78],["Nikola Vucevic","C",35,77],["Anthony Black","PG",22,76],["Tristan da Silva","SF",25,74],["Jonathan Isaac","PF",29,73],["Jase Richardson","PG",20,73],["Goga Bitadze","C",27,74],["Jett Howard","SG",23,70]]},
"Washington Wizards": { conf: "East", cap: 76.9, roster: [
["Anthony Davis","C",33,90],["Trae Young","PG",28,89],["AJ Dybantsa","SF",19,82],["Deandre Ayton","C",28,78],["Khris Middleton","SF",35,74],["Alex Sarr","C",21,79],["Bilal Coulibaly","SF",22,77],["Kyshawn George","SF",22,75],["Bub Carrington","PG",21,74],["Tre Mann","PG",25,74],["Tre Johnson","SG",20,75],["Corey Kispert","SF",27,73]]},
"Oklahoma City Thunder": { conf: "West", cap: 2.0, roster: [
["Shai Gilgeous-Alexander","PG",28,98],["Jalen Williams","SF",25,90],["Chet Holmgren","C",24,89],["Isaiah Hartenstein","C",28,81],["Cason Wallace","SG",22,80],["Alex Caruso","SG",32,77],["Ajay Mitchell","PG",24,76],["Aday Mara","C",21,74],["Isaiah Hartman","SF",23,70],["Jaylin Williams","PF",24,73],["Kenrich Williams","SF",31,71],["Thomas Sorber","C",20,73],["Nikola Topic","PG",21,75]]},
"San Antonio Spurs": { conf: "West", cap: 36.1, roster: [
["Victor Wembanyama","C",22,96],["De'Aaron Fox","PG",28,90],["Dylan Harper","PG",20,82],["Stephon Castle","SG",22,83],["Devin Vassell","SG",26,80],["Keldon Johnson","SF",27,78],["Carter Bryant","SF",20,77],["Tobias Harris","PF",34,74],["Jeremy Sochan","PF",23,0],["Julian Champagnie","SF",25,74],["Luke Kornet","C",31,73],["Jordan McLaughlin","PG",30,70]]},
"Los Angeles Lakers": { conf: "West", cap: 115.8, roster: [
["Luka Doncic","PG",27,97],["Austin Reaves","SG",28,85],["Walker Kessler","C",25,80],["Quentin Grimes","SG",26,79],["Collin Sexton","PG",27,77],["Rui Hachimura","PF",28,0],["Dalton Knecht","SF",25,75],["Jarred Vanderbilt","PF",27,74],["Sandro Mamukelashvili","PF",27,73],["Jaden Hardy","SG",24,74],["Ziaire Williams","SF",25,73],["Matisse Thybulle","SG",29,72],["Kevon Looney","C",30,71],["Bronny James","PG",22,70]]},
"Golden State Warriors": { conf: "West", cap: 36.5, roster: [
["Stephen Curry","PG",38,92],["Jimmy Butler","SF",37,85],["Kristaps Porzingis","C",31,81],["Draymond Green","PF",36,78],["Moses Moody","SG",24,77],["Brandin Podziemski","SG",23,78],["De'Anthony Melton","SG",28,74],["Al Horford","C",40,72],["Yaxel Lendeborg","PF",23,75],["Gary Payton II","SG",33,71],["Georges Niang","PF",33,71],["Quinten Post","C",26,0],["Will Richard","SG",23,71]]},
"Los Angeles Clippers": { conf: "West", cap: 70.4, roster: [
["Brandon Ingram","SF",29,84],["Ivica Zubac","C",29,84],["Bradley Beal","SG",33,78],["Gradey Dick","SG",22,76],["Rui Hachimura","PF",28,77],["Max Strus","SG",30,75],["Keaton Wagler","SG",19,76],["Johni Broome","PF",24,74],["Derrick Jones Jr.","SF",29,74],["Kris Dunn","PG",32,72],["Kobe Sanders","SG",24,71],["Jordan Miller","SF",26,71]]},
"Phoenix Suns": { conf: "West", cap: 14.8, roster: [
["Devin Booker","SG",29,92],["Miles Bridges","SF",28,80],["Jalen Green","SG",24,82],["Dillon Brooks","SF",30,78],["Mark Williams","C",24,78],["Khaman Maluach","C",20,77],["Ryan Dunn","SF",23,75],["Luke Kennard","SG",30,74],["Koa Peat","PF",19,73],["Grayson Allen","SG",31,0],["Collin Gillespie","PG",27,72],["Oso Ighodaro","C",24,72],["Jordan Goodwin","PG",27,71]]},
"Sacramento Kings": { conf: "West", cap: 3.4, roster: [
["Domantas Sabonis","C",30,88],["Zach LaVine","SG",31,82],["De'Andre Hunter","SF",28,79],["Keegan Murray","PF",26,80],["Darius Acuff Jr.","PG",19,75],["Malik Monk","SG",28,77],["Ben Simmons","PF",30,72],["Dennis Schroder","PG",33,0],["Russell Westbrook","PG",37,73],["Precious Achiuwa","PF",27,73],["Alex Karaban","PF",23,72],["Nique Clifford","SG",24,73],["Maxime Raynaud","C",23,72]]},
"Denver Nuggets": { conf: "West", cap: 2.0, roster: [
["Nikola Jokic","C",31,98],["Jamal Murray","PG",29,87],["Aaron Gordon","PF",31,84],["Cameron Johnson","SF",30,81],["Christian Braun","SG",25,79],["DeMar DeRozan","SF",37,78],["Tyus Jones","PG",30,74],["Julian Strawther","SG",24,74],["Jonas Valanciunas","C",34,74],["Peyton Watson","SF",24,0],["Marvin Bagley III","PF",27,71],["DaRon Holmes II","PF",24,73],["Hunter Tyson","SF",26,70]]},
"Minnesota Timberwolves": { conf: "West", cap: 12.4, roster: [
["Anthony Edwards","SG",25,95],["LaMelo Ball","PG",25,86],["Jaden McDaniels","SF",26,82],["Rudy Gobert","C",34,81],["Jonathan Kuminga","PF",24,79],["Donte DiVincenzo","SG",29,77],["Rob Dillingham","PG",21,76],["Terrence Shannon Jr.","SF",26,76],["Ayo Dosunmu","SG",26,76],["Naz Reid","C",27,0],["Cody Williams","SF",21,72],["Jaylen Clark","SG",25,72],["Joan Beringer","C",20,72],["Trey Lyles","PF",30,71]]},
"Portland Trail Blazers": { conf: "West", cap: 11.4, roster: [
["Ja Morant","PG",27,89],["Shaedon Sharpe","SG",23,83],["Deni Avdija","SF",25,84],["Jrue Holiday","PG",36,76],["Damian Lillard","PG",36,84],["Toumani Camara","PF",26,79],["Donovan Clingan","C",22,79],["Scoot Henderson","PG",22,77],["Jeremy Sochan","PF",23,76],["Robert Williams III","C",28,74],["Yang Hansen","C",21,73],["Rayan Rupert","SG",22,71],["Branden Carlson","C",27,70]]},
"Utah Jazz": { conf: "West", cap: 63.1, roster: [
["Lauri Markkanen","PF",29,84],["Darryn Peterson","SG",19,81],["Keyonte George","PG",22,79],["Walker Kessler","C",25,0],["Kyle Filipowski","C",22,77],["Jusuf Nurkic","C",32,74],["Brice Sensabaugh","SF",23,74],["Taylor Hendricks","PF",22,74],["Ace Bailey","SF",20,77],["Isaiah Collier","PG",21,74],["Josh Green","SG",25,73],["Jaxson Hayes","C",26,72],["Josh Okogie","SG",28,71],["Mo Bamba","C",28,70]]},
"Dallas Mavericks": { conf: "West", cap: 48.6, roster: [
["Cooper Flagg","SF",19,91],["Kyrie Irving","PG",34,87],["Dereck Lively II","C",22,81],["Daniel Gafford","C",28,79],["P.J. Washington","PF",28,79],["Klay Thompson","SG",36,0],["Naji Marshall","SF",28,76],["Santi Aldama","PF",25,76],["Zaccharie Risacher","SF",21,76],["Morez Johnson Jr.","PF",19,73],["Marcus Sasser","PG",26,73],["Dante Exum","PG",31,72],["Max Christie","SG",23,75]]},
"Houston Rockets": { conf: "West", cap: 13.5, roster: [
["Kevin Durant","SF",38,90],["Alperen Sengun","C",24,90],["Amen Thompson","SF",23,88],["Jabari Smith Jr.","PF",23,80],["Tari Eason","PF",25,79],["Reed Sheppard","PG",22,78],["Fred VanVleet","PG",32,76],["Marcus Smart","PG",32,74],["Clint Capela","C",32,74],["Bogdan Bogdanovic","SG",34,73],["Steven Adams","C",33,73],["Aaron Holiday","PG",30,71],["Jae'Sean Tate","SF",30,70]]},
"Memphis Grizzlies": { conf: "West", cap: 56.2, roster: [
["Jaren Jackson Jr.","PF",27,87],["Cameron Boozer","PF",19,80],["Jerami Grant","PF",32,77],["D'Angelo Russell","PG",30,76],["Zach Edey","C",24,79],["Jaylen Wells","SG",23,76],["Isaiah Stewart","C",25,76],["Santi Aldama","PF",25,0],["GG Jackson","PF",21,76],["Cedric Coward","SF",23,74],["Karim Lopez","SF",19,73],["Quinten Post","C",26,73],["Kris Murray","PF",26,72],["Scotty Pippen Jr.","PG",25,73]]},
"New Orleans Pelicans": { conf: "West", cap: 12.1, roster: [
["Zion Williamson","PF",26,87],["Trey Murphy III","SF",26,83],["Jordan Poole","SG",27,80],["Herbert Jones","SF",28,79],["Dejounte Murray","PG",30,82],["Jeremiah Fears","PG",20,77],["Bennedict Mathurin","SG",24,78],["Yves Missi","C",22,76],["Derik Queen","C",21,76],["Saddiq Bey","SF",27,74],["AJ Johnson","SG",21,72],["Trendon Watford","PF",25,72],["DeAndre Jordan","C",38,68]]}
};
module.exports = { HOOPS_TEAMS };

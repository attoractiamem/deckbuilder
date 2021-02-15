//TO-DO list (Priority order)
//
//-----Minimum stuff-------
//
//Images (Pending on scraper)
//
//-----Extra stuff-------
//
//Deck size limit
//Card tops in decklist (Epand on hover)
//Banlist filtering
//Full stats on graph click
//Card zooming
//Readable data overlay + toggle
//Improve search to O(n)
//Import cardlist from booster generator
//bugs when renaming several decks simultaneously
//bugs when deleting extra deck causing other EDs to not show
//Accessibility stuff

window.onload=function(){

search_expanded=0
settings_expanded=0
overlay=1 //readable text overlay on cards
imageloads=1//image loading. Disabling it saves bandwidth
search_source=0 //0: normal pool, 1: cardlist
//these can probably be optimized out
will_types=["light", "fire", "water", "wind", "dark", "void"]
will_equivs={"light":"{W}", "fire":"{R}", "water":"{U}", "wind":"{G}", "dark":"{B}"}
cost_types=["0", "1", "2", "3", "4", "5", "6", "7"]
targets=["main","side"] //target decks for most cards
cardtarget=""//subdeck where card will go
races=[]//Array of all unique races, populated on data load
sets={}//Dictionary of set names and codes, populated on data load
formats={//Dictionary of formats and sets allowed in them
  "--":[],//empty set to reset formats
  "New Frontiers":[
    "Alice Origin",
    "Alice Origin II",
    "Alice Origin III",
    "Prologue of Attoractia",
    "The Epic of the Dragon Lord",
    "Alice Origin Promos",
    "Alice Origin Starter Decks - Faria/Melgis",
    "SDAO2 - Alice Origin Starter Decks - Valentina/Pricia",
    "Starter Deck GHOST IN THE SHELL SAC_2045",
    "GHOST IN THE SHELL SAC_2045",
  ],
  "Origin":[//All cards
    "Advent of the Demon King",
    "Alice Origin",
    "Alice Origin II",
    "Alice Origin III",
    "Alice Origin Promos",
    "Alice Origin Starter Decks - Faria/Melgis",
    "Ancient Nights",
    "Awakening of the Ancients",
    "Battle for Attoractia",
    "Curse of the Frozen Casket",
    "Echoes of the New World",
    "Faria, the Sacred Queen/Melgis, the Flame King",
    "GHOST IN THE SHELL SAC_2045",
    "Legacy Lost",
    "New Dawn Rises",
    "Prologue of Attoractia",
    "Return of the Dragon Emperor",
    "SDAO2 - Alice Origin Starter Decks - Valentina/Pricia",
    "Starter",
    "Starter - Below the Waves",
    "Starter - Blood of Dragons",
    "Starter - Children of the Night",
    "Starter - Elemental Surge",
    "Starter - Fairy Tale Force",
    "Starter - King of the Mountain",
    "Starter - Malefic Ice",
    "Starter - Rage of R'lyeh",
    "Starter - Swarming Elves",
    "Starter - The Lost Tomes",
    "Starter - Vampiric Hunger",
    "Starter Deck GHOST IN THE SHELL SAC_2045",
    "Starter Deck Valhalla - Darkness",
    "Starter Deck Valhalla - Fire",
    "Starter Deck Valhalla - Light",
    "Starter Deck Valhalla - Water",
    "Starter Deck Valhalla - Wind",
    "The Castle of Heaven and the Two Towers",
    "The Crimson Moon Fairy Tale",
    "The Dawn of Valhalla",
    "The Decisive Battle of Valhalla",
    "The Epic of the Dragon Lord",
    "The Millennia of Ages",
    "The Moon Priestess Returns",
    "The Moonlit Saviour",
    "The Seven Kings of the Land",
    "The Shaft of Light of Valhalla",
    "The Strangers of New Valhalla",
    "The Time-Spinning Witch",
    "The Twilight Wanderer",
    "The War of Valhalla",
    "Vingolf 2 - Valkyria Chronicles",
    "Vingolf 3 - Ruler All Stars",
    "Vingolf series - Engage Series",
    "Winds of the Ominous Moon",
  ]
}

//Search parameters
//will -> [Y,R,B,G,P,V]
//cost -> [0,1,2,3,4,5,6,7]
//textc -> <string>
//types -> [Resonator, chant, addition, ruler, etc]
//sets -> [<set1>, <set2>, etc]
//races -> [<race1>, <race2>, etc]
search_params={
  'will':[0,0,0,0,0,0],
  'cost':[0,0,0,0,0,0,0],
  'types':[],
  'textc':"",
  'races':[],
  'sets':[]
}
carddb=[]//All cards, loaded from database (Shouldn't change)
filteredcards=[]//list of cards after applying filters
search_page=0

//Default deck
deck={
  'deckname':'New deck',
  'ruler':{"name":"--"},
  'main':[],
  'stone':[],
  'side':[]
}

//Populate formats list
Object.keys(formats).forEach(a=>document.getElementById('formatselect').innerHTML+="<option value='"+a+"'>"+a+"</option>")

//Update format list
document.getElementById('formatselect').onchange=function(){
  search_params.sets=formats[this.value]
  drawsearch()
  filtercards()
}

//Overlay option
document.getElementById('overlayoption').onchange=function(){
  overlay=this.value
  drawcards()
}

//Image loading option
document.getElementById('imageoption').onchange=function(){
  search_params.sets=formats[this.value]
  imageloads=this.value
  drawcards()
}

//Download button (download deck as text file)
//This shit is cursed
document.getElementById('dlbutton').onclick=function(){
  var dname=document.getElementById('deckname').innerText+".txt"
  var a=document.createElement('a')
  a.setAttribute('href','data:text/plain;charset=utf-8,'+encodeURIComponent(decktotxt()))
  a.setAttribute('download',dname)
  a.style.display='none'
  document.body.appendChild(a)
  a.click();
  document.body.removeChild(a)
}

//Copy button (Copy to clipboard)
document.getElementById('copybutton').onclick=function(){
  navigator.clipboard.writeText(decktotxt())
}

//Settings menu
document.getElementById('preferences').onclick=function(){
  settings_expanded^=1
  document.getElementById('toolbar').style.height=20+(100*settings_expanded)
  document.getElementById('toolbar_extra').style.height=(80*settings_expanded)
  document.getElementById('toolbar_extra').style.visibility=["collapse","visible"][settings_expanded]

};

//Save button 
document.getElementById('savedeckbutton').onclick=function(){
  var dn=document.getElementById('deckname').innerText
  localStorage.setItem(dn,JSON.stringify(deck))
  var opt=document.createElement('option')
  opt.value=opt.text=dn
  document.getElementById('saveddecks').add(opt)
}

//Load button
document.getElementById('loadbutton').onclick=function(){
  deck=JSON.parse(localStorage.getItem(document.getElementById('saveddecks').value))
  drawdeck()
}

//Delete button
document.getElementById('deletebutton').onclick=function(){
  var dd=document.getElementById('saveddecks')
  localStorage.removeItem(dd.value)
  dd.remove(dd.selectedIndex)
  drawdeck()
}

//Populate stored decks on window load
Object.keys(localStorage).forEach(function(d){
  var opt=document.createElement('option')
  opt.value=opt.text=d
  document.getElementById('saveddecks').add(opt)
})

//Change from card pool to cardlist
// document.getElementById('swapsources').onclick=function(){
//   reset_search()
//   search_source=!search_source
//   if(search_source==1){
//     var html="<button>Import cardlist</button>"
//     document.getElementById('swapsources').innerText="Use card pool"    
//   }
//   else{
//     var html="Format <select><option>Wanderer</option></select>\
//               sets <input type='text' list='setslist' id='setsinput'></input>\
//               Banlist <select><option>None</option></select><br/>\
//               <span id='sresults'></span>"
//     document.getElementById('swapsources').innerText="Use cardlist"      
//   }
//   document.getElementById('sources').innerHTML=html
// }

//Adding searched race
document.getElementById('racesinput').addEventListener('keydown',function(e){
  if(e.key=="Enter"){
    var nrace=document.getElementById('racesinput').value
    if(races.includes(nrace) && !search_params.races.includes(nrace)){
      document.getElementById('rresults').innerHTML+="<span id='raceresult'>"+nrace+"</span>"
      search_params.races.push(nrace)
      document.getElementById('racesinput').value=""
      filtercards()

      //Remove on click
      var allr=document.querySelectorAll('[id=raceresult]')
      for(var i=0;i<allr.length;i++){
        allr[i].onclick=function(){
          search_params.races.splice(search_params.races.indexOf(this.innerHTML),1)
          this.outerHTML=""
          filtercards()
        }
      }
    }
  }
})

//Adding searched set
document.getElementById('setsinput').addEventListener('keydown',function(e){
  if(e.key=="Enter"){
    var nset=document.getElementById('setsinput').value
    if(Object.keys(sets).includes(nset) && !search_params.sets.includes(nset)){
      document.getElementById('sresults').innerHTML+="<div id='setresult'>"+nset+"</div>"
      search_params.sets.push(nset)
      document.getElementById('setsinput').value=""
      filtercards()

      //Remove on click
      var allr=document.querySelectorAll('[id=setresult]')
      for(var i=0;i<allr.length;i++){
        allr[i].onclick=function(){
          search_params.sets.splice(search_params.sets.indexOf(this.innerHTML),1)
          this.outerHTML=""
          filtercards()
        }
      }    
    }
  }
})

//Card type into search params
var typedivs=document.querySelectorAll('[id=cardtype]')
for(var i=0;i<typedivs.length;i++){
  typedivs[i].onclick=function(){
    if(search_params.types.indexOf(this.innerText)==-1){
      search_params.types.push(this.innerText)
      this.style.border='1px solid white'
      this.style.backgroundColor="#CCC"
    }
    else{
      this.style.border='1px solid black'
      this.style.backgroundColor=""
      search_params.types.splice(search_params.types.indexOf(this.innerText),1)
    }
    filtercards()
  }
}

//generates decklist
function decktotxt(){
  var outf=document.getElementById('saveformat').value
  var dtxt=""
  if(outf=="ut"){

  }
  else if(outf=="json"){
    dtxt=JSON.stringify(deck)
  }
  else if(outf=="txt"){
    dtxt+="##"+document.getElementById('deckname').innerText
    dtxt+="\n###Ruler\n"+deck.ruler.name 
    dtxt+="\n###Main deck\n"
    deck.main.forEach(a=>dtxt+=a.amount+"x "+a.name+"\n")
    var i=1
    while(deck["extra"+i]!=undefined){
      dtxt+="###"+deck["extra"+i+"name"]+"\n"
      deck["extra"+i].forEach(a=>dtxt+=a.amount+"x "+a.name+"\n")
      i+=1
    }
    dtxt+="###Stone deck\n"
    deck.stone.forEach(a=>dtxt+=a.amount+"x "+a.name+"\n")
    dtxt+="###Sideboard\n"
    deck.side.forEach(a=>dtxt+=a.amount+"x "+a.name+"\n")
  }

  return dtxt
}

//Draw deck on deck zone
function drawdeck()
{
  var html="<center>"
  html+="<b id='deckname'>"+deck.deckname+"</b><br/>"

  html+="<canvas id='graph'></canvas><br/><br/>" //to-do

  html+="<span class='decksection' id='rulerdeck'>Ruler</span><br/>"+deck.ruler.name+"<br/>"

  html+="<br/><span class='decksection' id='maindeck'>Main deck</span><br/>"
  for(var i=0;i<deck.main.length;i++){
    html+=deck.main[i].amount+"x "+deck.main[i].name+"<br/>"
  }

  html+="<br/><span class='decksection' id='stonedeck'>Stone deck</span><br/>"
  for(var i=0;i<deck.stone.length;i++){
    html+=deck.stone[i].amount+"x "+deck.stone[i].name+"<br/>"
  }

  var i=1
  while (deck["extra"+i]!=undefined){
    html+="<br/><span class='decksection' id='extra"+i+"'>"+deck["extra"+i+"name"]+"</span><br/>"
    for(var j=0;j<deck["extra"+i].length;j++){
      html+=deck["extra"+i][j].amount+"x "+deck["extra"+i][j].name+"<br/>"
    }
    i+=1
  }
  html+="<br/><button id='addextra'>Add extra deck</button><br/>"

  html+="<br/><span class='decksection' id='sideboard'>Sideboard</span><br/>"
  for(var i=0;i<deck.side.length;i++){
    html+=deck.side[i].amount+"x "+deck.side[i].name+"<br/>"
  }

  document.getElementById('deck').innerHTML=html

  //Edit section target colouring
  if(cardtarget=="main"){
    document.getElementById('maindeck').style.border="1px solid white"
  }
  else if(cardtarget=="side"){
    document.getElementById('sideboard').style.border="1px solid white"
  }
  else if(cardtarget=="stone"){
    document.getElementById('stonedeck').style.border="1px solid white"
  }
  else if(cardtarget=="ruler"){
    document.getElementById('rulerdeck').style.border="1px solid white"
  }
  else if(cardtarget.includes("extra")){
    document.getElementById(cardtarget).style.border="1px solid white"
  }

  //Deck name listener
  document.getElementById('deckname').onclick=function(){
    document.getElementById('deckname').onclick=''
    document.getElementById('deckname').innerHTML="<input type='text' id='namebox'></input>"
    document.getElementById('namebox').value=deck.deckname
    document.getElementById('namebox').addEventListener('keydown',function(e){
      if(e.key=="Enter"){
        deck.deckname=document.getElementById('namebox').value
        drawdeck()
      }
    })
  }  

  //Ruler click listener
  document.getElementById('rulerdeck').onclick=function(){
    document.getElementById('rulerdeck').onclick=''
    document.getElementById('rulerdeck').innerHTML+="<button id='clear'>Clear</button>"
    document.getElementById('clear').onclick=function(){
      deck.ruler={"name":"--"}
      drawdeck()
    }
  }

  //Main deck click listener
  document.getElementById('maindeck').onclick=function(){
    document.getElementById('maindeck').onclick=''
    document.getElementById('maindeck').innerHTML+="<button id='clear'>Clear</button>"
    document.getElementById('clear').onclick=function(){
      deck.main=[]
      drawdeck()
    }
  }

  //Stone deck click listener
  document.getElementById('stonedeck').onclick=function(){
    document.getElementById('stonedeck').onclick=''
    document.getElementById('stonedeck').innerHTML+="<button id='clear'>Clear</button>"
    document.getElementById('clear').onclick=function(){
      deck.stone=[]
      drawdeck()
    }
  }

  //Extra deck name click listeners
  var i=1
  while (deck["extra"+i]!=undefined){
    document.getElementById("extra"+i).onclick=function(){
      var ednum=this.id[5]
      this.onclick=''
      this.innerHTML="<input type='text' id='namebox'><br/><button id='clear'>Clear</button><button id='delete'>Delete</button></input>"
      document.getElementById('namebox').value=deck["extra"+ednum+"name"]
      document.getElementById("namebox").addEventListener('keydown',function(e){
        if(e.key=="Enter"){
          var ednum=this.parentNode.id[5]
          deck["extra"+ednum+"name"]=document.getElementById('namebox').value
          drawdeck()
        }
      })
      document.getElementById('clear').onclick=function(){
        var ednum=this.parentNode.id[5]
        deck["extra"+ednum]=[]
        drawdeck()
      }
      document.getElementById('delete').onclick=function(){
        var ednum=this.parentNode.id[5]
        delete deck["extra"+ednum]
        delete deck["extra"+ednum+"name"]
        targets.splice(ednum,1)
        drawdeck()
      }
    }
    i+=1
  }

  //Add extra deck button listener
  document.getElementById('addextra').onclick = function() {
    var i=1
    while (deck["extra"+i]!=undefined){i+=1}
    deck["extra"+i]=[]
    deck["extra"+i+"name"]="Extra deck "+i
    //Add extra deck to target list
    targets.splice(i,0,"extra"+i)
    drawdeck()
  }

  //Sideboard click listener
  document.getElementById('sideboard').onclick=function(){
    document.getElementById('sideboard').onclick=''
    document.getElementById('sideboard').innerHTML+="<button id='clear'>Clear</button>"
    document.getElementById('clear').onclick=function(){
      deck.side=[]
      drawdeck()
    }
  }

  drawgraph()
}

//Draw card area
function drawcards()
{
  var html=""
  var cols=4
  //calculate columns
  var cardwidth=(document.getElementById('cards').offsetWidth/cols)
  while(cardwidth<125 || cardwidth>175){
    if(cardwidth<125){cols-=1}
    else{cols+=1}
    cardwidth=(document.getElementById('cards').offsetWidth/cols)
  }
  //get visible size of cards div (https://stackoverflow.com/questions/12868287/get-height-of-non-overflowed-portion-of-div)
  //Doesn't even work but it's close enough
  var offs=0
  var n=document.getElementById('cards')
  while (n.offsetParent && n.offsetParent.id != "wrapper"){
    offs+=n.offsetTop;
    n=n.offsetParent
  }
  var height=n.offsetHeight-offs

  //calculate rows
  var rows=Math.floor(height/((cardwidth+20)*1.396))

  tcards=cols*rows

  for(var i=0;i<tcards;i++){
    var index=(search_page*tcards)+i
    try{
      html+="<div class='card' id='"+index+"' "
      if(imageloads==1){html+="style='background-image:url(./img/card-Back.png);'"}
      html+="><br/>"
      if(overlay==1){html+="<center>"+filteredcards[index].cost+"<br/>"+filteredcards[index].name+"<br/>"}
      html+="</div>"
    }
    catch{}
  }

  //add page navigation buttons
  html+="<div id='arrowprev'> <<<< <br/> <<<< </div>"
  html+="<div id='arrownext'> >>>> <br/> >>>> </div>"

  document.getElementById('cards').innerHTML=html

  //add listeners 
  var dcards=document.getElementsByClassName('card')
  for (var i=0;i<dcards.length;i++){
    //mouse wheel to choose target
    dcards[i].onwheel=function(e){
      var tidx=targets.indexOf(cardtarget)
      if(e.deltaY>0 && tidx!=-1){
        cardtarget=targets[(tidx+targets.length+1)%targets.length]
      }
      else if(e.deltaY<0 && tidx!=-1){
        cardtarget=targets[(tidx+targets.length-1)%targets.length]
      }
      drawdeck()
    }

    //Mouseover (target deck highlight)
    dcards[i].onmouseover=function(){
      var card=filteredcards[this.id]
      var ctype=card.type
      if(["Resonator","Chant","Addition","Regalia"].some(z=>card.type.includes(z))){
        document.getElementById('maindeck').style.border="1px solid white"
        cardtarget="main"
      }
      if(ctype=="Ruler" || ctype=="J-Ruler"){
        document.getElementById('rulerdeck').style.border="1px solid white"
        cardtarget="ruler"
      }
      if(ctype.indexOf("Stone")!=-1){
        document.getElementById('stonedeck').style.border="1px solid white"
        cardtarget="stone"
      }
    }
    dcards[i].onmouseout=function(){
      var sects=document.getElementsByClassName('decksection')
      for(var i=0;i<sects.length;i++){
        sects[i].style.border='1px solid black'
        cardtarget=""
      }
    }

    //click to add to deck
    dcards[i].onclick=function(){
      var imgurl=this.style.backgroundImage
      var imgname=imgurl.split('"')[1]
      var index=this.id
      if(cardtarget!="ruler"){
        var already=false
        for(var i=0;i<deck[cardtarget].length;i++){
          if(deck[cardtarget][i].id==filteredcards[index].id){
            already=true
            if(deck[cardtarget][i].amount<4){
              deck[cardtarget][i].amount+=1
            }
          }
        }
        if(!already){
          //copy object to prevent extra deck amount
          deck[cardtarget].push(JSON.parse(JSON.stringify(filteredcards[index])))
          deck[cardtarget][deck[cardtarget].length-1].amount=1
        }
      }
      else{
        deck.ruler=filteredcards[index]
      }
      
      drawdeck()
    }

    //use loop to fix width
    dcards[i].style.width=cardwidth
    dcards[i].style.height=cardwidth*1.41

  }

  var maxpages=Math.floor((filteredcards.length-1)/tcards)
  document.getElementById('arrowprev').onclick=function(){
    search_page-=1
    if(search_page<0){search_page=0}
    console.log("Page "+search_page+"/"+maxpages)
    drawcards()
  }
  document.getElementById('arrownext').onclick=function(){
    search_page+=1
    if(search_page>maxpages){search_page=maxpages}
    console.log("Page "+search_page+"/"+maxpages)
    drawcards()
  }
}

//Draw updated search parameters
function drawsearch(){

  var html=""
  html+="<input type='text' id='searchbox' placeholder='"+search_params.textc+"'></input>"
  for(var i=0;i<will_types.length;i++){
    html+="<img width='30px' id='icon' src='./icons/will_"+will_types[i]+".png'></img>"
  }
  for(var i=0;i<8;i++){
    html+="<img width='30px' id='icon' src='./icons/cost_"+i+".png'></img>"
  }
  html+="<img width='30px' id='searchopts' src='./icons/misc_more.png'></img>"
  html+="<img width='30px' id='resetopts' src='./icons/misc_reset.png'></img>"

  document.getElementById('filters').innerHTML=html

  //Modify icon transparency
  var ics=document.querySelectorAll('[id=icon]')
  var tps=search_params.will.concat(search_params.cost)
  for(var i=0;i<ics.length;i++){
    ics[i].style.opacity=0.4+(0.6*tps[i])
  }

  //add listeners

  //Icon attribute/cost toggles
  for(var i=0;i<ics.length;i++){
    ics[i].onclick=function(){
      var type=this.src.split("_")[1].split(".")[0]
      if(will_types.indexOf(type)!=-1){
        search_params.will[will_types.indexOf(type)]^=1
        if(search_params.will[will_types.indexOf(type)]==1 && type!="void")
        search_params.will[5]=0
      }
      else{
        search_params.cost[cost_types.indexOf(type)]^=1
      }
      //If clicked on void, reset everything else
      if(search_params.will[5]==1){
        search_params.will=[0,0,0,0,0,1]
      }
      drawsearch()
      filtercards()
      drawcards()
    }
  }

  //Text search
  document.getElementById('searchbox').addEventListener('keydown',function(e){
    if(e.key=="Enter"){
      search_params.textc=document.getElementById('searchbox').value.toLowerCase()
      filtercards()
    }
  })

  //Advanced search options menu
  document.getElementById('searchopts').onclick = function() {
    search_expanded=!search_expanded
    if(search_expanded==1){
      document.getElementById('filters_extra').style.visibility="visible"
      document.getElementById('filters_extra').style.height=150
    }
    else{
      document.getElementById('filters_extra').style.visibility="collapse"
      document.getElementById('filters_extra').style.height=0
    }
  }

  //reset search
  document.getElementById('resetopts').onclick=function(){
    reset_search()
  }
}

//initial card load
function loadcards(){
  //load card list
  cards=cards.fow.clusters
  for(var i=0;i<cards.length;i++){
    for(var j=0;j<cards[i].sets.length;j++){
      var setcode=cards[i].sets[j].code
      var setname=cards[i].sets[j].name
      sets[setname]=setcode
      document.getElementById('setslist').innerHTML+="<option value='"+setname+"'/>"
      carddb=carddb.concat(cards[i].sets[j].cards)
    }
  }
  //populate races array
  races=[]
  for(var i=0;i<carddb.length;i++){
    for(j=0;j<carddb[i].race.length;j++){
      var race=carddb[i].race[j]
      if(!races.includes(race) && race.length>0){
        races.push(race)
        document.getElementById('raceslist').innerHTML+="<option value='"+race+"'/>"
      }
    }
  }
}

function reset_search(){
  search_params={
    'will':[0,0,0,0,0,0],
    'cost':[0,0,0,0,0,0,0],
    'types':[],
    'races':[],
    'textc':"",
    'sets':{}
  }
  var typedivs=document.querySelectorAll('[id=cardtype]')
  for(var i=0;i<typedivs.length;i++){
    typedivs[i].style.backgroundColor="gray"
    typedivs[i].style.border="1px solid black"
  }
  document.getElementById('formatselect').value="--"
  search_page=0
  filtercards()
  drawsearch()
  drawcards()
}

function filtercards(){

  //Filter by set
  setfcards=[]
  if(search_params.sets.length>0){
    for(var i=0;i<carddb.length;i++){
      for(j=0;j<search_params.sets.length;j++){
        if(carddb[i].id.split('-')[0]==sets[search_params.sets[j]]){
          setfcards.push(carddb[i])
          break
        }
      }
    }
  }
  else{setfcards=carddb}

  //Filter by attribute (will cost colours)
  //Attributes in DB are {W}{R}{U}{G}{B}
  var willfcards=[]
  var swills=[]
  for(var i=0;i<search_params.will.length-1;i++){
    if(search_params.will[i]==1){
      swills.push(will_equivs[will_types[i]])
    }
  }
  //Search if void will is off
  if(search_params.will[5]==0 && swills.length>0){
    if(swills.length>0){
      for(var i=0;i<setfcards.length;i++){
        if(swills.every(z=>setfcards[i].cost.includes(z))){
          willfcards.push(setfcards[i])
        }
      }
    }
  }
  //Search if void will is on
  else if(search_params.will[5]==1){
    for(var i=0;i<setfcards.length;i++){
      //one bracket and at least one number
      if((setfcards[i].cost.match(/\{/g)||[]).length==1 && (setfcards[i].cost.match(/\d/g)||[]).length>0){
        willfcards.push(setfcards[i])
      }
    }
  }
  else {willfcards=setfcards}

  //Filter by cost
  var costfcards=[]
  var scosts=[]
  if(search_params.cost.some(it=>it!=0)){
    for(var i=0;i<search_params.cost.length;i++){
      if(search_params.cost[i]==1){
        scosts.push(i)
      }
    }
  }
  if(scosts.length>0){
    for(var i=0;i<willfcards.length;i++){
      var ccost=parseInt(willfcards[i].cost.replaceAll(/[^\d]/g, '') || 1)+(willfcards[i].cost.match(/\}/g)||[]).length-1
      if(scosts.indexOf(ccost)!=-1){
        costfcards.push(willfcards[i])
      }
      else if(scosts.indexOf(7)!=-1 && ccost>7){
        costfcards.push(willfcards[i])
      }
    }
  }
  else{costfcards=willfcards}

  //Filter by text
  var textfcards=[]
  if(search_params.textc.length>0){
    for(var i=0;i<costfcards.length;i++){
      var txtcheck=false
      for(j=0;j<costfcards[i].abilities.length;j++){
        if(costfcards[i].abilities[j].toLowerCase().includes(search_params.textc)){
          txtcheck=true
        }
      }
      if(costfcards[i].name.toLowerCase().includes(search_params.textc) || txtcheck){
        textfcards.push(costfcards[i])
      }
    }
  }
  else{textfcards=costfcards}

  //Filter by type
  typefcards=[]
  if(search_params.types.length>0){
    for(var i=0;i<textfcards.length;i++){
      for(var j=0;j<search_params.types.length;j++){
        if(textfcards[i].type.indexOf(search_params.types[j])!=-1){
          typefcards.push(textfcards[i])
          break
        }
      }
    }
  }
  else{typefcards=textfcards}

  //Filter by race
  racefcards=[]
  if(search_params.races.length>0){
    for(var i=0;i<typefcards.length;i++){
      for(var j=0;j<search_params.races.length;j++){
        if(typefcards[i].race.includes(search_params.races[j])){
          racefcards.push(typefcards[i])
          break
        }
      }
    }
  }
  else{racefcards=typefcards}

  filteredcards=racefcards
  search_page=0 //reset page
  drawcards()
  console.log("Total cards filtered: "+filteredcards.length)
}

function drawgraph(){
  var c=document.getElementById('graph')
  c.style.background="#000"
  var ctx=c.getContext("2d")
  var cwidth=document.getElementById('deck').offsetWidth-40
  ctx.canvas.width=cwidth
  ctx.canvas.height=60
  ctx.clearRect(0,0,cwidth,60)
  ctx.fillStyle="white"

  var costs=[]
  for(var i=0;i<8;i++){
    costs.push({'Resonator':0, 'Chant':0, 'Addition':0, 'other':0})
  }
  var totals=new Array(8).fill(0)//Lazy but whatever

  //Process all cards on main deck
  deck.main.forEach(function(a){
    var ccost=parseInt(a.cost.replaceAll(/[^\d]/g, '') || 1)+(a.cost.match(/\}/g)||[]).length-1
    if(a.type.includes("Resonator")){
      costs[ccost].Resonator+=a.amount
    }
    else if(a.type.includes("Chant")){
      costs[ccost].Chant+=a.amount
    }
    else if(a.type.includes("Addition")){
      costs[ccost].Addition+=a.amount
    }
    else{
      costs[ccost].other+=a.amount
    }
    totals[ccost]+=a.amount
  })

  //calculate height per unit
  var pixpcard=30/Math.max(...totals)
  console.log(totals)
  console.log(pixpcard)

  for(var i=0;i<8;i++){

    ctx.strokeStyle="white"
    ctx.lineWidth=1
    ctx.beginPath()
    var xpos=15+((cwidth-20)/8)*i
    ctx.fillText(i,xpos,55)
    //horizontal lines
    ctx.beginPath()
    ctx.moveTo(xpos,43.5)
    ctx.lineTo(xpos+5,43.5)
    ctx.stroke()
    
    //draw vertical lines
    xpos+=2.5
    ctx.lineWidth=4

    var ny=43.5
    ctx.strokeStyle="green"
    ctx.beginPath()
    ctx.moveTo(xpos,ny)
    ny-=pixpcard*costs[i].Resonator
    ctx.lineTo(xpos,ny)
    ctx.stroke()
    
    ctx.strokeStyle="blue"
    ctx.beginPath()
    ctx.moveTo(xpos,ny)
    ny-=pixpcard*costs[i].Chant
    ctx.lineTo(xpos,ny)
    ctx.stroke()
    
    ctx.strokeStyle="yellow"
    ctx.beginPath()
    ctx.moveTo(xpos,ny)
    ny-=pixpcard*costs[i].Addition
    ctx.lineTo(xpos,ny)
    ctx.stroke()
    
    ctx.strokeStyle="red"
    ctx.beginPath()
    ctx.moveTo(xpos,ny)
    ny-=pixpcard*costs[i].other
    ctx.lineTo(xpos,ny)
    ctx.stroke()
  }
}

//card area redraw on resize
window.addEventListener('resize',function(e){
  drawdeck()
  drawcards()
})

//Populate page for the first time
loadcards()
filtercards()
drawcards()
drawdeck()
drawsearch()
}
keyboard = document.getElementById("keyb");
keysPressed = [];
var audioContext;
var freq;
var bees;
var wave;
var waveSet = false;

//#region key arrays
keys = ["1234567890", "QWERTYUIOP", "ASDFGHJKL", "\\ZXCVBNM,."];
names = { // https://www.w3.org/TR/uievents-code/#key-alphanumeric-writing-system
	"\\": "IntlBackslash",
	",":  "Comma",
	".":  "Period",
}
offsets = [0, 0.5, 0.75, 0.25];
keycodes = keys.map(row => Array.from(row).map(
	char => (char.charCodeAt(0) >= 65 && char.charCodeAt(0) <= 90) ? "Key" + char :
	        (char.charCodeAt(0) >= 48 && char.charCodeAt(0) <= 59) ? "Digit" + char :
	        names[char]));
//#endregion

//#region edoids
EDO = 12
toprow = [-1,1,2,-1,4,5,6].map(x=>[0,x])
bottomrow = [0,1,2,3,4,5,6].map(x=>[1,x])
tonekeys = bottomrow.concat(toprow).sort((a, b) => a[1]+0.5*a[0] > b[1]+0.5*b[0]?1:-1)
	.filter(x => x[1] != -1).map(x=>x.toString())
if (tonekeys.length != EDO) {
	throw Error("tuning does not match keyboard layout");
}
//#endregion

function coordToOct(coord) {
	[row, col] = coord.split(",").map(x => parseInt(x));
	if (!tonekeys.includes([row%2,col%7].toString())) { //TODO: variable width, maybe height of layout
		return  [-1, ((3-row)-(3-row)%2)/2 + (col-col%7)/7];
	} else {
		return [tonekeys.indexOf([row%2,col%7].toString()), ((3-row)-(3-row)%2)/2 + (col-col%7)/7]
	}
}

function codesToCoords_str(codes) {
	return codes.map( code => 
		(keycodes.map(row => [keycodes.indexOf(row), row.indexOf(code)] )
		.find( x => x[1] != -1 ) || [-1,-1]).toString())
}

function codesToCoords(codes) {
	return codes.map( code => 
		(keycodes.map(row => [keycodes.indexOf(row), row.indexOf(code)] )
		.find( x => x[1] != -1 ) || [-1,-1]))
}

function genSVG(){
	svgboard = ""
	svgtext =""
	a = codesToCoords_str(keysPressed)
	
	for (i = 0; i < keys.length; i++){
		for (j = 0; j < keys[i].length; j++){
			x = 10 + 50*(j+offsets[i]);
			y = 10 + 50*i;
			pressed = a.includes([i,j].toString());
			inactive = coordToOct([i,j].toString())[0] == -1
			svgboard += `<rect width="40" height="40" stroke-width="2" fill="${inactive ? 'white' : pressed ? '#f5d4ee' : 'white'}" stroke="${inactive ? 'lightgray' : pressed ? '#6c1d45' : 'silver'}" x="${x}" y="${y}"/>`
			svgtext += `<text x="${x+20}" y="${y+20}" font-family="Fairfax HD" fill="${inactive ? 'lightgray' : 'black'}" font-size="20px" text-anchor="middle" dominant-baseline="central">${keys[i][j]}</text>`
		}
	}
	keyboard.innerHTML = svgboard + svgtext
}

function audio() {
	a = codesToCoords(keysPressed).map(x => (x[0]==3 ? [3,x[1]-1].toString() : x.toString()))
	if (a[0]) {
		if (a.includes("3,-1") && !waveSet) {
			wave.setValueAtTime(wave.value+1, audioContext.currentTime)
			waveSet = true
		}
		if (!a.includes("3,-1")) {
			waveSet = false
		}
		freq.setValueAtTime(coordtoFreq(a[a.length -1]), audioContext.currentTime);
	} else {
		freq.setValueAtTime(0, audioContext.currentTime);
	}
}

function coordtoFreq(coord) {
	[place, oct] = coordToOct(coord)
	if (place == -1) { 
		return 0;
	} else {
		console.log(place)
		return Math.pow(2, (place+3)/EDO) * (1 << oct) * 110
	}
}

document.addEventListener("keydown", async (e) => {
	if (!keysPressed.includes(e.code)) {
		keysPressed.push(e.code);
	}
	if (!bees) {await setup();}
	genSVG();
	audio();
})
document.addEventListener("keyup", (e) => {
	keysPressed.splice(keysPressed.indexOf(e.code),1)
	genSVG();
	audio();
})
document.addEventListener("blur", (e) => {
	keysPressed = [];
	genSVG();
	audio();
});

genSVG();

///////////////////////////////////////////


async function setup() {
	audioContext = new AudioContext();
	await audioContext.audioWorklet.addModule("mjau.js");
	emmaNode = new AudioWorkletNode(
		audioContext,
		"emmasynth"
	);
	emmaNode.connect(audioContext.destination);
	bees = true;

	freq = emmaNode.parameters.get("freq");
	freq.setValueAtTime(110, audioContext.currentTime);
	wave = emmaNode.parameters.get("wave");

}
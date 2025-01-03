keyboard = document.getElementById("keyb");
//scopehtml = document.getElementById("scope");
keysPressed = [];
var audioContext;
var bees, waveSet;
var freqs, waves;
var wavetype = 0;
var volume = 50;

const OSC_COUNT = 8
oscInUse = Array(OSC_COUNT).fill(false)
b = Array(20).fill(0)
//scope = Array(OSC_COUNT).fill([...b])

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

layouts = {
	2: [[1,1]],
	3: [[1,1],[0,1]],
	5: [[1,1],[1,1],[0,1]],
	6: [[1,1],[1,1],[1,1]],
	7: [[1,1],[1,1],[1,1],[0,1]],
	9: [[1,1],[0,1],[1,1],[0,1,],[1,1],[0,1]],
	11: [[1,1],[1,1],[0,1],[1,1],[0,1],[1,1],[0,1]],
	12: [[1,1],[1,1],[0,1],[1,1],[1,1],[1,1],[0,1]],
	13: [[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[0,1]],
	16: [[1,1],[1,1],[1,1],[0,1],[1,1],[1,1],[1,1],[1,1],[0,1]],
	17: [[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[0,1]],
}
edosAvailable = Object.keys(layouts).map(x => parseInt(x))

// set up EDO
EDO = 12
var toprow, bottomrow, tonekeys;
function layout(edo) {
	EDO = edo
	toprow    = new Array(layouts[EDO].length).fill(0).map((_,i)=>[0,layouts[EDO][i][0]?(i+1):-1])
	bottomrow = new Array(layouts[EDO].length).fill(0).map((_,i)=>[1,layouts[EDO][i][1]?i:-1])
	tonekeys  = bottomrow.concat(toprow).sort((a, b) => a[1]+0.5*a[0] > b[1]+0.5*b[0]?1:-1)
		.filter(x => x[1] != -1).map(x=>[x[0],x[1]%layouts[EDO].length].toString())
	console.log(tonekeys)
	if (tonekeys.length != EDO) {
		throw Error("tuning does not match keyboard layout");
	}
}

function special(code) {
	return ((new Set("↓↑∓±ʌ")).intersection(new Set(code))).size != 0
}

function coordToOct(coord) {
	[row, col] = coord.split(",").map(x => parseInt(x));
	lw = layouts[EDO].length // layout width
	if (!tonekeys.includes([row%2,col%lw].toString())) { //TODO: variable height of layout? maybe?
		return  [-1, ((3-row)-(3-row)%2)/2 + (col-col%lw)/lw];
	} else {
		return [tonekeys.indexOf([row%2,col%lw].toString()), ((3-row)-(3-row)%2)/2 + (col-col%lw)/lw - (row%2==0&&col%lw==0?1:0)]
		//return [tonekeys.indexOf([row%2,col%lw].toString()) + ((3-row)-(3-row)%2)/4, (col-col%lw)/lw]
		//// :?????what does this mean past emma
	}
}

function codesToCoords(codes) {
	return codes.map( code => 
		(keycodes.map(row => [keycodes.indexOf(row), row.indexOf(code)] )
		.find( x => x[1] != -1 ) || (special(code) ? code : [-1,-1])))
}

function coordToFreq(coord) {
	[place, oct] = coordToOct(coord)
	if (place == -1) { 
		return 0;
	} else {
		return Math.pow(2, (place+3)/EDO + oct) * 110
	}
}

function genSVG(){
	svgboard = ""
	svgtext = ""
	svgind = ""
	svgcontrols = ""
	a = codesToCoords(keysPressed).map(x => x.toString())
	
	for (i = 0; i < keys.length; i++){
		for (j = 0; j < keys[i].length; j++){
			x = 10 + 50*(j+offsets[i]);
			y = 10 + 50*i;
			pressed = a.includes([i,j].toString());
			inactive = coordToOct([i,j].toString())[0] == -1
			cnote = coordToOct([i,i==3?j-1:j].toString())[0] == 0
			fillcol = inactive ? 'white' : pressed ? '#f5d4ee' : 'white'
			strokecol = inactive ? 'lightgray' : pressed ? '#6c1d45' : cnote ? 'gray' : 'silver'
			svgboard += `<rect width="40" height="40" stroke-width="2" fill="${fillcol}" stroke="${strokecol}" x="${x}" y="${y}"/>`
			svgtext += `<text x="${x+20}" y="${y+20}" font-family="Fairfax HD" fill="${inactive ? 'lightgray' : 'black'}" font-size="20px" text-anchor="middle" dominant-baseline="central">${keys[i][j]}</text>`
		}
	}
	for (i = 0; i < OSC_COUNT; i++) {
		playing = oscInUse[i] != false
		svgind += `<rect x="550" y="${10+i*25}" width="15" height="15" fill="${playing ? '#cd96cd' : 'lightgray'}" stroke="${playing ? '#6c1d45' : 'silver'}" stroke-width="2"/>`
	}

	//#region volume controls
	if (bees) {
		volume = volumes[0].value;
	}
		svgcontrols += `<path stroke="silver" stroke-width="2" d="M 590,17.5  L 730, 17.5"/>`
		svgcontrols += `<rect width="10" height="15" fill="${a.some(x => x.includes("ʌ")) ? '#f5d4ee' : 'white'}" stroke="${a.some(x => x.includes("ʌ")) ? '#6c1d45' : 'silver'}" stroke-width="2" x="${585 + volume*1.4}" y="10"/>`
		svgcontrols += `<text x="660" y="42.5" font-family="Fairfax HD" fill="black" font-size="20px" text-anchor="middle" dominant-baseline="central">${volume == 0 ? "&lt;MUTED&gt;" : "VOLUME"}</text>`
	//#endregion

	//#region wave type controls
	if (bees) {
		wavetype = waves[0].value;
	};
	svgcontrols += `<rect width="20" height="40" stroke-width="2" fill="${a.includes("∓") ? '#f5d4ee' : 'white'}" stroke="${a.includes("∓") ? '#6c1d45' : 'silver'}" x="590" y="60"/> <text x="600" y="80" font-family="Fairfax HD" fill="black" font-size="20px" text-anchor="middle" dominant-baseline="central">&lt;</text>`
	svgcontrols += `<rect width="20" height="40" stroke-width="2" fill="${a.includes("±") ? '#f5d4ee' : 'white'}" stroke="${a.includes("±") ? '#6c1d45' : 'silver'}" x="710" y="60"/> <text x="720" y="80" font-family="Fairfax HD" fill="black" font-size="20px" text-anchor="middle" dominant-baseline="central">&gt;</text>`
	svgcontrols += `<text x="660" y="117.5" font-family="Fairfax HD" fill="black" font-size="20px" text-anchor="middle" dominant-baseline="central">WAVE</text>`

	svgcontrols += `<rect width="80" height="40" stroke-width="2" fill="white" stroke="silver" x="620" y="60"/>`
	svgcontrols += `<clipPath id="wavedisplay"><rect x="621" y="61" width="78" height="38"/></clipPath>`
	wavepaths = [
		`<path fill="none" stroke="${wavetype % 3 == 0 ? '#6c1d45' : 'silver'}" stroke-width="2" d="M 620,92.5 l 40,-25 v 25 l 40,-25" clip-path="url(#wavedisplay)" stroke-linejoin="bevel"/>`, //saw
		`<path fill="none" stroke="${wavetype % 3 == 1 ? '#6c1d45' : 'silver'}" stroke-width="2" d="M 620,92.5 h 20 v -25 h 20 v 25 h 20 v -25 h 20" clip-path="url(#wavedisplay)"/>`, // square
		`<path fill="none" stroke="${wavetype % 3 == 2 ? '#6c1d45' : 'silver'}" stroke-width="2" d="M 610,92.5 c 7.268 0, 12.732 -25, 20 -25 s 12.732 25, 20 25 s 12.732 -25, 20 -25 s 12.732 25, 20 25 s 12.732 -25, 20 -25" clip-path="url(#wavedisplay)"/>` // sine : http://dmitry.baranovskiy.com/sine.html
	]
	svgcontrols += wavepaths[(wavetype+1) % 3];
	svgcontrols += wavepaths[(wavetype+2) % 3];
	svgcontrols += wavepaths[wavetype % 3].replace('"2"','"6"').replace("#6c1d45", "white");
	svgcontrols += wavepaths[wavetype % 3].replace("bevel", "miter"); // the active wave will be drawn on top
	//#endregion

	//#region tuning controls
	svgcontrols += `<rect width="20" height="40" stroke-width="2" fill="${(edosAvailable.indexOf(EDO) == 0) ? 'white' : a.includes("↓") ? '#f5d4ee' : 'white'}" stroke="${(edosAvailable.indexOf(EDO) == 0) ? 'lightgray' : a.includes("↓") ? '#6c1d45' : 'silver'}" x="590" y="135"/> <text x="600" y="155" font-family="Fairfax HD" fill="${(edosAvailable.indexOf(EDO) == 0) ? 'lightgray' : 'black'}" font-size="20px" text-anchor="middle" dominant-baseline="central">&lt;</text>`
	svgcontrols += `<rect width="20" height="40" stroke-width="2" fill="${(edosAvailable.indexOf(EDO) + 1 == edosAvailable.length) ? 'white' : a.includes("↑") ? '#f5d4ee' : 'white'}" stroke="${(edosAvailable.indexOf(EDO) + 1 == edosAvailable.length) ? 'lightgray' : a.includes("↑") ? '#6c1d45' : 'silver'}" x="710" y="135"/> <text x="720" y="155" font-family="Fairfax HD" fill="${(edosAvailable.indexOf(EDO) + 1 == edosAvailable.length) ? 'lightgray' : 'black'}" font-size="20px" text-anchor="middle" dominant-baseline="central">&gt;</text>`
	
	svgcontrols += `<rect width="80" height="40" stroke-width="2" fill="white" stroke="silver" x="620" y="135"/>`
	svgcontrols += `<text x="660" y="155" font-family="Fairfax HD" fill="lightgray" font-size="40px" text-anchor="middle" dominant-baseline="central">${String.fromCodePoint(..."88".split("").map(x => x.charCodeAt(0)+129984))}</text>'<text x="660" y="155" font-family="Fairfax HD" fill="#6c1d45" font-size="40px" text-anchor="middle" dominant-baseline="central">${String.fromCodePoint(...EDO.toString().padStart(2, "0").split("").map(x => x.charCodeAt(0)+129984))}</text>`
	svgcontrols += `<text x="660" y="192.5" font-family="Fairfax HD" fill="black" font-size="20px" text-anchor="middle" dominant-baseline="central">TUNING</text>`
	//#endregion

	keyboard.innerHTML = svgboard + svgtext + svgind + svgcontrols
}

function genScope() {
	svgscope += "<polyline fill='none' stroke-width='2' stroke='#6c1d45' points='"
	for (i = 0; i < b.length; i++) {
		svgscope += i*20;
		svgscope += ",";
		svgscope += 100 + 50*scope.map(x => x[i]).reduce((x,y)=>x+y);
		console.log(100 + 50*scope.map(x => x[i]).reduce((x,y)=>x+y))
		svgscope += " ";
	}
	svgscope += "' />";
	scopehtml.innerHTML = svgscope;
}

function audio() {
	a = codesToCoords(keysPressed).map(x => (x[0]==3 ? [3,x[1]-1].toString() : x.toString()))
	if ((a.includes("3,-1") || a.includes("∓") || a.includes("±")) && !waveSet) {
		console.log("setting wave type to", ["saw","square","sine"][(waves[1].value+(a.includes("∓") ? 2 : 1) % 3 + 3) % 3]) // mod of negatives is bees
		for (i=0;i<OSC_COUNT;i++) {
			waves[i].setValueAtTime(waves[i].value+(a.includes("∓") ? 2 : 1), audioContext.currentTime)
		}
		waveSet = true
	}
	if (!a.includes("3,-1") && !a.includes("∓") && !a.includes("±")) {
		waveSet = false
	}

	if (a.some(x => x.includes("ʌ"))) {
		vol = parseInt(a.filter(x => x.match(/ʌ(\d+)/))[0].substring(1))
		console.log("setting volume to", vol)
		for (i=0;i<OSC_COUNT;i++) {
			volumes[i].setValueAtTime(vol, audioContext.currentTime)
		}
	}

	for (value of oscInUse) {
		if (value && !a.includes(value)) {
			oscN = oscInUse.indexOf(value);
			freqs[oscN].setValueAtTime(0, audioContext.currentTime);
			oscInUse[oscN] = false;
		}
	}
	for (coord of a) {
		if (!oscInUse.includes(coord) && coordToFreq(coord) != 0 && oscInUse.includes(false)) {
			oscN = oscInUse.indexOf(false);
			freqs[oscN].setValueAtTime(coordToFreq(coord), audioContext.currentTime);
			oscInUse[oscN] = coord;
		}
	}
}


document.addEventListener("keydown", async (e) => {
	if (!keysPressed.includes(e.code)) {
		keysPressed.push(e.code);
	}
	if (!bees) {await setup();}
	if (audioContext.state != "running") { audioContext.resume() }
	audio();
	genSVG();

})
document.addEventListener("keyup", (e) => {
	keysPressed.splice(keysPressed.indexOf(e.code),1)
	audio();
	genSVG();
})
document.addEventListener("blur", (e) => {
	keysPressed = [];
	audio();
	genSVG();
});

function clickToCode(x, y) {
	elemLeft = keyboard.getClientRects()[0].left;
	elemTop = keyboard.getClientRects()[0].top;
	x = x - elemLeft;
	y = y - elemTop;
	row = Math.floor((y-5)/25)
	if (x >= 575) {
		if (row == 0 || row == 1) {
			return("ʌ" + Math.round(Math.min(Math.max(0, (x - 590) / 1.4), 100)).toString())
		}
		if (row == 5 || row == 6) {
			if (x >= 585 && x < 615) {return "↓"}
			if (x >= 705 && x < 735) {return "↑"}
			else return undefined
		}
		if (row == 2 || row == 3) {
			if (x >= 585 && x < 615) {return "∓"}
			if (x >= 705 && x < 735) {return "±"}
			else return undefined
		}
		else return undefined
	} else if (row >= 0 && row <= 7) {
		col = Math.floor((x-5)/50-offsets[Math.floor(row/2)]);
	} else {return undefined}
	return keycodes[Math.floor(row/2)][col] || undefined
}

async function click(e) {
	if (!bees) {await setup();}
	if (audioContext.state != "running") { audioContext.resume() }
	code = clickToCode(e.clientX, e.clientY)
	if (special(code)) {
		if (code == "↑" && edosAvailable.indexOf(EDO) + 1 != edosAvailable.length) {layout(edosAvailable[edosAvailable.indexOf(EDO) + 1]);}
		if (code == "↓" && edosAvailable.indexOf(EDO) != 0) {layout(edosAvailable[edosAvailable.indexOf(EDO) - 1]);}
	}
	if (!keysPressed.includes(code)) {
		keysPressed.push(code);
	}
	audio();
	genSVG();
}
document.addEventListener("pointerdown", click)
document.addEventListener("touchdown", click)

async function release(e) {
	code = clickToCode(e.clientX, e.clientY)
	keysPressed.splice(keysPressed.indexOf(code),1)
	audio();
	genSVG();
}
document.addEventListener("pointerup", release)
document.addEventListener("touchup", release)

layout(12);genSVG();

////////////////////////////////////////////


async function setup() {
	audioContext = new AudioContext();
	await audioContext.audioWorklet.addModule("worklet.js?03012500");
	emmaNodes = []
	for (i = 0; i < OSC_COUNT; i++) {
		emmaNodes.push(new AudioWorkletNode(audioContext,"emmasynth"));
		emmaNodes[i].port.postMessage(["id",i]);
	}

	for (node of emmaNodes) {
		node.connect(audioContext.destination);
		/*node.port.onmessage = (e) => {
			scope[e.data[0]] = scope[e.data[0]].slice(1).concat([e.data[1]]); genSVG();
			if (e.data[0] == (OSC_COUNT-1)) {
				genScope();
			}
		}*/
		
	}
	bees = true;

	freqs = []
	waves = []
	volumes = []
	for (node of emmaNodes) {
		freqs.push(node.parameters.get("freq"));
		waves.push(node.parameters.get("wave"));
		volumes.push(node.parameters.get("gain"));
	}

}
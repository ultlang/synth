var scopeDisplay = 0;
var val;
var port; 

class EmmaSynth extends AudioWorkletProcessor {
	static get parameterDescriptors() {
	return [
		{
			name: "gain",
			defaultValue: 0.2,
			minValue: 0,
			maxValue: 1,
			automationRate: "a-rate",
		},
		{
			name: "wave",
			defaultValue: 0,
			automationRate: "a-rate",
		},
		{
			name: "freq",
			defaultValue: 0,
			automationRate: "a-rate",
		},
	];
	}

	constructor(...args) {
		super(...args);
		port = this.port;
		port.onmessage = e => {this.id = e.data[1]; };
	}

	process(inputs, outputs, parameters) {
		const output = outputs[0];
		output.forEach((channel) => {
			for (let i = 0; i < channel.length; i++) {
				// channel[i] = p(parameters,i,"freq")!=0 ? [saw, square, sine][p(parameters, i, "wave")%3](parameters, i) : 0;
				// sine has way too audible clicks, wait until adsr added
				channel[i] = p(parameters,i,"freq")!=0 ? [saw, square][p(parameters, i, "wave")%2](parameters, i) : 0;
				/*if (i % 70 == 0 && currentFrame % 10 == 0) {
					port.postMessage([this.id, channel[i]]);
				}*/ // TODO: fix scope lol his is not working at all.
			}
		});
		return true;
	}
}

function p(parameters, i, par) {
	return (parameters[par].length > 1 ? parameters[par][i]: parameters[par][0])
}

function square(parameters, i) {
	return (1/Math.sqrt(3)) * (((currentFrame+i) % (sampleRate / p(parameters, i, "freq"))) > (sampleRate/2 / p(parameters, i, "freq") )
		? p(parameters, i, "gain") : -p(parameters, i, "gain"));
}

function saw(parameters, i) {
	return (((currentFrame+i) % (sampleRate / p(parameters, i, "freq"))) / (sampleRate/2 / p(parameters, i, "freq")) - 1)
		* p(parameters, i, "gain")
}

function sine(parameters, i) {
	return (Math.sqrt(2)/Math.sqrt(3)) * (Math.sin((p(parameters, i, "freq") / sampleRate) * 2 * Math.PI * (currentFrame+i)))
		* p(parameters, i, "gain")
}

registerProcessor("emmasynth", EmmaSynth);
class EmmaSynth extends AudioWorkletProcessor {
	static get parameterDescriptors() {
	return [
		{
			name: "gain",
			defaultValue: 0.4,
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
			defaultValue: 220,
			automationRate: "a-rate",
		},
	];
	}

	process(inputs, outputs, parameters) {
		const output = outputs[0];
		output.forEach((channel) => {
			for (let i = 0; i < channel.length; i++) {
				channel[i] = [saw, square][mjau(parameters, i, "wave")%2](parameters, i)

				// note: a parameter contains an array of 128 values (one value for each of 128 samples),
				// however it may contain a single value which is to be used for all 128 samples
				// if no automation is scheduled for the moment.
			}
		});
		return true;
	}
}

function mjau(parameters, i, par) {
	return (parameters[par].length > 1 ? parameters[par][i]: parameters[par][0])
}

function square(parameters, i) {
	return ((currentFrame+i) % (sampleRate / mjau(parameters, i, "freq"))) > (sampleRate/2 / mjau(parameters, i, "freq") )
		? mjau(parameters, i, "gain") : -mjau(parameters, i, "gain");
}

function saw(parameters, i) {
	return (((currentFrame+i) % (sampleRate / mjau(parameters, i, "freq"))) / (sampleRate/2 / mjau(parameters, i, "freq")) - 1)
		* mjau(parameters, i, "gain")
}

registerProcessor("emmasynth", EmmaSynth);
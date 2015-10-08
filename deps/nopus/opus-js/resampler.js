///<reference path="d.ts/asm.d.ts" />
///<reference path="d.ts/libspeexdsp.d.ts" />

var native = require("./libopus_libspeexdsp");

var SpeexResampler = (function () {
    function SpeexResampler(channels, in_rate, out_rate, bits_per_sample, is_float, quality) {
        if (quality === void 0) { quality = 5; }
        this.handle = 0;
        this.in_ptr = 0;
        this.out_ptr = 0;
        this.in_capacity = 0;
        this.in_len_ptr = 0;
        this.out_len_ptr = 0;
        this.channels = channels;
        this.in_rate = in_rate;
        this.out_rate = out_rate;
        this.bits_per_sample = bits_per_sample;
        var bytes = bits_per_sample / 8;
        if (bits_per_sample % 8 != 0 || bytes < 1 || bytes > 4)
            throw 'argument error: bits_per_sample = ' + bits_per_sample;
        if (is_float && bits_per_sample != 32)
            throw 'argument error: if is_float=true, bits_per_sample must be 32';
        var err_ptr = native.allocate(4, 'i32', native.ALLOC_STACK);
        this.handle = native._speex_resampler_init(channels, in_rate, out_rate, quality, err_ptr);
        if (native.getValue(err_ptr, 'i32') != 0)
            throw 'speex_resampler_init failed: ret=' + native.getValue(err_ptr, 'i32');
        if (!is_float) {
            if (bits_per_sample == 8)
                this.copy_to_buf = this._from_i8;
            else if (bits_per_sample == 16) {
                this.copy_to_buf = this._from_i16;
            }
            else if (bits_per_sample == 24)
                this.copy_to_buf = this._from_i24;
            else if (bits_per_sample == 32)
                this.copy_to_buf = this._from_i32;
        }
        else {
            this.copy_to_buf = this._from_f32;
        }
        this.in_len_ptr = native._malloc(4);
        this.out_len_ptr = native._malloc(4);
    }
    SpeexResampler.prototype.process = function (raw_input) {
        if (!this.handle)
            throw 'disposed object';
        var samples = (raw_input.byteLength / (this.bits_per_sample / 8) / this.channels);
        var outSamples = Math.ceil(samples * this.out_rate / this.in_rate);
        var requireSize = samples * 4;
        if (this.in_capacity < requireSize) {
            if (this.in_ptr)
                native._free(this.in_ptr);
            if (this.out_ptr)
                native._free(this.out_ptr);
            this.in_ptr = native._malloc(requireSize);
            this.out_ptr = native._malloc(outSamples * 4);
            this.in_capacity = requireSize;
        }
        var results = [];
        for (var ch = 0; ch < this.channels; ++ch) {
            this.copy_to_buf(raw_input, ch, samples);
            native.setValue(this.in_len_ptr, samples, 'i32');
            native.setValue(this.out_len_ptr, outSamples, 'i32');
            var ret = native._speex_resampler_process_float(this.handle, ch, this.in_ptr, this.in_len_ptr, this.out_ptr, this.out_len_ptr);
            if (ret != 0)
                throw 'speex_resampler_process_float failed: ' + ret;
            var ret_samples = native.getValue(this.out_len_ptr, 'i32');
            var ary = new Float32Array(ret_samples);
            ary.set(native.HEAPF32.subarray(this.out_ptr >> 2, (this.out_ptr >> 2) + ret_samples));
            results.push(ary);
        }
        return results;
    };
    SpeexResampler.prototype.process_interleaved = function (raw_input) {
        if (!this.handle)
            throw 'disposed object';
        var samples = raw_input.byteLength / (this.bits_per_sample / 8);
        var outSamples = Math.ceil(samples * this.out_rate / this.in_rate);
        var requireSize = samples * 4;
        if (this.in_capacity < requireSize) {
            if (this.in_ptr)
                native._free(this.in_ptr);
            if (this.out_ptr)
                native._free(this.out_ptr);
            this.in_ptr = native._malloc(requireSize);
            this.out_ptr = native._malloc(outSamples * 4);
            this.in_capacity = requireSize;
        }
        this.copy_to_buf(raw_input, -1, samples);
        native.setValue(this.in_len_ptr, samples / this.channels, 'i32');
        native.setValue(this.out_len_ptr, outSamples / this.channels, 'i32');
        var ret = native._speex_resampler_process_interleaved_float(this.handle, this.in_ptr, this.in_len_ptr, this.out_ptr, this.out_len_ptr);
        if (ret != 0)
            throw 'speex_resampler_process_interleaved_float failed: ' + ret;
        var ret_samples = native.getValue(this.out_len_ptr, 'i32') * this.channels;
        var result = new Float32Array(ret_samples);
        result.set(native.HEAPF32.subarray(this.out_ptr >> 2, (this.out_ptr >> 2) + ret_samples));
        return result;
    };
    SpeexResampler.prototype.destroy = function () {
        if (!this.handle)
            return;
        native._speex_resampler_destroy(this.handle);
        this.handle = 0;
        native._free(this.in_len_ptr);
        native._free(this.out_len_ptr);
        if (this.in_ptr)
            native._free(this.in_ptr);
        if (this.out_ptr)
            native._free(this.out_ptr);
        this.in_len_ptr = this.out_len_ptr = this.in_ptr = this.out_ptr = 0;
    };
    SpeexResampler.prototype._from_i8 = function (raw_input, ch, samples) {
        var input = new Int8Array(raw_input);
    };
    SpeexResampler.prototype._from_i16 = function (raw_input, ch, samples) {
        var input = new Int16Array(raw_input);
        var off = this.in_ptr >> 2;
        if (ch >= 0) {
            var tc = this.channels;
            for (var i = 0; i < samples; ++i)
                native.HEAPF32[off + i] = input[i * tc + ch] / 32768.0;
        }
        else {
            for (var i = 0; i < samples; ++i)
                native.HEAPF32[off + i] = input[i] / 32768.0;
        }
    };
    SpeexResampler.prototype._from_i24 = function (raw_input, ch, samples) {
        var input = new Uint8Array(raw_input);
    };
    SpeexResampler.prototype._from_i32 = function (raw_input, ch, samples) {
        var input = new Int32Array(raw_input);
    };
    SpeexResampler.prototype._from_f32 = function (raw_input, ch, samples) {
        var input = new Float32Array(raw_input);
        var off = this.in_ptr >> 2;
        if (ch >= 0) {
            var tc = this.channels;
            for (var i = 0; i < samples; ++i)
                native.HEAPF32[off + i] = input[i * tc + ch];
        }
        else {
            for (var i = 0; i < samples; ++i)
                native.HEAPF32[off + i] = input[i];
        }
    };
    return SpeexResampler;
})();

module.exports.SpeexResampler = SpeexResampler;
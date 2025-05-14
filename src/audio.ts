async function load_audio(ctx: AudioContext, src: string) {
    const buffer = await fetch(src).then(_ => _.arrayBuffer())
    const audio_buffer = await ctx.decodeAudioData(buffer)
    return audio_buffer
}

type AudioContent = {
    load: () => Promise<void>
    play: (buffer: AudioBuffer) => void
    buffers: Record<string, AudioBuffer>
}

function AudioContent() {

    let ctx = new AudioContext()

    let buffers: Record<string, AudioBuffer> = { }

    async function load() {
        //buffers['main_song'] = await load_audio(ctx, './fast arcade deepseek.mp3')


        //buffers['pickup'] = await load_audio(ctx, '/audio/sound/pickup.mp3')
        buffers['thud1'] = await load_audio(ctx, './audio/thud2.wav')
        buffers['thud2'] = await load_audio(ctx, './audio/thud2.wav')
        buffers['thud3'] = await load_audio(ctx, './audio/thud3.wav')
        buffers['thud4'] = await load_audio(ctx, './audio/thud4.wav')
    }

    function play(music: string, loop: boolean = false, volume: number = 1) {
        let buffer = buffers[music]
        const source = ctx.createBufferSource()
        source.buffer = buffer

        let gain = ctx.createGain()
        gain.gain.value = volume


        gain.connect(ctx.destination)
        source.connect(gain)
        source.loop = loop

        source.start()

        return () => {
            source.stop()
        }
    }

    return {
        load,
        play,
        buffers
    }
}

export default AudioContent()
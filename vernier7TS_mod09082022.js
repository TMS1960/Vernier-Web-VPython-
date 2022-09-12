let connection, channels
let sensor_data = []
let dataready = false
let period = 10 // default
let select
let startbutton, stopbutton
let ver = new vernier()

class vernier {
    constructor() {
        this.running = false // set by start/stop buttons
        this.run = false     // set by ready/readall
        let start = new Date()  //XXXX may be able to remove these if alternate time approach works
        this.lasttime = start.getTime() //XXXX may be able to remove these if alternate time approach works
    }
    // Specify mode of communication (Bluetooth or USB), where to send sensor data,
    // and where to send gdx once established.
        // Motion device: ["MD", 5] or [5]
        // Light/Color: ["LC", 1,5,6,7]
    setup(args) {
        if (args.connection == 'Bluetooth' || args.connection == 'BLE') connection = true
        else if (args.connection == 'USB')  connection = false
        else throw new Error('Must choose "Bluetooth" or "BLE" or "USB"')
        if (args.period !== undefined) period = args.period

        if (args.canvas !== undefined) {
            if (args.canvas === null) {
                canvas.get_selected().width = canvas.get_selected().height = 2
                box({canvas:canvas.get_selected()})
            } else args.canvas.select()
        }

        if (args.channels === 'undefined') {
            canvas.get_selected().caption = 'A channel looks like [5,6] or ["LC",1,5,6,7]'
            throw new Error('A channel looks like [5,6] or ["LC",1,5,6,7]')
        } else if (!Array.isArray(args.channels)) {
            canvas.get_selected().caption = 'The channels must be a list such as [5,6] or ["LC",1,5,6,7].'
            throw new Error('The channels must be a list such as [5,6] or ["LC",1,5,6,7].')
        }
        channels = args.channels
        
        let c
        if (Array.isArray(channels[0])) {
            // [ ["MD",5], ["LC",1,5,6,7] ] => [ ["MD",0,5], ["LC",1,1,5,6,7] ]
            if (channels.length > 2) {
                canvas.get_selected().caption = 'Cannot specify more than 2 devices.'
                throw new Error('Cannot specify more than 2 devices.')
            }
            let cs = []
            let i = 0, s
            for (c of channels) {
                if (typeof c[0] != 'string') {
                    s = ['Unknown', i]
                    cs.push(s.concat(c))
                } else {
                    s = [c[0], i]
                    cs.push(s.concat(c.slice(1)))
                }
                i++
            }
            channels = cs
        } else if (typeof channels[0] != 'string') { // [1,5,6,7] => ['Unknown',0,1,5,6,7]
            let c = ['Unknown', 0]
            channels = [c.concat(channels)]
        } else { // starts with a string
            c = [channels[0], 0 ]
            channels = [c.concat(channels.slice(1))] // ["MD",5] => ["MD",0,5]
        }
        for (let c of channels) {
            for (let i=0;  i<c.length-2; i++) {
                sensor_data.push(null)
            }
        }
        select = button({bind:selectDevice, text:'Select a Go Direct Device'})
    }
    // XXXXX ready() needs review. This is where Bruce's structure gets hungup with the nature of Go Direct
    // this function may not be required at all. Need to track down "running", or "dataready"
    ready() { 
        if (!this.running) return false
        else {
            return false
        }
    }
    read(args) { // read(5) if one device or read(0,5) or read(1,5) if two devices
        if (args === undefined) {
            canvas.get_selected().caption = "read() requires at least one argument."
            throw new Error("read() requires at least one argument.")
        }
        let id, device = 0
        if (arguments.length == 1) {
            id = args
        } else {
            device = arguments[0]
            id = arguments[1]
        }
        let c = channels[device].slice(2).indexOf(id) // remove 'MD',0 from ['MD',0,5]
        if (device == 1) { // The second device listed in channels
            c += channels[0].length-2
        }
        //dataready = false //XXXX Need to track this down
        return sensor_data.pop() //This may need modification for multiple channels/devices
    }
    
    readall() {
        let ret = {}
        for (let i of channels) ret[i] = this.read(i)
        return ret
    }
}

function initialize(f) {
    if (f.text == 'Start') {
        f.text = 'Stop'
        gdx.start(period)
        ver.running = true
    } else {
        f.text = 'Start'
        gdx.stop()
        ver.running = false
    }
}

async function finish() {
    ver.running = false
    gdx.stop()
    n = 0
    while (true) { // shut down gracefully
        await rate(100)
        n++
        if (n > 100) break
    }
    gdx.close()
    startbutton.remove()
    stopbutton.remove()
}

const selectDevice = async () => {
    select.remove()
    startbutton = button({text:'Start', bind:initialize})
    canvas.get_selected().append_to_caption('  ')
    stopbutton = button({text:'Close', bind:finish})
    try {
        gdx = await godirect.selectDevice(connection)
        gdx.stop()

    enabledSensors = []
    for (let s of channels) {
      let cs = s.slice(2) // remove 'MD',0 from ['MD',0,5]
      for (let t=0; t<gdx.sensors.length; t++) {
        if (cs.indexOf(gdx.sensors[t].number) >= 0) {
          enabledSensors.push(gdx.sensors[t])
          let item = enabledSensors.length-1
          enabledSensors[item].enabled = true
          enabledSensors[item].stop = true
        }
      }
    }

    let data = []
    enabledSensors.forEach(sensor => {
      sensor.on('value-changed', (s) => {
            if (s.stop) {
            gdx.stop()
            s.stop = false
            }
            data.push(s.value)
            if (data.length == sensor_data.length) {  // this may require modification
                for (let i=0; i<sensor_data.length; i++) sensor_data[i] = data[i]
                dataready = true
                data = []
            }
      })
    })
    } catch (err) {
        canvas.get_selected().caption = err.toString()
        if (err.toString().includes('cross-origin')) {
          canvas.get_selected().append_to_caption('\nAre you running in an embedded iframe?\nTry running this example in its own window.')
        }
    }
}

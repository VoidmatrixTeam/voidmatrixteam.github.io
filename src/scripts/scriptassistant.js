let scriptData;
let globalAddresses = { 
    "EN":{"base_address":0x02106FC0,"collision_address":0x2056C06,"menupatch_address":0x203506D},
    "JP":{"base_address":0x02108818,"collision_address":0x20593E0},
    "DE":{"base_address":0x02107100,"collision_address":0x2056C76},
    "FR":{"base_address":0x02107140,"collision_address":0x2056C76},
    "IT":{"base_address":0x021070A0,"collision_address":0x2056C76},
    "SP":{"base_address":0x02107160,"collision_address":0x2056C76,"menupatch_address":0x020350B5},
    "KO":{"base_address":0x021045C0,"collision_address":0x20570DE},
};

let language = "EN";
let base;

// DEBUG
const debugHexLog = function (value) {
    // if type of value is array or list
    console.log("DEBUG: ",value)
    if (Array.isArray(value)) {
        // iterate through array
        for (let i = 0; i < value.length; i++) {
            // print hex value of each element
            console.log(value[i].toString(16));
        }
        return;
    }
    // if type of value is number
    if (typeof value === "number") {
        // print hex value
        console.log(value.toString(16));
        return;
    }
    // if type of value is string
    if (typeof value === "string") {
        // print hex value
        console.log(value.charCodeAt(0).toString(16));
        return;
    }
}

const updateDotArtist = function(payload) {
    const formattedPayload = formatPayload(payload);
    let dotArtistWrapper = document.querySelector(".dotartist_output");
    dotArtistWrapper.innerHTML = "";
    let dotArtist = document.createElement("div");
    dotArtist.classList.add("dotartist");

    for (let i=0;i<20;i++) {
        let row = document.createElement("div");
        row.classList.add("row");
        for (let j=0;j<24;j++) {
            let dot = document.createElement("div");
            dot.classList.add("dot");

            // set background color of dot based on value in payload
            let b = formattedPayload[i*24+j];
            let rgb = 115-b*(115/4) <<16 | 181-b*(180/4) <<8 |115-b*(115/4)
            dot.style.backgroundColor = `#${hexToStr(rgb,6)}`
            //addMouseEventsForDot(dot,rgb);
            // enableDotEditing(dot,b);
            
            row.appendChild(dot);
        }
        dotArtist.appendChild(row);
    }

    dotArtistWrapper.appendChild(dotArtist);
}

const formatPayload = function(payload) {
    // After dotartist data in memory 6 bytes are 0s. this allows us to remove up to 6 bytes from the end of the payload
    // later we also need to account for even or odd number of bytes
    for (let i=0;i<6;i++) {
        if (payload[payload.length-1] === 0) {
            payload.pop();
            continue;
        }
        break;
    }

    let formattedPayload = new Array((24*20)).fill(0);
    const startPayload = formattedPayload.length-payload.length*4;
    for (let i=0;i<payload.length;i++) {
        for (let j=0;j<4;j++) {
            formattedPayload[startPayload+i*4+j] = ((payload[i] >> (j*2)) & 0x3)
        }
    }
    return formattedPayload;
}

const enableDotEditing = function(dot,b) {
    dot.addEventListener("mouseover",function() {
        // check if user is holding down left mouse button
        const mouseDown = event.buttons === 1;
        if (mouseDown) {
            b = (b+1)%4;
            let rgb = 115-b*(115/4) <<16 | 181-b*(180/4) <<8 |115-b*(115/4)
            dot.style.backgroundColor = `#${hexToStr(rgb,6)}`
        }
    })
}

// disabled by default
const addMouseEventsForDot = function(dot,rgb) {
    dot.addEventListener("mouseover",function() {

        dot.style.backgroundColor = `#${hexToStr(rgb-0x303030,6)}`
    })
    // if you unhover over a dot, remove the value of the dot
    dot.addEventListener("mouseout",function() {
        // set background color of dot based on value in payload
        dot.style.backgroundColor = `#${hexToStr(rgb,6)}`
    })
}

const convertToRawByteString = function(bytes) {
    let byteString = "";
    for (let i=0;i<bytes.length;i++) {
        byteString += `0x${hexToStr(bytes[i],2)},`;
    }
    // remove last comma
    byteString = byteString.slice(0,-1);
    return byteString;
}

const convertPayload = function(text) {
    let calculatorOutput = document.querySelector(".calculator_output");
    let rawByteOutput = document.querySelector(".raw_bytes");
    let calculatorStr = ""
    let rawByteStr = "";
    let bytes = []
    for (let line of text.split("\n")) {
        let payload = getPayload(line.split("-"));
        if (payload === -1) {
            if (text.split("\n").length === 1) {
                bytes.push(0x0);
                break;
            }
            calculatorStr += "invalid\n"; continue;
        }
        bytes = bytes.concat(payload);
        const convertedPayload = convertToCalculatorPayload(payload);
        // convert to string, with every 3 digits separated by a comma using regex
        calculatorStr += convertedPayload.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")+"\n";
        rawByteStr += convertToRawByteString(payload)+"\n";
    }
    calculatorOutput.innerText = calculatorStr;
    rawByteOutput.innerText = rawByteStr;
    updateDotArtist(bytes)
    updateRawBytes(bytes);
}

// it may look odd to not use bit shifting here, but javascript doesn't support large numbers
// instead we can use the BigInt library to handle large numbers created through string concatenation
const convertToCalculatorPayload = function(payload) {
    let convertedLine = "";
    // for loop is backwards because of endianness
    for (let i=payload.length-1;i>=0;i--) {
        convertedLine += hexToStr(payload[i],2);
    }
    let bigNum = BigInt("0x"+convertedLine,16);
    return bigNum
}

// test data
// cmd: 0x7 -adr:[base] + 0x2EAF0 -val: 0xB0
// cmd: 0x96 -sp: 0x1EA -lv: 0x50 -itm: 0x20 -wk: 0x10 

const getPayload = function(incomingData) {
    if (!incomingData[0].startsWith("cmd:")) { return -1}
    let scriptCommand = incomingData[0].replaceAll(' ','').slice(4).toLowerCase();
    let scriptCommandData = scriptData[scriptCommand]
    if (!scriptCommandData) {return -1}

    let bytes = new Array(2+scriptCommandData.parameters.length).fill(0);
    for (let i=0;i<2;i++) {
        bytes[i] = scriptCommand >> (i*8);
    }
    let params = scriptCommandData.parameters;
    let index = 0;
    for (let i=1;i<incomingData.length;i++) {
        const param = incomingData[i].split(":")[0];
        const paramValue = formatParameter(incomingData[i]);
        const paramCount = params.filter(p => p==param).length;
        
        if (paramCount == 0) {return -1;}
        // console.log(paramValue)
        for (let j=0;j<paramCount;j++) {
            bytes[2+index] = (paramValue >> (j*8)) & 0xFF;
            index++;
        }    
    }
    return bytes;
}

const formatParameter = function(data) {
    let formattedData = data.split(":")[1];
    // if data contains [base] replace with base
    for (let b of ["[base]","[base_address]"]) {
        if (formattedData.includes(b)) {
            if (!base) {alert("Please enter a base address first"); return -1;}
            // replace [base] with base value
            formattedData = formattedData.replaceAll(b,`0x${hexToStr(base)}`);
        }
    }

    for (const addr of Object.keys(globalAddresses[language])){
        formattedData = formattedData.replaceAll(addr,`0x${hexToStr(globalAddresses[language][addr])}`);
    }

    let splitData = formattedData.replaceAll(" ","").split("+");
    // add all values together
    let sum = 0;
    for (let i=0;i<splitData.length;i++) {
        if (isHexadecimal(splitData[i])) {
            sum += parseInt(splitData[i],16);
        }
    }
    return sum;
}

const strToHexStr = function (value) {
    return value.replace("0x",'').replace(/^0+(?=\d)/, '')
}

const strToHex = function (value) {
    return parseInt(strToHexStr(value),16)
}

const hexToStr = function (value,padAmount=0) {
    let str =value.toString(16)
    return str.padStart(padAmount,"0")
}

const isHexadecimal = str => str.replace("0x",'').split('').every(c => '0123456789ABCDEFabcdef'.indexOf(c) !== -1);

const addEventListeners = function() {
    let baseInput = document.querySelector(".base");
    let payloadInput = document.querySelector('.payload_input');
    // select language dropdown menu through id
    let languageSelect = document.getElementById("language_select");
     
    baseInput.addEventListener('input',function() {if (isHexadecimal(baseInput.value)) {base = strToHex(baseInput.value); convertPayload(payloadInput.value)}})
    payloadInput.addEventListener('input',function () {convertPayload(payloadInput.value);})
    languageSelect.addEventListener('change',function() {language = languageSelect.value; convertPayload(payloadInput.value);})


}

const getJsonFromUrl = async function(url) {
    return fetch(url)
    .then((response) => response.json())
    .then((responseJson) => {
    return responseJson;
    })
    .catch((error) => {
    console.error(error);
    });   
}

document.addEventListener("DOMContentLoaded", async function () {
    scriptData = await getJsonFromUrl(`data/scriptdata.json`);
    addEventListeners();
    updateDotArtist([0]);
});

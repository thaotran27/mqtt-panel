let host = '192.168.0.100';
let port = 8080;
let topic = '#';
let useTLS = false;
let cleansession = true;
let reconnectTimeout = 3000;
let tempData = new Array();
var mqtt;
var elem;
var fanState = {};
var aqi = {};
var sumErrorCo2 = 0;
var sumErrorPm2 = 0;

let kP_co2 = 4;
let kI_co2 = 0.1;
let kP_pm = 4;
let kI_pm = 0.1;
let kCo2 = 0.005; // How much control to co2
let kPm2 = 0.005; // How much control to co2



function MQTTconnect() {
    if (typeof path == "undefined") {
        path = '/';
    }
    mqtt = new Paho.MQTT.Client(host, port, path, "mqtt_panel" + parseInt(Math.random() * 100, 10));
    let options = {
        timeout: 3,
        useSSL: useTLS,
        cleanSession: cleansession,
        onSuccess: onConnect,
        onFailure: function (message) {
            $('#status').html("Connection failed: " + message.errorMessage + "Retrying...")
                .attr('class', 'alert alert-danger');
            setTimeout(MQTTconnect, reconnectTimeout);
        }
    };

    mqtt.onConnectionLost = onConnectionLost;
    mqtt.onMessageArrived = onMessageArrived;
    console.log("Host: " + host + ", Port: " + port + ", Path: " + path + " TLS: " + useTLS);
    mqtt.connect(options);
    sumErrorCo2 = 0
    sumErrorPm2 = 0
};

function onConnect() {
    $('#status').html('Connected to ' + host + ':' + port + path)
        .attr('class', 'alert alert-success');
    mqtt.subscribe(topic, { qos: 0 });
    $('#topic').html(topic);
};

function onConnectionLost(response) {
    setTimeout(MQTTconnect, reconnectTimeout);
    $('#status').html("Connection lost. Reconnecting...")
        .attr('class', 'alert alert-warning');
};

function onMessageArrived(message) {
    let topic = message.destinationName;
    let payload = message.payloadString;
    console.log("Topic: " + topic + ", Message payload: " + payload);
    let topics = topic.split('/');
    let area = topics[1];
    var msg = JSON.parse(payload);

    switch (area) {
        case 'state':
            handleFanPayload(msg)
            break;
        case 'aqi':
            handleSensorPayload(msg)
            break;        
        default:
            console.log('Error: Data do not match the MQTT topic.');
            break;
    }
};


function handleFanPayload(msg) {
    if(msg.power == "on"){
        fanState["power"] = "on"
        $('#fan-power').text('On');
        $('#fan-power').removeClass('badge-danger').addClass('badge-success');
    } else {
        fanState["power"] = "off"
        $('#fan-power').text('Off');
        $('#fan-power').removeClass('badge-success').addClass('badge-danger');
    }
    if(msg.mode == "manual"){
        fanState["mode"] = "manual"
        $('#fan-mode').text('Manual');
        $('#fan-mode').removeClass('badge-danger').addClass('badge-success');
    } else {
        fanState["mode"] = "auto"
        $('#fan-mode').text('Automatic');
        $('#fan-mode').removeClass('badge-success').addClass('badge-danger');
    }

    fanState["speed"] = msg.speed
    $('#fan-speed').text(msg.speed.toString());

}

function handleSensorPayload(msg) {
    $('#sensorPm1').html('(Sensor value: ' + msg.pm1 + ')');
    changeProgress(document.getElementById("sensorPm1Bar"), msg.pm1);
    aqi["pm1"] = msg.pm1

    $('#sensorPm2').html('(Sensor value: ' + msg.pm2 + ')');
    changeProgress(document.getElementById("sensorPm2Bar"), msg.pm2);
    aqi["pm2"] = msg.pm2

    $('#sensorPm10').html('(Sensor value: ' + msg.pm10 + ')');
    changeProgress(document.getElementById("sensorPm10Bar"), msg.pm10);
    aqi["pm10"] = msg.pm10

    $('#sensorCo2').html('(Sensor value: ' + msg.co2 + ')');
    var tempCo2;
    if(msg.co2 < 300) {
        tempCo2 = 0;
    } else if (msg.co2 > 3000) {
        tempCo2 = 100;
    } else {
        tempCo2 = (msg.co2 - 300) * 100/(3000 - 300);
    }
    changeProgress(document.getElementById("sensorCo2Bar"), tempCo2);
    aqi["co2"] = msg.co2

    $('#sensorTemperature').html('(Sensor value: ' + msg.temp + ')');
    changeProgress(document.getElementById("sensorTempBar"), msg.temp);
    aqi["temp"] = msg.temp

    $('#sensorHumidity').html('(Sensor value: ' + msg.humid + ')');
    changeProgress(document.getElementById("sensorHumidBar"), msg.humid);
    aqi["humid"] = msg.humid
    autoControl()
}

function autoControl() {
    if (fanState["mode"] == "manual") {
        return
    }
    errorPm2 = aqi["pm2"] - 5;
    errorCo2 = aqi["co2"] - 600;

    pwm = (kP_co2 * errorCo2 + kI_co2 * sumErrorCo2) * kCo2 + (kP_pm * errorPm2 + kI_co2 * sumErrorPm2) * kPm2 ; 

    sumErrorCo2 += errorCo2
    sumErrorPm2 += errorPm2
    console.log("Auto control on")

    if (pwm < fanState["speed"]) {
        sendSpeedCommand('-')
    } else if (pwm > fanState["speed"]){
        sendSpeedCommand ('+')
    }
}

// functions which handle button clicks
function powerClick() {
    // create a new MQTT message with a specific payload
    if(fanState["power"] == "on"){
        fanState["power"] = "off";
    } else {
        fanState["power"] = "on";
    }
    let data = { type: "power", value: fanState["power"]};
    var mqttMessage = new Paho.MQTT.Message(JSON.stringify(data));
  
    // Set the topic it should be published to
    mqttMessage.destinationName = "ffu/set/fan";
  
    // Publish the message
    mqtt.send(mqttMessage);
  }

function manualClick() {
    // create a new MQTT message with a specific payload
    if(fanState["mode"] == "manual"){
        fanState["mode"] = "auto";
    } else {
        fanState["mode"] = "manual";
    }
    let data = { type: "mode", value: fanState["mode"]};
    var mqttMessage = new Paho.MQTT.Message(JSON.stringify(data));
  
    // Set the topic it should be published to
    mqttMessage.destinationName = "ffu/set/fan";
  
    // Publish the message
    mqtt.send(mqttMessage);
  }

function increaseClick() {
    if(fanState["mode"] == "manual") {
        sendSpeedCommand('+')
    }
}

function sendSpeedCommand(value) {
    let data = { type: "speed", value: value};
    var mqttMessage = new Paho.MQTT.Message(JSON.stringify(data));
    // Set the topic it should be published to
    mqttMessage.destinationName = "ffu/set/fan";

    // Publish the message
    mqtt.send(mqttMessage);
}

function decreaseClick() {
    if(fanState["mode"] == "manual") {
        sendSpeedCommand('-')
    }
}

function changeProgress(elem, width) {
    if(width > 100){
        width = 100;
    }
    elem.style.width = width + "%";
}

$(document).ready(function () {
    MQTTconnect();
});
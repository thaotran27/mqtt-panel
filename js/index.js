let host = '192.168.0.100';
let port = 8080;
let topic = '#';
let useTLS = false;
let cleansession = true;
let reconnectTimeout = 3000;
let tempData = new Array();
var mqtt;
var fanPower = "off";
var fanMode = "on";
var fanSpeed = 5;
var elem;

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

    switch (area) {
        case 'state':
            var msg = JSON.parse(payload);
            if(msg.power == "on"){
                fanPower = "on";
                $('#fan-power').text('On');
                $('#fan-power').removeClass('badge-danger').addClass('badge-success');
            } else {
                fanPower = "off";
                $('#fan-power').text('Off');
                $('#fan-power').removeClass('badge-success').addClass('badge-danger');
            }
            if(msg.mode == "manual"){
                $('#fan-mode').text('Manual');
                $('#fan-mode').removeClass('badge-danger').addClass('badge-success');
            } else {
                $('#fan-mode').text('Automatic');
                $('#fan-mode').removeClass('badge-success').addClass('badge-danger');
            }
            
            $('#fan-speed').text(msg.speed.toString());
            break;
        case 'aqi':
            var msg = JSON.parse(payload);
            $('#sensorPm1').html('(Sensor value: ' + msg.pm1 + ')');
            changeProgress(document.getElementById("sensorPm1Bar"), msg.pm1);
            $('#sensorPm2').html('(Sensor value: ' + msg.pm2 + ')');
            changeProgress(document.getElementById("sensorPm2Bar"), msg.pm2);
            $('#sensorPm10').html('(Sensor value: ' + msg.pm10 + ')');
            changeProgress(document.getElementById("sensorPm10Bar"), msg.pm10);
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
            $('#sensorTemperature').html('(Sensor value: ' + msg.temp + ')');
            changeProgress(document.getElementById("sensorTempBar"), msg.temp);
            $('#sensorHumidity').html('(Sensor value: ' + msg.humid + ')');
            changeProgress(document.getElementById("sensorHumidBar"), msg.humid);

            break;        
        
        default:
            // console.log('Error: Data do not match the MQTT topic.');
            break;
    }
};


// functions which handle button clicks
function powerClick() {
    // create a new MQTT message with a specific payload
    if(fanPower == "on"){
        fanPower = "off";
    } else {
        fanPower = "on";
    }
    let data = { type: "power", value: fanPower};
    var mqttMessage = new Paho.MQTT.Message(JSON.stringify(data));
  
    // Set the topic it should be published to
    mqttMessage.destinationName = "ffu/set/fan";
  
    // Publish the message
    mqtt.send(mqttMessage);
  }

function manualClick() {
    // create a new MQTT message with a specific payload
    if(fanMode == "manual"){
        fanMode = "auto";
    } else {
        fanMode = "manual";
    }
    let data = { type: "mode", value: fanMode};
    var mqttMessage = new Paho.MQTT.Message(JSON.stringify(data));
  
    // Set the topic it should be published to
    mqttMessage.destinationName = "ffu/set/fan";
  
    // Publish the message
    mqtt.send(mqttMessage);
  }

function increaseClick() {
    if(fanMode == "manual") {
        // create a new MQTT message with a specific payload
    let data = { type: "speed", value: '+'};
    var mqttMessage = new Paho.MQTT.Message(JSON.stringify(data));
    
    // Set the topic it should be published to
    mqttMessage.destinationName = "ffu/set/fan";
    
        // Publish the message
    mqtt.send(mqttMessage);
    }
}

function decreaseClick() {
    if(fanMode == "manual") {
        // create a new MQTT message with a specific payload
        let data = { type: "speed", value: '-'};
        var mqttMessage = new Paho.MQTT.Message(JSON.stringify(data));
    
        // Set the topic it should be published to
        mqttMessage.destinationName = "ffu/set/fan";
    
        // Publish the message
        mqtt.send(mqttMessage);
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
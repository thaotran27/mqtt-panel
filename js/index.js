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
    $('#message').html(topic + ', ' + payload);
    let topics = topic.split('/');
    let area = topics[1];

    switch (area) {
        case 'fan':
            var msg = JSON.parse(payload);
            if(msg.type == "power"){
                if(msg.value == "on"){
                    fanPower = "on";
                    $('#label1').text('On');
                    $('#label1').removeClass('badge-danger').addClass('badge-success');
                } else {
                    fanPower = "off";
                    $('#label1').text('Off');
                    $('#label1').removeClass('badge-success').addClass('badge-danger');
                }
            } else if (msg.type == "mode"){
                if(msg.value == "manual"){
                    $('#label2').text('Manual');
                    $('#label2').removeClass('badge-danger').addClass('badge-success');
                } else {
                    $('#label2').text('Automatic');
                    $('#label2').removeClass('badge-success').addClass('badge-danger');
                }
            } else if (msg.type == "speed"){
                $('#basementTempLabel').text(msg.value.toString());
            }
            break;
        case 'aqi':
            var msg = JSON.parse(payload);
            $('#sensorPm1').html('(Sensor value: ' + msg.pm1 + ')');
            $('#sensorPm2').html('(Sensor value: ' + msg.pm2 + ')');
            $('#sensorPm10').html('(Sensor value: ' + msg.pm10 + ')');
            $('#sensorCo2').html('(Sensor value: ' + msg.co2 + ')');
            $('#sensorTemperature').html('(Sensor value: ' + msg.temp + ')');
            $('#sensorHumidity').html('(Sensor value: ' + msg.humid + ')');

            break;
        case 'basement':
            $('#basementTempSensor').html('(Sensor value: ' + payload + ')');
            if (payload >= 25) {
                $('#basementTempLabel').text(payload + ' °C - too hot');
                $('#basementTempLabel').removeClass('badge-warning badge-success badge-info badge-primary').addClass('badge-danger');
            } else if (payload >= 21) {
                $('#basementTempLabel').text(payload + ' °C - hot');
                $('#basementTempLabel').removeClass('badge-danger badge-success badge-info badge-primary').addClass('badge-warning');
            } else if (payload >= 18) {
                $('#basementTempLabel').text(payload + ' °C - normal');
                $('#basementTempLabel').removeClass('badge-danger badge-warning badge-info badge-primary').addClass('badge-success');
            } else if (payload >= 15) {
                $('#basementTempLabel').text(payload + ' °C - low');
                $('#basementTempLabel').removeClass('badge-danger badge-warning badge-success badge-primary').addClass('badge-info');
            } else if (mpayload <= 12) {
                $('#basementTempLabel').text(payload + ' °C - too low');
                $('#basementTempLabel').removeClass('badge-danger badge-warning badge-success badge-info').addClass('badge-primary');
                basementTemp.push(parseInt(payload));
                if (basementTemp.length >= 20) {
                    basementTemp.shift()
                }
            }
            break;
        
        
        default:
            console.log('Error: Data do not match the MQTT topic.');
            break;
    }
};


// This is the function which handles button clicks
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
    mqttMessage.destinationName = "ffu/fan";
  
    // Publish the message
    mqtt.send(mqttMessage);
  }

function manualClick() {
    // create a new MQTT message with a specific payload
    if(fanMode == "manual"){
        fanMode = "automatic";
    } else {
        fanMode = "manual";
    }
    let data = { type: "mode", value: fanMode};
    var mqttMessage = new Paho.MQTT.Message(JSON.stringify(data));
  
    // Set the topic it should be published to
    mqttMessage.destinationName = "ffu/fan";
  
    // Publish the message
    mqtt.send(mqttMessage);
  }

function increaseClick() {
    // create a new MQTT message with a specific payload
    if(fanSpeed < 9){
        fanSpeed++;
    }
    let data = { type: "speed", value: fanSpeed};
    var mqttMessage = new Paho.MQTT.Message(JSON.stringify(data));
  
    // Set the topic it should be published to
    mqttMessage.destinationName = "ffu/fan";
  
    // Publish the message
    mqtt.send(mqttMessage);
  }

function decreaseClick() {
    // create a new MQTT message with a specific payload
    if(fanSpeed > 1){
        fanSpeed--;
    }
    let data = { type: "speed", value: fanSpeed};
    var mqttMessage = new Paho.MQTT.Message(JSON.stringify(data));
  
    // Set the topic it should be published to
    mqttMessage.destinationName = "ffu/fan";
  
    // Publish the message
    mqtt.send(mqttMessage);
  }
$(document).ready(function () {
    MQTTconnect();
});
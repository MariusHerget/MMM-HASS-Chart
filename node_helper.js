// TODO add back in after testing
// var NodeHelper = require('node_helper'); 
var _ = require('underscore');
const axios = require('axios').default;

module.exports = {
    start: function () {
        console.log('MMM-Chart-Hass helper started...');
    },

    buildBaseHassUrl: function (config) {
        var url = config.host;
        var entities = "";

        if (config.port) {
            url = url + ':' + config.port;
        }

        if (config.debuglogging) {
            console.log(url);
        }

        console.log(url);
        if (config.https) {
            return 'https://' + url;
        } else {
            return 'http://' + url;
        }

    },
    buildRequestHassUrl: function (config) {
        var entities = "";
        config.charts.forEach(element => {
            entities = entities + (entities == "" ? element.entity : "," + element.entity);
        });
        
        url = '/api/history/period/' + config.start + "?minimal_response=true&filter_entity_id=" + entities;

        if (config.end) {
            url = url + "&end_time=" + encodeURIComponent(config.end);
        }

        console.log(url);
        return url;
    },

    formatHassioDataSetIntoGraphData: function(dataset) {
        var graphData = [];

        dataset.forEach(element => {
            // Use only float values (or filter out 'unknown' / 'unavaiable' / etc)
            if (!isNaN(parseFloat(element.state))) {
                graphData.push({ x: element["last_changed"], y: parseFloat(element.state) } );
            }
        });

        return graphData;
    },

    getData: function (config) {
        var self = this;
        const hassio = axios.create({
            baseURL: self.buildBaseHassUrl(config),
            timeout: 1000,
            // It is better to save tokens in environments but for testing purposes you can use one in the token, if non in env is set
            headers: { 'Authorization': 'Bearer ' + (process.env.HASSIO_TOKEN ? process.env.HASSIO_TOKEN : config.token) }
        });
        hassio.get(self.buildRequestHassUrl(config))
            .then(function (response) {
                formattedData = [];
                
                config.charts.forEach((chart, i) => {
                    // Look for corresponding dataset in response
                    data = [];
                    console.log(response.data[0][1])
                    response.data.forEach(dataset => {
                        if (dataset.length > 1) 
                            if (dataset[0]["entity_id"] == chart.entity)
                                data = dataset;
                    });

                    formattedData.push({
                        entity: chart.entity,
                        data: self.formatHassioDataSetIntoGraphData(data),
                        chart: chart
                    });
                });

                console.log("Formatted data");
                console.log(formattedData[0]);
            })
            .catch(function (error) {
                // handle error
                console.log(error);
            })
            .then(function () {
                // always executed
            });
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === 'GET_HASS_GRAPH_DATA') {
            this.getData(payload);
        }
    },
};

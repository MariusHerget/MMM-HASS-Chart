// TODO add back in after testing
var NodeHelper = require('node_helper'); 
const axios = require('axios').default;
const _ = require("lodash");
const moment = require("moment");

const groups = (() => {
    const byDay = (item) => moment(item.x).format('DD.MM.YYYY'),
        byHour = (item) => byDay(item) + ' ' + moment(item.x).format('HH'),
        bySixHours = (item) => {
            const m = moment(item.x);
            const k = (Number(m.format('HH')) - (Number(m.format('HH')%6)))/6;
            return byDay(item) + ' ' + ['0-5', '6-11', '12-17', '17-23'][k];
        },
        byMonth = (item) => moment(item.x).format('MMM YYYY'),
        byYear = (item) => moment(item.x).format('YYYY'),
        byWeek = (item) => byYear(item) + ' ' + moment(item.x).format('ww');
    return {
        byDay,
        byHour,
        bySixHours,
        byMonth,
        byWeek,
        byYear
    };
})();

const aggregates ={
    mean: (data) => _.meanBy(data, (item) => item.y),
    max: (data) => _.maxBy(data, (item) => item.y),
    min: (data) => _.minBy(data, (item) => item.y),
    sum: (data) => _.sumBy(data, (item) => item.y),
    median: (data) => { 
        var array = [];
        data.forEach((item) => {array.push(item.y)});
        array.sort((a, b) => b - a); 
        const length = array.length; 
        if (length % 2 == 0) { 
            return (arr[length / 2] + arr[(length / 2) - 1]) / 2; 
        } else { 
            return array[Math.floor(length / 2)]; 
        }    
    }
};

module.exports = NodeHelper.create({
// module.exports = ({
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
            console.log("buildBaseHassUrl", url);
        }

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

        
        if (config.start_days) {
            var dat = new Date(Date.now()).setHours(0, 0, 0, 0);
            var start = new Date(dat - Number(config.start_days) * 24 * 60 * 60 * 1000).toISOString();
        } else {
            var start = config.start_timestamp;
        }

        url = '/api/history/period/' + start  + "?minimal_response=true&filter_entity_id=" + entities;

        if (config.end_days) {
            var dat = new Date(Date.now()).setHours(23, 59, 59, 999);
            var end = new Date(dat - Number(config.end_days) * 24 * 60 * 60 * 1000).toISOString();
            url = url + "&end_time=" + encodeURIComponent(end);
        }
        else if (config.end_timestamp) {
            url = url + "&end_time=" + encodeURIComponent(config.end_timestamp);
        }

        if (config.debuglogging) {
            console.log("buildRequestHassUrl", url);
        }
        return url;
    },

    formatHassioDataSetIntoGraphData: function (config, dataset, aggregateFuncTMP = "mean") {
        var filteredDataset = [];
        dataset.forEach(element => {
            // Use only float values (or filter out 'unknown' / 'unavaiable' / etc)
            if (!isNaN(parseFloat(element.state))) {
                filteredDataset.push({ xdate: new Date(element["last_changed"]), x: element["last_changed"], y: parseFloat(element.state) } );
            }
        });
        
        var groupByFunc = config.groupBy == "custom" ? config.customGroupBy : groups[config.groupBy];
        var groupedDataset = _.groupBy(filteredDataset, groupByFunc);
        
        var graphData = [];
        
        if (config.aggregateFunc != "minMeanMax") {
            var aggregatesFunc = config.aggregateFunc == "custom" ? config.customAggregateFunc : aggregates[config.aggregateFunc];
        } else {
            var aggregatesFunc = aggregates[aggregateFuncTMP];
        }
        
        for ([key, data] of Object.entries(groupedDataset)) {
            var y = null;
            if (aggregateFuncTMP in ["min", "max"]) {
                y = aggregatesFunc(data).y;
            } else {
                y = aggregatesFunc(data);
            }
            graphData.push({ x: key, y: aggregatesFunc(data)});
        }

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
                var formattedData = [];
                
                config.charts.forEach((chart, i) => {
                    // Look for corresponding dataset in response
                    let data = [];
                    response.data.forEach(dataset => {
                        if (dataset.length > 1) 
                            if (dataset[0]["entity_id"] == chart.entity)
                                data = JSON.parse(JSON.stringify(dataset));
                    });

                    if (config.aggregateFunc != "minMeanMax") {
                        formattedData.push({
                            entity: chart.entity,
                            data: self.formatHassioDataSetIntoGraphData(config, data),
                            chart: chart
                        });
                    } else {
                        ["min", "mean", "max"].forEach((aggregateFuncTMP) => {
                            // Clone dataset to use multiple times
                            let clonedDataset = JSON.parse(JSON.stringify(data));
                            var tmpData = {
                                entity: chart.entity + "." + aggregateFuncTMP,
                                data: self.formatHassioDataSetIntoGraphData(config, clonedDataset, aggregateFuncTMP),
                                chart: JSON.parse(JSON.stringify(chart))
                            };
                            tmpData.chart.label = tmpData.chart.label + " (" + aggregateFuncTMP + ")";
                            if (aggregateFuncTMP == "min" || aggregateFuncTMP == "max"){
                                tmpData.chart.borderDash = [5, 15];
                            }
                            if (aggregateFuncTMP == "max") {
                                tmpData.chart.fill = "-2";
                            }
                            formattedData.push(tmpData);
                        });
                    }
                });

                var payload = {
                    identifier: config.identifier,
                    formattedData: formattedData
                }

                self.sendSocketNotification('HASS_GRAPH_DATA_RESULT', payload);
            })
            .catch(function (error) {
                // handle error
                console.log(error);
                console.error(error);
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
});

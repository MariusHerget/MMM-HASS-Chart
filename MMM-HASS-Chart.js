/* global Module */

/* Magic Mirror 2
 * Module: MMM-HASS-Chart
 * 
 * Developed by Marius HErget
 * Partly based on MMM-Chart module by Erik Pettersson
 * Partly based on MMM-HASS module by Albert Serra
 * MIT Licensed.
 */

Module.register("MMM-HASS-Chart", {

    requiresVersion: "2.1.0",
    //var graph = [],
    // Default module config.
    defaults: {
		// ------------------------------------------------
        // Home Assistant settings
		// ------------------------------------------------
        host: 'localhost',
        port: '8083',
        https: false,
        initialLoadDelay: 1000,
        hassiotoken: false, // True: OAuth bearer token for API is in environment variable HASSIO_TOKEN (useful when running as a hassio add-on)
        updateInterval: 60 * 1000, // every 60 seconds
        groupBy: "byDay",
        aggregateFunc: "mean",

		// ------------------------------------------------
        // Chart settings
		// ------------------------------------------------

        // Animation speed.
        fadeSpeed: 1000,
        
        chartType: "line",
        options: {
            responsive: true,
            maintainAspectRatio: true,
            legend: {
                display: true,
                position: "top",
                labels: {
                    boxWidth: 2,
                    fontColor: "rgba(153, 153, 153, 0.6)"
                }
            },
        }

    },
    
    // Get the Module CSS.

    getStyles: function () {
        return [
            "MMM-HASS-Chart.css",
        ];
    },

    // Get the needed scripts to make graphs.
    getScripts: function () {
        return [
            // Used to create the actual chart.
            this.file('node_modules/chart.js/dist/chart.min.js'),
            // // Used to handle the mouse and touch interactions.
            this.file('node_modules/hammerjs/hammer.min.js'),
            // // Used for interaction with the graph to be able to zoom and pan.
            // // this.file('node_modules/chartjs-plugin-zoom/chartjs-plugin-zoom.min.js'),
            // // Used for HTTP(s) requests
            // 'node_modules/axios/dist/axios.js'
        ]
    },

    // Starting up.
    start: function () {
        Log.info('Starting module: ' + this.name);
        this.scheduleUpdate();
        this.chartData = { labels: [], datasets: [] }
        this.config.identifier = this.identifier;

        // Triggers the get data.
        this.getData(this.config);
    },

    // Request the graph data.
    getData: function (data) {
        this.sendSocketNotification('GET_HASS_GRAPH_DATA', data);
    },

    // Getting the graph data from helper (all MMM-HASS-Chart modules get it).
    socketNotificationReceived: function (notification, payload) {
        if (notification === "HASS_GRAPH_DATA_RESULT") {
            // Checks if the data is to this instanse of the graph module.
            if (this.identifier === payload.identifier) {
                console.log("HASS_GRAPH_DATA_RESULT", payload);

                this.chartData = {
                    datasets: []
                };

                payload.formattedData.forEach(element => {
                    var cleanupChartData = element.chart;
                    delete cleanupChartData["entity"];
                    cleanupChartData.data = element.data;
                    this.chartData.datasets.push(cleanupChartData);

                    console.log("cleanupChartData", cleanupChartData);
                });

                this.updateDom(self.config.fadeSpeed);
            }
        }
    },

    // Updating routine.
    scheduleUpdate: function (delay) {
        var nextLoad = this.config.updateInterval;
        if (typeof delay !== 'undefined' && delay >= 0) {
            nextLoad = delay;
        }
        // Time is up!
        var self = this;
        setInterval(function () {
            self.getData(self.config);
        }, nextLoad);
    },

    // Parsing the data and preparing for the graph chart.
    updateChartData: function () {
        if (this.myChart !== 'undefined') {
            // Adding the labels to the chart.
            // this.myChart.data.labels = this.chartData.labels;
            // // Adding the data to the chart.
            this.myChart.data.datasets = this.chartData.datasets;
            // this.chartData.forEach(dataset => {
            //     this.myChart.data.push(
            //         {
            //             label: "test a",
            //             borderColor: dataset.chart
            //             data: dataset.data
            //         });
            // });
            this.myChart.update();
        }
    },

    // // Override dom generator.
    getDom: function () {

        var wrapper = document.createElement("div");
        // Adding personal name class (fos use in CSS).
        wrapper.className = this.config.name;
        // Creating the canvas.
        this.ctx = document.createElement("canvas");
        // Adding the canvas to the document wrapper.
        wrapper.appendChild(this.ctx);

        // Setting the defaults.
        this.myChart = new Chart(this.ctx, {
            type: this.config.chartType,
            data: {
                datasets: [],
            },
            options: this.config.chartOptions
        });

        this.updateChartData();
        return wrapper;
    }
});

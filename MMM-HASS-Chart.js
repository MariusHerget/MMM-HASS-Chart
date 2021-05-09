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
        groupBy: "byDay",
        aggregateFunc: "mean",

		// ------------------------------------------------
        // Chart settings
		// ------------------------------------------------

        // Animation speed.
        fadeSpeed: 1000,
        chartType: "line",
        updateInterval: 60 * 1000, // every 60 seconds
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
            this.file('node_modules/chartjs-plugin-zoom/chartjs-plugin-zoom.min.js'),
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

    reloadEntireChart: function (payload) {
        console.log("!!! reload entire table")
        if (this.chartData.datasets)
            this.chartData = {
                datasets: []
            };

        payload.formattedData.forEach(element => {
            var cleanupChartData = element.chart;
            delete cleanupChartData["entity"];
            cleanupChartData.data = element.data;
            this.chartData.datasets.push(cleanupChartData);

            // console.log("cleanupChartData", cleanupChartData);
        });

        this.updateChartData();
    },

    // Getting the graph data from helper (all MMM-HASS-Chart modules get it).
    socketNotificationReceived: function (notification, payload) {
        var self = this;
        if (notification === "HASS_GRAPH_DATA_RESULT") {
            // Checks if the data is to this instanse of the graph module.
            if (this.identifier === payload.identifier) {
                console.log("HASS_GRAPH_DATA_RESULT", payload);

                if (this.chartData.datasets.length == payload.formattedData.length) {
                    // No new charts
                    this.chartData.datasets.forEach((ds, i) => {
                        let pds = payload.formattedData[i];
                        if (ds.data[0] && pds.data[0]) {
                            if (
                                ds.data[0].x == pds.data[0].x &&
                                ds.data[0].y == pds.data[0].y
                               ) {
                                // Same starting point
                                if (
                                    ds.data[ds.data.length - 1].x == pds.data[pds.data.length - 1].x &&
                                    ds.data[ds.data.length - 1].y == pds.data[pds.data.length - 1].y
                                   ) {
                                    // Same end point
                                    // No new data - Do not update!
                                } else {
                                    // Some value changed
                                    if (ds.data.length == pds.data[i].length) {
                                        var reloadTable = false;
                                        // Some y value changed
                                        console.log("Some y value changed.")
                                        // update x by x
                                        ds.data.forEach((element, k) => {
                                            if (element.x == pds.data[k].x) {
                                                element.y = pds.data[k].y
                                            }
                                            else {
                                                reloadTable = true;
                                                // ToDo: Stop foreach
                                            }
                                        });
                                        if (reloadTable) {
                                            // Backup some x values changed
                                            self.reloadEntireChart(payload);
                                        } else {
                                            this.updateChartData();
                                        }
                                    }
                                    else {
                                        var reloadTable = false;
                                        console.log("New values at the end.")
                                        // New values at the end
                                        // Update all tot his point
                                        pds.data.forEach((element, k) => {
                                            if (k < ds.data.length) {
                                                if (element.x == pds.data[k].x) {
                                                    element.y = pds.data[k].y
                                                }
                                                else {
                                                    reloadTable = true;
                                                    // ToDo: Stop foreach
                                                }
                                            } else {
                                                // New Data
                                                console.log("New Data", k, element)
                                                pds.data.push(element);
                                            }
                                        });
                                        if (reloadTable) {
                                            // Backup some x values changed
                                            self.reloadEntireChart(payload);
                                        } else {
                                            this.updateChartData();
                                        }
                                    }
                                }
                            } else {
                                // Reload entire table
                                self.reloadEntireChart(payload);
                            }
                        } else {
                            // Reload entire table
                            self.reloadEntireChart(payload);
                        }
                    });
                } else {
                    // Reload entire table
                    self.reloadEntireChart(payload);
                }
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
        console.log("nextLoad ("+this.identifier+"):", nextLoad);
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
        console.warning("UpdateDom")
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

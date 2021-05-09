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

		// ------------------------------------------------
        // Chart settings
		// ------------------------------------------------
        // Font size in px.
        defaultFontSize: 12,
        // Default MM font.
        defaultFontFamily: "Roboto, sans-serif",
        // Default color of the text.
        defaultFontColor: "#666666",
        // Graph ID (name)
        name: "my-chart",

        // Maintain aspect ratio.
        maintainAspectRatio: true,
        // Animation speed.
        fadeSpeed: 1000,

        // Type of graph.
        // For mor information checkout: http://www.chartjs.org/docs/
        // Warning, I have only really tested with bar and line graphs!
        graphStyle: "line",
		//graphStyle: "bar",
		//graphStyle: "radar",
		//graphStyle: "polarArea",
        // X Axis time unit the graphs should be ploted in.
        //xaxisTimeUnit: "millisecond",
        //xaxisTimeUnit: "second",
        //xaxisTimeUnit: "minute",
        xaxisTimeUnit: "hour",
        //xaxisTimeUnit: "day",
        //xaxisTimeUnit: "week",
        //xaxisTimeUnit: "month",
        //xaxisTimeUnit: "quarter",
        //xaxisTimeUnit: "year",

        // Format for the unit above.
        // For more options checkout: http://momentjs.com/docs/#/displaying/format/
        // Example for second above.
        //xaxisTimeFormatLabels: "ss",
        // Example for minute above.
        //xaxisTimeFormatLabels: "mm",
        // Example for hour above.
        xaxisTimeFormatLabels: "H",
        // Example for day above.
        //xaxisTimeFormatLabels: "YYYY-MM-DD",
        // Example for week above.
        //xaxisTimeFormatLabels: "WW",
        // Example for month above.
        //xaxisTimeFormatLabels: "MM",

        // Available: "category", "linear", "logarithmic", "time", "radialLinear" (you have to use one that works with your data).
        // For more options checkout: http://www.chartjs.org/docs/#scales
        xaxisType: "time",

        // Display X-Axis ticks.
        xaxisLabelTicks: true,

        // Position of the horizontal scale labels (top, left, bottom and right).
        xaxisLabelsPosition: "bottom",

        // Add to the graph continuously.
        additiveGraph: false,

        // Max number of graph data points.
        graphPoints: 10000,

        // Show information lables.
        showGraphLabels: true,
        // Position of information lables (top, left, bottom and right).
        showGraphLabelsPosition: "top",
        // Box before text.  R    G    B   Weight
        boxFontColor: "rgba(153, 153, 153, 0.6)",
        // Width of the box (before the label).
        boxWidth: 2,

        // Axis color.     R    G    B   Weight
        xaxisColor: "rgba(255, 255, 255, 0.1)",

        // Default line bezier curve tension (recommended 0 - 0.4). Set to 0 for no bezier curves.
        lineTension: 0.2,

        // Tooltips enebeld/disabeld (displays if hoovering over tha graph points). 
        tooltipEnabeld: true,
        // Tooltip background         R  G  B  Weight
        tooltipBackgroundColor: "rgba(0, 0, 0, 0.8)",
        // Tooltip text colors.      R    G    B   Weight
        tooltipBodyFontColor: "rgba(255, 255, 255, 1)",
        tooltipTitleFontColor: "rgba(255, 255, 255, 1)",
        tooltipDisplayColorsBoxes: true,

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

        var options = {
            responsive: true,
            maintainAspectRatio: this.config.maintainAspectRatio,
            legend: {
                display: this.config.showGraphLabels,
                position: this.config.showGraphLabelsPosition,
                labels: {
                    boxWidth: this.config.boxWidth,
                    fontColor: this.config.boxFontColor
                }
            },
            pan: {
                enabled: true,
                mode: 'xy'
            },
            zoom: {
                enabled: true,
                mode: 'xy',
            },
            scales: {
                xAxes: [{
                    scaleLabel: {
                        display: false
                    },
                    ticks: {
                        display: false // it should work
                    }
                }]
            }
        };
        // Start of the Scales.
        var optionScales = {
            scales: {
                xAxes: [],
                yAxes: []
            }
        };

        // // Setting the time scale.
        // if (this.config.xaxisTimeUnit == "millisecond") {
        //     options.scales.xAxes[0].time.displayFormats.millisecond = this.config.xaxisTimeFormatLabels
        // } else if (this.config.xaxisTimeUnit == "second") {
        //     options.scales.xAxes[0].time.displayFormats.second = this.config.xaxisTimeFormatLabels
        // } else if (this.config.xaxisTimeUnit == "minute") {
        //     options.scales.xAxes[0].time.displayFormats.minute = this.config.xaxisTimeFormatLabels
        // } else if (this.config.xaxisTimeUnit == "hour") {
        //     options.scales.xAxes[0].time.displayFormats.hour = this.config.xaxisTimeFormatLabels
        // } else if (this.config.xaxisTimeUnit == "day") {
        //     options.scales.xAxes[0].time.displayFormats.day = this.config.xaxisTimeFormatLabels
        // } else if (this.config.xaxisTimeUnit == "week") {
        //     options.scales.xAxes[0].time.displayFormats.week = this.config.xaxisTimeFormatLabels
        // } else if (this.config.xaxisTimeUnit == "month") {
        //     options.scales.xAxes[0].time.displayFormats.month = this.config.xaxisTimeFormatLabels
        // } else if (this.config.xaxisTimeUnit == "quarter") {
        //     options.scales.xAxes[0].time.displayFormats.quarter = this.config.xaxisTimeFormatLabels
        // } else if (this.config.xaxisTimeUnit == "year") {
        //     options.scales.xAxes[0].time.displayFormats.year = this.config.xaxisTimeFormatLabels
        // }

        // Creating the actual graph.
        this.myChart = new Chart(this.ctx, {
            type: this.config.graphStyle,
            data: {
                datasets: [
                    {
                        label: "test a",
                        data: [{ x: 0, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 5 }],
                        borderColor: "rgba(255, 0, 0, 1)",
                    }
                ],
            },
            options: options
        });
        // Chart.defaults.global.defaultFontSize = this.config.defaultFontSize;
        // Chart.defaults.global.defaultFontFamily = this.config.defaultFontFamily;
        // Chart.defaults.global.defaultFontColor = this.config.defaultFontColor;
        this.updateChartData();
        return wrapper;
    }
});

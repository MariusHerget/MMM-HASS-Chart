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
    },

    // Get the Module CSS.
    getStyles: function () {
        return ["MMM-HASS-Chart.css"];
    },

    // Get the needed scripts to make graphs.
    getScripts: function () {
        return [
            // Used to create the actual chart.
            this.file('node_modules/chart.js/dist/Chart.min.js'),
            // Used to handle the mouse and touch interactions.
            this.file('node_modules/hammerjs/hammer.min.js'),
            // Used for interaction with the graph to be able to zoom and pan.
            this.file('node_modules/chartjs-plugin-zoom/chartjs-plugin-zoom.min.js')
            // Used for interaction with the graph to be able to zoom and pan.
            this.file('node_modules/chartjs-plugin-zoom/chartjs-plugin-zoom.min.js')
        ]
    },

    // Starting up.
    start: function () {
        this.scheduleUpdate();
        this.chartData = { labels: [], datasets: [] }
        this.config.identifier = this.identifier;

        if (typeof this.config.url === 'undefined' || this.config.url === null) {
            Log.error('URL not defined in ' + this.name + ' on graph ' + this.config.name + '.');
        }

        // Triggers the get data.
        this.getData(this.config);
    },

    // Request the graph data.
    getData: function (data) {
        this.sendSocketNotification('GET_GRAPH_DATA', data);
    },

    // Getting the graph data from helper (all MMM-Chart modules get it).
    socketNotificationReceived: function (notification, payload) {
        if (notification === "GRAPH_DATA_RESULT") {

            // Checks if the data is to this instanse of the graph module.
            if (this.identifier === payload.identifier) {

                // Show it all!
                //Log.info('Parsed payload: ' + JSON.stringify(payload));

                // Parsing the JSON data to an array.
                // payload = JSON.parse(payload.body);

                // Show it all!
                //Log.info('Parsed payload body: ' + JSON.stringify(payload));

                // Continue to add to a already rendered graph or not...
                if (this.config.additiveGraph == true) {
                    // Only reset data if non exsists on graphs.
                    if (typeof this.chartData.datasets[0] === 'undefined' || this.chartData.datasets[0] === null) {
                        // Reset all avaiable data graph lines.
                        for (var q = 0; q < payload[0].length - 1; q++) {
                            this.chartData.datasets[q] = { data: [] };
                        }
                    }
                } else {
                    // Reset all data graph lines (non additive graph).
                    for (var q = 0; q < payload[0].length - 1; q++) {
                        this.chartData.datasets[q] = { data: [] };
                    }

                }

                // Counting trough the new graph data.
                for (var i = 0, toI = payload.length; i < toI; i++) {

                    // Setting up the xAxes labels.
                    this.chartData.labels.push(payload[i][0]);

                    // Cuting off lables if the max points value has been reached.
                    if (this.config.graphPoints < this.chartData.labels.length || this.chartData.datasets[1 - 1].data.length < this.chartData.labels.length) {
                        // Removing labels that is out of the scoop.
                        this.chartData.labels.splice(0, 1);
                    }

                    // Setting up the graphs data.
                    for (var j = 1, toJ = payload[i].length; j < toJ; j++) {
                        // Only add data to defined graphs.
                        if (this.chartData.datasets[j - 1] !== 'undefined' || this.chartData.datasets[j - 1] !== null) {
                            this.chartData.datasets[j - 1].data.push(payload[i][j]);
                            // Cuting off data if the max points value has been reached.
                            if (this.config.graphPoints < this.chartData.datasets[j - 1].data.length) {
                                // Removing data that is out of the scoop.
                                this.chartData.datasets[j - 1].data.splice(0, 1);
                            }
                        }
                    }
                }
                //Log.info('Length = ' + this.chartData.datasets.length);
                //Log.info('Data = ' + this.chartData.datasets);
                //Log.info('Lbels = ' + this.chartData.labels);
                // Update the graphs.
                //this.updateChartData();
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
            this.myChart.data.labels = this.chartData.labels;
            // Adding the data to the chart.
            for (var i = 0; i < this.myChart.data.datasets.length && i < this.chartData.datasets.length; i++) {
                this.myChart.data.datasets[i].data = this.chartData.datasets[i].data;
            }
            // Updating the chart.
            this.myChart.update();
        }
    },

    // Override dom generator.
    getDom: function () {
        var wrapper = document.createElement("div");
        // Adding personal name class (fos use in CSS).
        wrapper.className = this.config.name;
        // Creating the canvas.
        this.ctx = document.createElement("canvas");
        // Adding the canvas to the document wrapper.
        wrapper.appendChild(this.ctx);

        // Setting the defaults.
        Chart.defaults.global.defaultFontSize = this.config.defaultFontSize;
        Chart.defaults.global.defaultFontFamily = this.config.defaultFontFamily;
        Chart.defaults.global.defaultFontColor = this.config.defaultFontColor;

        // Graph options.
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
            tooltips: {
                enabled: this.config.tooltipEnabeld,
                backgroundColor: this.config.tooltipBackgroundColor,
                displayColors: this.config.tooltipDisplayColorsBoxes,
                titleFontColor: this.config.tooltipTitleFontColor,
                bodyFontColor: this.config.tooltipBodyFontColor,
                mode: "x",
                callbacks: {
                    title: function (ti, data) {
                        return moment(ti[0].xLabel).format("HH:mm:ss");
                    },
                    label: function (ti, data) {
                        if (ti.datasetIndex == 0) {
                            return data.datasets[ti.datasetIndex].data[ti.index];
                        } else if (ti.datasetIndex == 1) {
                            return data.datasets[ti.datasetIndex].data[ti.index];
                        } else {
                            return data.datasets[ti.datasetIndex].data[ti.index].toString();
                        }
                    }
                }
            },
        };

        // Start of the Scales.
        var optionScales = {
            scales: {
                xAxes: [],
                yAxes: []
            }
        };

        // X Axis Scale.
        var xAxis0 = {
            display: this.config.xaxisLabelTicks,
            type: this.config.xaxisType,
            position: this.config.xaxisLabelsPosition,
            time: {
                displayFormats: {},
                unit: this.config.xaxisTimeUnit,
            },
            gridLines: {
                color: this.config.xaxisColor
            }
        };

        // Adding Graph XAxis to chart.
        optionScales.scales.xAxes.push(xAxis0);

        // Adding Graph label and color settings to chart.
        for (var y = 0; y < this.chartData.datasets.length; y++) {
            // Graph 1.
            yAxis0 = {
                display: this.config['graphLabelTicks' + y],
                stacked: this.config['graphstacked' + y],
                position: this.config['graphScalePos' + y],
                id: "y-axis-" + y,
                scaleLabel: {
                    display: this.config['graphShowScaleLabel' + y],
                    labelString: this.config['graphTextScaleLabel' + y]
                },
                gridLines: {
                    color: this.config['graphGridColor' + y]
                },
                ticks: {
                    stepSize: this.config['graphScaleStepSize' + y],
                    beginAtZero: this.config['graphTicksZero' + y],//true,
                    //minStepSize: 0.2,	
                    fontColor: this.config['graphTickColor' + y],
                    callback: function (val) {
                        if (!isNaN(val)) {
                            val = Math.round(val * 100) / 100
                        }
                        return val;
                    }
                }
            };
            optionScales.scales.yAxes.push(yAxis0);
        };

        // Scale option elements.
        var optionelements = {
            elements: {
                point: {
                    radius: 0,
                    hitRadius: 3,
                    hoverRadius: 3,
                },
                line: {
                    tension: this.config.lineTension,
                }
            }
        };

        // Start graph datasets.
        var graphdatasets = [];

        // Adding Graph line settings to chart.
        for (var g = 0; g < this.chartData.datasets.length; g++) {
            graph0 = {
                label: this.config['graphLabel' + g],
                yAxisID: "y-axis-" + g,
                borderColor: this.config['graphLineColor' + g],
                backgroundColor: this.config['graphFillColor' + g],
                fill: this.config['graphFill' + g],
                borderWidth: this.config['graphBorderWidth' + g],
                data: [],
            };
            graphdatasets.push(graph0);
            //Log.info(JSON.stringify(graph0));
        };

        // Merging it all.
        Object.assign(options, optionelements, optionScales);

        // Show it all...
        //Log.info(JSON.stringify(options));

        // Setting the time scale.
        if (this.config.xaxisTimeUnit == "millisecond") {
            options.scales.xAxes[0].time.displayFormats.millisecond = this.config.xaxisTimeFormatLabels
        } else if (this.config.xaxisTimeUnit == "second") {
            options.scales.xAxes[0].time.displayFormats.second = this.config.xaxisTimeFormatLabels
        } else if (this.config.xaxisTimeUnit == "minute") {
            options.scales.xAxes[0].time.displayFormats.minute = this.config.xaxisTimeFormatLabels
        } else if (this.config.xaxisTimeUnit == "hour") {
            options.scales.xAxes[0].time.displayFormats.hour = this.config.xaxisTimeFormatLabels
        } else if (this.config.xaxisTimeUnit == "day") {
            options.scales.xAxes[0].time.displayFormats.day = this.config.xaxisTimeFormatLabels
        } else if (this.config.xaxisTimeUnit == "week") {
            options.scales.xAxes[0].time.displayFormats.week = this.config.xaxisTimeFormatLabels
        } else if (this.config.xaxisTimeUnit == "month") {
            options.scales.xAxes[0].time.displayFormats.month = this.config.xaxisTimeFormatLabels
        } else if (this.config.xaxisTimeUnit == "quarter") {
            options.scales.xAxes[0].time.displayFormats.quarter = this.config.xaxisTimeFormatLabels
        } else if (this.config.xaxisTimeUnit == "year") {
            options.scales.xAxes[0].time.displayFormats.year = this.config.xaxisTimeFormatLabels
        }

        // Show it all again...
        //Log.info(JSON.stringify(options));

        // Creating the actual graph.
        this.myChart = new Chart(this.ctx, {
            type: this.config.graphStyle,
            data: {
                labels: [],
                datasets: graphdatasets,
            },
            options: options
        });
        this.updateChartData();
        return wrapper;
    }
});

const cron = require('cron');
const fetch = require('node-fetch');
const Influx = require('influx');
const influxConfig = require('./influxConfig');
const instance = process.env.INSTANCE;
const target = process.env.TARGET;

if (!instance || !target) {
    throw 'INSTANCE or TARGET missing!';
}

const influx = new Influx.InfluxDB(influxConfig);
const measurementName = influxConfig.schema[0].measurement;

const runTest = async () => {
    let influxPoint = {
        measurement: measurementName,
        fields: {
            success: false,
            downBytePerSecond: 0
        },
        tags: {
            instance: instance,
            target: target
        }
    };
    try {
        console.info('running speedtest...');
        const startDate = new Date().getTime();
        result = await fetch(target);
        const buffer = await result.buffer();
        const endDate = new Date().getTime();

        influxPoint = {
            measurement: measurementName,
            fields: {
                success: true,
                downBytePerSecond: buffer.length / ((endDate - startDate) / 1000)
            },
            tags: {
                instance: instance,
                target: target
            }
        };

        console.info('result:', influxPoint);
    }
    catch (err) {
        console.error('speed test failed!', err);
    }

    try {
        await influx.writePoints([influxPoint]);
        console.info('successfully written to InfluxDB');
    } catch (err) {
        console.error('InfluxDB write failed!', err);
    }
}

const cronjob = new cron.CronJob(process.env.CRON_EXPR || '*/30 * * * *', runTest, null, true, 'Europe/Berlin');
cronjob.start();
runTest();
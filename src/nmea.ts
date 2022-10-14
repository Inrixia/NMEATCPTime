import { createConnection } from "net";
import DateTimeControl from "@inrixia/set-system-clock";
import admin from "admin-check";
import args from "args";
import GPS from "gps";

import type { ZDA } from "gps";

const exitWithError = (err: string) => {
	console.error(err);
	process.exit(1);
};

type Flags = { host: string; port: string; maxDifference: number };
const start = async () => {
	args
		.option("host", "The tcp ip address to connect to")
		.option("port", "The tcp port to connect to")
		.option("maxDifference", "The maximum difference in seconds allowed between system clock and gps time", 0, (v) => parseInt(v) * 1000);
	const { host, port, maxDifference } = <Flags>args.parse(process.argv);

	if (host === undefined) exitWithError("You must specify a host to connect to");
	if (port === undefined) exitWithError("You must specify a port to connect to");

	const gps = new GPS();
	gps.on("data", (data: ZDA) => {
		const now = new Date();
		if (data.valid && Math.abs(data.time.getTime() - now.getTime()) < maxDifference) {
			// If we are on a rollover dont set time
			if (!(now.getDay() === 23 && now.getMinutes() === 59 && now.getSeconds() >= 58)) {
				DateTimeControl.setDateTime(data.time);
			}
		}
	});

	console.log(`Connecting to ${host}:${port}`);

	let lineBuffer = "";
	createConnection({ host, port: +port })
		.on("connect", () => console.log(`Connected to ${host}:${port}`))
		.on("data", (data) => {
			lineBuffer += data.toString();
			let startIndex = 0;
			let messageEndIndex = 0;
			while ((messageEndIndex = lineBuffer.indexOf("\n", startIndex)) !== -1) {
				let str = lineBuffer.slice(startIndex, messageEndIndex).replace("\n", "").replace("\r", "");
				startIndex = messageEndIndex + 1;
				const gIdx = str.indexOf("$GPZDA");
				// If this isnt a $GPZDA message, skip it
				if (gIdx === -1) continue;

				// Update GPS with the new data
				gps.update(str.slice(gIdx));
			}
			if (startIndex !== 0) lineBuffer = lineBuffer.slice(startIndex);
		});
};

admin
	.check()
	.then((hasAdminPrivs) => {
		if (!hasAdminPrivs) exitWithError("NMEATCPTime requires admin privileges to run! Exiting...");
	})
	.then(start);

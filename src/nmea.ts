import { createConnection } from "net";
import { DateTimeControl } from "set-system-clock";
import admin from "admin-check";
import args from "args";
import GPS from "gps";

import type { ZDA } from "gps";

const exitWithError = (err: string) => {
	console.error(err);
	process.exit(1);
};

type Flags = { host: string; port: string };
const start = async () => {
	args.option("host", "The tcp ip address to connect to").option("port", "The tcp port to connect to");
	const { host, port } = <Flags>args.parse(process.argv);

	if (host === undefined) exitWithError("You must specify a host to connect to");
	if (port === undefined) exitWithError("You must specify a port to connect to");

	const gps = new GPS();
	const dtc = new DateTimeControl();
	gps.on("data", (data: ZDA) => {
		if (data.valid) dtc.setDateTime(data.time);
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

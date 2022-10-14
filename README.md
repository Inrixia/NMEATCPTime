# NMEATCPTime

Set system time using NMEA GPS sentances from a TCP stream.

Example:

```
nmea-win.exe --host 127.0.0.1 --port 1234
```

Optionally you can include the `maxDifference` paramter which will not allow system time to be set if gps and system time differ by more than `maxDifference` seconds.

```
nmea-win.exe --host 127.0.0.1 --port 1234 --maxDifference 60
```

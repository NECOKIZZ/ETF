# Drone report: items still missing

Everything below is marked in the report as a grey **[ PLACEHOLDER ]** box, **[insert]**, **[TBD]** or **[cost]**. Send the item and it drops straight in.

## A. Asked for by the lecturer in the videos (highest priority)

| # | Item | Goes in |
|---|------|---------|
| 1 | **GPS module spec sheet image.** The lecturer says the GPS is the **u-blox M10** (10th generation), but the report says **M8/M8N** everywhere. Confirm which, and send the spec image. | Table 3.9, plus every "M8" mention |
| 2 | **Gyro spectrogram, pre-filter** (frequency vs time, red/blue colour plot). | Figure 4.15 |
| 3 | **Gyro spectrogram, post-filter.** | Figure 4.16 |
| 4 | **Frame spec sheet:** arm thickness, plate thickness, frame weight (the "image I gave you"). | Table 3.2 and weight budget Table 3.13 |
| 5 | **Component weights:** flight controller, GPS + mast, GR01 receiver, wiring/screws, 4S 1500 mAh battery. | Weight budget Table 3.13 |

## B. Component facts to confirm

| # | Question |
|---|----------|
| 6 | Flight controller: the spec sheet says **F405 V5**; the report says **F405 V4**. Which one? |
| 7 | ESC: the spec sheet says **55A (OX32)**; the report and your photo say **60A**. Which one? |
| 8 | Quadcopter or octocopter? Some parts say 8 motors / X8 coaxial / FRAME_CLASS = 11 (motor direction table M1–M8, ×8 in the BOMs). Everything else says 4-motor quad. |

## C. Measured results (Chapter 4)

| # | Item | Section |
|---|------|---------|
| 9 | Airframe mass without and with battery; thrust-to-weight ratio; diagonal size (the "[insert mass]" sentence; the 412 g / 598 g figures are already there) | 4.3 |
| 10 | Pre/post AutoTune overshoot (%) and settling time (ms) | 4.5 |
| 11 | Hover flight time (min), battery % remaining, meets/does not meet 8 min | 4.7 |
| 12 | Loiter drift (m) and wind speed (m/s) | 4.7 |
| 13 | Mean / maximum cross-track error (m), % waypoints captured | 4.8 |
| 14 | RTL test: time to trigger (s), landing distance from take-off (m) | 4.8 |
| 15 | Mapping: altitude band (±m), duration, distance, number of images, forward/side overlap (%), software used, GSD (cm/pixel) | 4.9 |
| 16 | Outdoor range RSSI at 200 m and maximum reliable range | Tables 4.3, 4.6 and 4.9 |
| 17 | Full mission flight time, maximum wind tested | Tables 4.7 and 4.9 |

## D. Screenshots and graphs (Chapter 4 placeholders)

| # | Item | Figure |
|---|------|--------|
| 18 | GCS navigation telemetry (satellites, HDOP, EKF status) | 4.3 |
| 19 | GPS positional accuracy vs time graph | 4.4 |
| 20 | EKF3 innovation plot | 4.5 |
| 21 | RC calibration screen (18 channels) | 4.6 |
| 22 | RSSI vs distance graph | 4.7 |
| 23 | Motor test screen | 4.8 |
| 24 | Static thrust vs throttle data | 4.9 |
| 25 | Battery voltage/current discharge graph | 4.10 |
| 26 | Full parameter list screenshot | 4.17 (and Appendix A) |
| 27 | Accelerometer calibration screen | 4.18 |
| 28 | Compass calibration result screen | 4.19 |
| 29 | Compass calibration sphere plot | 4.20 |
| 30 | RC calibration completed screen | 4.21 |
| 31 | GPS track vs programmed path | 4.22 |
| 32 | QGroundControl mission planning screen | 4.23 |
| 33 | GCS HUD during hover | 4.25 |
| 34 | Planned vs actual flight path | 4.26 |
| 35 | GCS screen in AUTO mode (the G30 photo, Figure 3.16, could be reused here) | 4.27 |
| 36 | Altitude profile graph | 4.28 |
| 37 | Sample aerial images | 4.29 |
| 38 | Communication range data table | Table 4.6 |
| 39 | GPS navigation accuracy data table | Table 4.8 |

## E. Other

| # | Item | Where |
|---|------|-------|
| 40 | GPS autonomous navigation flowchart | Figure 2.9 |
| 41 | ArduPilot .param file contents | Appendix A |
| 42 | DataFlash attitude-vs-time plot | Appendix B |
| 43 | Cost of each component (₦) | Appendix D, Table D.1 |
| 44 | Reference entries for in-text citations not in the list: Clothier et al. (2021), Zuniga et al. (2018), De Souza et al. (2019), Chiella et al. (2019), Hong et al. (2018), Chang & Lee (2018), Wubben et al. (2019), Marut et al. (2019) | References |

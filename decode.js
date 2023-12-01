function khumpProtocolParser(bytes)
{ 
    var decoded = {};
    var index = 0;
    var mask_sensor_int = bytes[index++];
    var mask_sensor_ext = bytes[index++];
    var status_dry = ["OPEN", "CLOSED"];
    var status_relay = ["NO", "NC"];
    var novo_firmware = 0;
    
   if (bytes.length > index) 
   {
        if (mask_sensor_int & 0x19)
        {
            decoded.internal_sensors = [];
        }

        if(mask_sensor_int & 0x80)
        {
            decoded.internal_sensors = [];
            novo_firmware = 1;
            mask_sensor_ext = bytes[index++]; // aumenta mais 1 index por ser novo firmware
        }
    
        // Decode Battery
        if (mask_sensor_int >> 0 & 0x01) 
        {
            var battery = {};
            battery.n = 'battery';
            battery.v = (bytes[index++] / 10.0).toFixed(1);
            battery.u = 'V';
            decoded.internal_sensors.push(battery);
        }
    
        // Decode Firmware Version
        if (mask_sensor_int >> 2 & 0x01) {
            var firmware_version = {n : "version"};
            var firmware = bytes[index++] | (bytes[index++] << 8) | (bytes[index++] << 16);
            var hardware = (firmware / 1000000) >>> 0;
            var compatibility = ((firmware / 10000) - (hardware * 100)) >>> 0;
            var feature = ((firmware - (hardware * 1000000) - (compatibility * 10000)) / 100) >>> 0;
            var bug = (firmware - (hardware * 1000000) - (compatibility * 10000) - (feature * 100)) >>> 0;
    
            firmware_version.v = hardware + '.' + compatibility + '.' + feature + '.' + bug;
            decoded.device.push(firmware_version);
        }
    
        // Decode Temperature Int
        if (mask_sensor_int >> 3 & 0x01) { //3
            var temperature = {};
            temperature.v = bytes[index++] | (bytes[index++] << 8);
            temperature.v = ((temperature.v / 100.0) - 273.15).toFixed(2);
            temperature.n = "Int. temp.";
            temperature.u = "C";
    
            decoded.internal_sensors.push(temperature);
        }
    
        // Decode Moisture Int
        if (mask_sensor_int >> 4 & 0x01) {   //4
            var humidity = {};
            humidity.v = bytes[index++] | (bytes[index++] << 8);
            humidity.v = (humidity.v / 10.0).toFixed(2);
            humidity.n = "Int. hum.";
            humidity.u = "%";
            decoded.internal_sensors.push(humidity);
        }
    
        var dry = {};
        if (novo_firmware == 1)
        {// Decode Drys
            if (mask_sensor_ext & 0x0F) {
                decoded.drys = [];
        
                // Decode Dry 1 State
                if (mask_sensor_ext >> 0 & 0x01) {
                    dry = {};
                    dry.n = 'C1 State';
                    dry.v = status_dry[(mask_sensor_ext >> 0 & 0x01)];
                    decoded.drys.push(dry);
                }
        
                // // Decode Dry 1 Count
                // if (mask_sensor_ext >> 1 & 0x01) {
                //      dry = {};
                //     dry.n = 'C1 Count';
                //     dry.v = bytes[index++] | (bytes[index++] << 8);
                //     decoded.drys.push(dry);
                // }
        
                // Decode Dry 2 State
                if (mask_sensor_ext >> 2 & 0x01) {
                     dry = {};
                    dry.n = 'C2 State';
                    dry.v = status_dry[(mask_sensor_ext >> 2 & 0x01)];
                    decoded.drys.push(dry);
                }
        
                // // Decode Dry 2 Count
                // if (mask_sensor_ext >> 3 & 0x01) {
                //      dry = {};
                //     dry.n = 'C2 Count';
                //     dry.v = bytes[index++] | (bytes[index++] << 8);
                //     decoded.drys.push(dry);
                // }
            }
            index++; // acerta contagem
            index++;
        }
        else
        {// Decode Drys
            if (mask_sensor_ext & 0x0F) {
                decoded.drys = [];
        
                // Decode Dry 1 State
                if (mask_sensor_ext >> 0 & 0x01) {
                    dry = {};
                    dry.n = 'C1 State';
                    dry.v = status_dry[bytes[index++]];
                    decoded.drys.push(dry);
                }
        
                // Decode Dry 1 Count
                if (mask_sensor_ext >> 1 & 0x01) {
                     dry = {};
                    dry.n = 'C1 Count';
                    dry.v = bytes[index++] | (bytes[index++] << 8);
                    decoded.drys.push(dry);
                }
        
                // Decode Dry 2 State
                if (mask_sensor_ext >> 2 & 0x01) {
                     dry = {};
                    dry.n = 'C2 State';
                    dry.v = status_dry[bytes[index++]];
                    decoded.drys.push(dry);
                }
        
                // Decode Dry 2 Count
                if (mask_sensor_ext >> 3 & 0x01) {
                     dry = {};
                    dry.n = 'C2 Count';
                    dry.v = bytes[index++] | (bytes[index++] << 8);
                    decoded.drys.push(dry);
                }
            }

            // Decode DS18B20 Probe
            if (mask_sensor_ext >> 4 & 0x07) {
                var nb_probes = (mask_sensor_ext >> 4 & 0x07) >>> 0;
        
                decoded.probes = [];
        
                for (var i = 0; i < nb_probes; i++) {
                    var probe = {};
        
                    probe.n = 'temperature';
                    probe.v = (((bytes[index++] | (bytes[index++] << 8)) / 100.0) - 273).toFixed(2);
                    probe.u = 'C';
        
                    if (mask_sensor_ext >> 7 & 0x01) {
                        index += 7;
                        probe.rom = (bytes[index--]).toString(16);
        
                        for (var j = 0; j < 7; j++) {
                            probe.rom += (bytes[index--]).toString(16);
                        }
                        index += 9;
                    } else {
                        probe.rom = bytes[index++];
                    }
                    probe.rom = probe.rom.toUpperCase();
                    decoded.probes.push(probe);
                }
            }
        }
    
        // Decode Extension Module(s).
        if (bytes.length > index) 
        {
            decoded.modules = [];
    
            while (bytes.length > index) 
            {
                var module_type = {n : "module"};
                switch (bytes[index])
                {
                    case 1:
                        {
                            module_type.v = "EM S104";
                            index++;
                            var mask_ems104 = bytes[index++];
    
                            // E1
                            if (mask_ems104 >> 0 & 0x01) {
                                var conn = {};
                                conn.n = 'e1_temp';
                                conn.v = (bytes[index++] | (bytes[index++] << 8));
                                conn.v = ((conn.v / 100.0) - 273.15).toFixed(2);
                                conn.u = 'C';
                                decoded.modules.push(conn);
                            }
    
                            // E2
                            if (mask_ems104 >> 1 & 0x01) {
                                 conn = {};
                                conn.n = 'e2_kpa';
                                conn.v = ((bytes[index++] | (bytes[index++] << 8)) / 100.0).toFixed(2);
                                conn.u = 'kPa';
                                decoded.modules.push(conn);
                            }
    
                            // E3
                            if (mask_ems104 >> 2 & 0x01) {
                                 conn = {};
                                conn.n = 'e3_kpa';
                                conn.v = ((bytes[index++] | (bytes[index++] << 8)) / 100.0).toFixed(2);
                                conn.u = 'kPa';
                                decoded.modules.push(conn);
                            }
    
                            // E4
                            if (mask_ems104 >> 3 & 0x01) {
                                 conn = {};
                                conn.n = 'e4_kpa';
                                conn.v = ((bytes[index++] | (bytes[index++] << 8)) / 100.0).toFixed(2);
                                conn.u = 'kPa';
                                decoded.modules.push(conn);
                            }
                        }
                        break;
    
                    case 2:
                        {
                            module_type.v = "EM C104";
                            index++;
                            var mask_emc104 = bytes[index++];
    
    
                            // Plus (Min Max and Avg)
                            if (mask_emc104 >> 4 & 0x01) {
                                for (var k = 0; k < 4; k++) {
                                    if ((mask_emc104 >> k) & 0x01) {
                                         conn = {};
                                        conn.n = 'e' + (k + 1) + '_curr';
                                        conn.u = "mA";
                                        // Min
                                        if (mask_emc104 >> 5 & 0x01) {
                                            conn.min = (bytes[index++] / 12.0).toFixed(2);
                                        }
                                        // Max
                                        if (mask_emc104 >> 6 & 0x01) {
                                            conn.max = (bytes[index++] / 12.0).toFixed(2);
                                        }
                                        // Avg
                                        if (mask_emc104 >> 7 & 0x01) {
                                            conn.avg = (bytes[index++] / 12.0).toFixed(2);
                                        }
                                        decoded.modules.push(conn);
                                    }
                                }
                            } else {
                                // E1
                                if (mask_emc104 >> 0 & 0x01) {
                                     conn = {};
                                    conn.n = 'e1_curr';
                                    conn.v = ((bytes[index++] | (bytes[index++] << 8)) / 1000).toFixed(2);
                                    conn.u = "mA";
                                    decoded.modules.push(conn);
                                }
    
                                // E2
                                if (mask_emc104 >> 1 & 0x01) {
                                     conn = {};
                                    conn.n = 'e2_curr';
                                    conn.v = ((bytes[index++] | (bytes[index++] << 8)) / 1000).toFixed(2);
                                    conn.u = "mA";
                                    decoded.modules.push(conn);
                                }
    
                                // E3
                                if (mask_emc104 >> 2 & 0x01) {
                                     conn = {};
                                    conn.n = 'e3_curr';
                                    conn.v = ((bytes[index++] | (bytes[index++] << 8)) / 1000).toFixed(2);
                                    conn.u = "mA";
                                    decoded.modules.push(conn);
                                }
    
                                // E4
                                if (mask_emc104 >> 3 & 0x01) {
                                     conn = {};
                                    conn.n = 'e4_curr';
                                    conn.v = ((bytes[index++] | (bytes[index++] << 8)) / 1000).toFixed(2);
                                    conn.u = "mA";
                                    decoded.modules.push(conn);
                                }
                            }
    
                        }
                        break;
    
                    // EM W104
                    case 4:
                        {
                            module_type.v = "EM W104";
                            index++;
                            var mask_emw104 = bytes[index++];
    
                            //Weather Station
                            if (mask_emw104 >> 0 & 0x01) {
                                //Rain
                                 conn = {};
                                conn.n = 'rain_lvl';
                                conn.v = (((bytes[index++] << 8) | bytes[index++]) / 10.0).toFixed(1);
                                conn.u = 'mm';
                                decoded.modules.push(conn);
    
                                //Average Wind Speed
                                 conn = {};
                                conn.n = 'avg_wind_speed'
                                conn.v = bytes[index++].toFixed(0);
                                conn.u = 'km/h';
                                decoded.modules.push(conn);
    
                                //Gust Wind Speed
                                conn = {};
                                conn.n = 'gust_wind_speed';
                                conn.v = bytes[index++].toFixed(0);
                                conn.u = 'km/h';
                                decoded.modules.push(conn);
    
                                //Wind Direction
                                 conn = {};
                                conn.n = 'wind_direction';
                                conn.v = ((bytes[index++] << 8) | bytes[index++]).toFixed(0);
                                conn.u = 'graus';
                                decoded.modules.push(conn);
    
                                //Temperature
                                 conn = {};
                                conn.n = 'temperature';
                                conn.v = ((bytes[index++] << 8) | bytes[index++]) / 10.0;
                                conn.v = (conn.v - 273.15).toFixed(1);
                                conn.u = 'C';
                                decoded.modules.push(conn);
    
                                //Humidity
                                 conn = {};
                                conn.n = 'humidity';
                                conn.v = bytes[index++].toFixed(0);
                                conn.u = '%';
                                decoded.modules.push(conn);
    
                                //Lux and UV
                                if (mask_emw104 >> 1 & 0x01) {
                                     conn = {};
                                    conn.n = 'luminosity';
                                    conn.v = (bytes[index++] << 16) | (bytes[index++] << 8) | bytes[index++];
                                    conn.u = 'lx';
                                    decoded.modules.push(conn);
    
                                     conn = {};
                                    conn.n = 'uv';
                                    conn.v = bytes[index++];
                                    conn.v = (conn.v / 10.0).toFixed(1);
                                    conn.u = '/';
                                    decoded.modules.push(conn);
                                }
                            }
    
                            //Pyranometer
                            if (mask_emw104 >> 2 & 0x01) {
                                 conn = {};
                                conn.n = 'solar_radiation';
                                conn.v = (bytes[index++] << 8) | bytes[index++];
                                conn.v = (conn.v / 10.0).toFixed(1);
                                conn.u = 'W/m²';
                                decoded.modules.push(conn);
                            }
    
                            //Barometer
                            if (mask_emw104 >> 3 & 0x01) {
                                 conn = {};
                                conn.n = 'atm_pres';
                                conn.v = (bytes[index++] << 16);    
                                conn.v |= (bytes[index++] << 8) | bytes[index++] << 0;                        
                                conn.v = (conn.v / 100.0).toFixed(1);
                                conn.u = 'hPa²';
                                decoded.modules.push(conn);
                            }
                        }
                        break;
    
                    // EM R102
                    case 5:
                        {
                            index++;
                            module_type.v = "EM R102";
    
                            var mask_emr102 = bytes[index++];
                            var mask_data = bytes[index++];
    
                            // E1
                            if (mask_emr102 >> 0 & 0x01) {
                                 conn = {};
                                conn.n = 'C3 Status';
                                conn.v = status_dry[(mask_data >> 0 & 0x01)];
                                conn.u = "bool";
                                decoded.modules.push(conn);
    
                                 conn = {};
                                conn.n = 'C3 Count';
                                conn.v = bytes[index++] | (bytes[index++] << 8);
                                decoded.modules.push(conn);
                            }
    
                            // E2
                            if (mask_emr102 >> 1 & 0x01) {
                                 conn = {};
                                conn.n = 'C4 Status';
                                conn.v = status_dry[(mask_data >> 1 & 0x01)];
                                conn.u = "bool";
                                decoded.modules.push(conn);
    
                                 conn = {};
                                conn.n = 'C4 Count';
                                conn.v = bytes[index++] | (bytes[index++] << 8);
                                decoded.modules.push(conn);
                            }
    
                            // E3
                            if (mask_emr102 >> 2 & 0x01) {
                                 conn = {};
                                conn.n = 'B3 Relay';
                                conn.v = status_relay[(mask_data >> 2 & 0x01)];
                                decoded.modules.push(conn);
                            }
    
                            // E4
                            if (mask_emr102 >> 3 & 0x01) {
                                 conn = {};
                                conn.n = 'B4 Relay';
                                conn.v = status_relay[(mask_data >> 3 & 0x01)];
                                decoded.modules.push(conn);
                            }
    
                        }
                        break;
    
                    // EM ACW100 & EM THW 100/200/201
                    case 6:
                        {
                            index++;
    
                            var rom = {};
                            var one_wire_ext_model = 0x00;
                            var mask_em_acw_thw = bytes[index++];
    
                            if (mask_em_acw_thw == 0x03) {
                                one_wire_ext_model = 0x06;
                            }
                            else {
                                if (mask_em_acw_thw >> 0 & 0x01) {
                                    one_wire_ext_model |= 0x01;
                                }
    
                                if (mask_em_acw_thw >> 4 & 0x01) {
                                    one_wire_ext_model |= 0x02;
                                }
                            }
    
                            switch (one_wire_ext_model) {
                                case 0x01:
                                    module_type.v = "EM THW 200";
                                    break;
                                case 0x02:
                                    module_type.v = "EM ACW 100";
                                    break;
                                case 0x03:
                                    module_type.v = "EM THW 201";
                                    break;
                                case 0x06:
                                    module_type.v = "EM THW 100";
                                    break;
                                default:
                                    module_type.v = "Unknow";
                                    break;
                            }
                            decoded.modules.push(module_type);
                            //ROM
                            if ((mask_sensor_ext >> 4 & 0x07) && (mask_sensor_ext >> 7 & 0x00)) {
                                rom.v = bytes[index++];
                            } else {
                                index += 7;
                                rom.v = (bytes[index--]).toString(16);
    
                                for ( j = 0; j < 7; j++) {
                                    rom.v += (bytes[index--]).toString(16);
                                }
                                index += 9;
                            }
    
                            rom.v = rom.v.toUpperCase();
                            rom.n = 'ROM';
                            decoded.modules.push(rom);
    
                            //Temperature
                            if (mask_em_acw_thw >> 0 & 0x01) {
                                var sensor = {};
                                sensor.n = 'temperature';
                                sensor.u = 'C';
                                sensor.v = ((bytes[index++] | (bytes[index++] << 8)) / 100.0) - 273.15;
                                sensor.v = sensor.v.toFixed(2);
                                decoded.modules.push(sensor);
                            }
    
                            //Humidity
                            if (mask_em_acw_thw >> 1 & 0x01) {
                                 sensor = {};
                                sensor.n = 'humidity';
                                sensor.u = '%';
                                sensor.v = (bytes[index++] | (bytes[index++] << 8)) / 100.0;
                                sensor.v = sensor.v.toFixed(2);
                                decoded.modules.push(sensor);
                            }
    
                            //Lux
                            if (mask_em_acw_thw >> 2 & 0x01) {
                                 sensor = {};
                                sensor.n = 'luminosity';
                                sensor.u = 'lux';
                                sensor.v = bytes[index++] | (bytes[index++] << 8);
                                sensor.v = sensor.v.toFixed(2);
                                decoded.modules.push(sensor);
                            }
    
                            //Noise
                            if (mask_em_acw_thw >> 3 & 0x01) {
                                 sensor = {};
                                sensor.n = 'noise';
                                sensor.u = 'dB';
                                sensor.v = (bytes[index++] | (bytes[index++] << 8)) / 100.0;
                                sensor.v = sensor.v.toFixed(2);
                                decoded.modules.push(sensor);
                            }
    
                            //Temperature RTDT
                            if (mask_em_acw_thw >> 4 & 0x01) {
                                 sensor = {};
                                sensor.n = 'temperature_rtdt';
                                sensor.u = 'C';
                                sensor.v = bytes[index++];
                                for ( j = 1; j < 4; j++) {
                                    sensor.v |= (bytes[index++] << (8 * j));
                                }
                                sensor.v = ((sensor.v / 100.0) - 273.15).toFixed(2);
                                decoded.modules.push(sensor);
                            }
                        }
                        break;
    
                    default:
                        {
                            return decoded;
                        }
                }
            }
        }
    }
    return decoded; 
}

function jsonProtocolParser()
{ 
    var decoded = {};
    var index = 0;

    decoded.internal_sensors = [];
    decoded.device = [];    
    decoded.modules = [];

    var k = Object.keys(msg.data);
    var v = Object.values(msg.data);
    for (var i = 0; i < 30; i++) 
    {
        if  (k[i])
        {
            conn = {};
            conn.n = k[index];
            conn.u = '-';
            conn.v = Number(v[index]);
            
            if ( isNaN(conn.v))
            {
                conn.v = Number(v[index].toString(16));
            }
            if ( isNaN(conn.v))
            {
                conn.v = 0;
            }
            decoded.modules.push(conn);
            index++;                

        }
    }

  return decoded;
}
 

function imtIotProtocolParser(bytes)
{ 

    var decoded = {};
    var index = 0;
    var contador_0d = 0;
    
   if (bytes.length > index) 
   {
        decoded.internal_sensors = [];
        decoded.device = [];
        decoded.modules = [];

        while (bytes.length > index/2)
        {
          switch (bytes[index++])
          {
              case 0x00:
                  //data.keepAlive = data.remainingData.slice(0,2);
                  bytes[index++];
                  break;
              
              case 0x01:
                  //data.temperature = data.remainingData.slice(0,4) * 10;
                var temperature = {};
                temperature.v = (bytes[index++]<<8) | bytes[index++];
                temperature.n = "temperature";
                temperature.u = "10x °C";
                decoded.internal_sensors.push(temperature);
                break;
              
              case 0x02:
                var humidity = {};
                humidity.v = (bytes[index++]<<8) | bytes[index++];
                humidity.n = "humidity";
                humidity.u = "10x %";
                decoded.internal_sensors.push(humidity);
                  break;
              
              case 0x03:
                var press = {};
                press.v = (bytes[index++]<<8) | bytes[index++];
                press.n = "press";
                press.u = "hPa";
                decoded.modules.push(press); 
                break;
              
              case 0x04:
                var corrente = {};
                corrente.v = (bytes[index++]<<8) | bytes[index++];
                corrente.n = "corrente";
                corrente.u = "A";
                decoded.modules.push(corrente); 
                break;
              
              case 0x05:
                var gyrox = {};
                gyrox.v = (bytes[index++]<<8) | bytes[index++];
                gyrox.n = "GiroscopioX";
                gyrox.u = "g";
                decoded.modules.push(gyrox);
                var gyroy = {};
                gyroy.v = (bytes[index++]<<8) | bytes[index++];
                gyroy.n = "GiroscopioY";
                gyroy.u = "g";
                decoded.modules.push(gyroy);
                var gyroz = {};
                gyroz.v = (bytes[index++]<<8) | bytes[index++];
                gyroz.n = "GiroscopioZ";
                gyroz.u = "g";
                decoded.modules.push(gyroz);
                break;
              
              case 0x06:
                var accx = {};
                accx.v = (bytes[index++]<<8) | bytes[index++];
                accx.n = "AceleromeroX";
                accx.u = "g";
                decoded.modules.push(accx);
                var accy = {};
                accy.v = (bytes[index++]<<8) | bytes[index++];
                accy.n = "AceleromeroY";
                accy.u = "g";
                decoded.modules.push(accy);
                var accz = {};
                accz.v = (bytes[index++]<<8) | bytes[index++];
                accz.n = "AceleromeroZ";
                accz.u = "g";
                decoded.modules.push(accz);
                break;
              
              case 0x07:
                var magx = {};
                magx.v = (bytes[index++]<<8) | bytes[index++];
                magx.n = "MagnetometroX";
                magx.u = "mGauss";
                decoded.modules.push(magx);
                var magy = {};
                magy.v = (bytes[index++]<<8) | bytes[index++];
                magy.n = "MagnetometroY";
                magy.u = "mGauss";
                decoded.modules.push(magy);
                var magz = {};
                magz.v = (bytes[index++]<<8) | bytes[index++];
                magz.n = "MagnetometroZ";
                magz.u = "mGauss";
                decoded.modules.push(magz);
                break;
              
              case 0x08:
                  //data.rtc = data.remainingData.slice(0,6);
                  bytes[index++];bytes[index++];
                  bytes[index++];
                  bytes[index++];
                  break;
              
              case 0x09:
                  //data.date = data.remainingData.slice(0,8);
                  bytes[index++];bytes[index++];
                  bytes[index++];bytes[index++];

                  break;
              
              case 0x0A:
                var lat = {};
                lat.v = (bytes[index++]);
                var aux = ((bytes[index++]<<16) |(bytes[index++]<<8) | (bytes[index++]));
                aux = aux / 1000000.0;
                if (lat.v > 127)
                {
                    lat.v = -((255 - lat.v)+1)-aux;  //complemento de 2
                }
                else
                {
                    lat.v = lat.v + aux;  
                }
                lat.n = "latitude";
                lat.u = "graus";
                decoded.modules.push(lat);
                
                var lng = {};
                lng.v = (bytes[index++]);
                aux = ((bytes[index++]<<16) |(bytes[index++]<<8) | (bytes[index++]));
                aux = aux / 1000000.0;
                if (lng.v > 127)
                {
                    lng.v = -((255 - lng.v)+1)-aux;  //complemento de 2
                }
                else
                {
                    lng.v = lng.v + aux;  
                }
                lng.n = "longitude";
                lng.u = "graus";
                decoded.modules.push(lng);
                break;
              
              case 0x0B:
                var contador = {};
                contador.v = (bytes[index++]<<8) | bytes[index++];
                contador.n = "ContadorPerm";
                contador.u = "unid";
                decoded.modules.push(contador); 
                break;
              
              case 0x0C:
                var Bateria = {};
                Bateria.v = (bytes[index++]<<8) | bytes[index++];
                Bateria.n = "Bateria";
                Bateria.u = "mV";
                decoded.modules.push(Bateria); 
                break;
              
              case 0x0D:
                switch(contador_0d++)
                {
                    case 0:
                        var AnalogicInput1 = {};
                        AnalogicInput1.v = (bytes[index++]<<8) | bytes[index++]; //`${bytes[index++]}${bytes[index++]}`;
                        AnalogicInput1.n = "AnalogicInput1";
                        AnalogicInput1.u = "uAD";
                        decoded.modules.push(AnalogicInput1);                       
                        break;
                    case 1:
                        var AnalogicInput2 = {};
                        AnalogicInput2.v = (bytes[index++]<<8) | bytes[index++];
                        AnalogicInput2.n = "AnalogicInput2";
                        AnalogicInput2.u = "uAD";
                        decoded.modules.push(AnalogicInput2);                        
                        break;
                    case 2:
                        var AnalogicInput3 = {};
                        AnalogicInput3.v = (bytes[index++]<<8) | bytes[index++];
                        AnalogicInput3.n = "AnalogicInput3";
                        AnalogicInput3.u = "uAD";
                        decoded.modules.push(AnalogicInput3);                        
                        break;
                    case 3:
                        var AnalogicInput4 = {};
                        AnalogicInput4.v = (bytes[index++]<<8) | bytes[index++];
                        AnalogicInput4.n = "AnalogicInput4";
                        AnalogicInput4.u = "uAD";
                        decoded.modules.push(AnalogicInput4);                        
                        break;
                }
                
                break;
              
              case 0x0E:
                  //data.energy = data.remainingData.slice(0,6);
                  bytes[index++];bytes[index++];
                  bytes[index++];
                  break;
              
              case 0x0F:
                  //data.rfid = data.remainingData.slice(0,16);
                  bytes[index++];bytes[index++];
                  bytes[index++];bytes[index++];
                  bytes[index++];bytes[index++];
                  bytes[index++];bytes[index++];
                  break;
              
              case 0x10:
                  //data.encoder = data.remainingData.slice(0,4);
                  bytes[index++];bytes[index++];
                  break;
              
              case 0x11:
                  //data.currentLoop = data.remainingData.slice(0,4);
                  bytes[index++];bytes[index++];
                  break;
              
              case 0x12:
                  //data.color = data.remainingData.slice(0,4);
                  bytes[index++];bytes[index++];
                  break;
              
              case 0x13:
                var analog_in = {};
                analog_in.v = (bytes[index++]<<8) | bytes[index++];
                analog_in.n = "distance";
                analog_in.u = "mm";
                decoded.modules.push(analog_in); 
                break;
              
              case 0x14:
                  //data.heartbeat = data.remainingData.slice(0,4);
                  bytes[index++];bytes[index++];
                  break;
              
              case 0x15:
                  //data.oxigenVolume = data.remainingData.slice(0,4);
                  bytes[index++];bytes[index++];
                  break;
              
              case 0x16:
                  //data.fastFourierTransform = data.remainingData.slice(0,34);
                  bytes[index++];bytes[index++];
                  break;
           }
        }
   }
  return decoded;
}
 
  
function Decoder(bytes, port)
{
    var decoded = {};
    var index = 0;

    var model = {};
    // Decode Model
    switch (port) {
        case 3: model.v = "NIT20L"; break;
        case 4: model.v = "NIT21L"; break;
        case 100: model.v = "IMTdevice"; break;
        case 200: model.v = "Energy"; break;
        default: model.v = "Unknow Model"; return decoded;
    }
    decoded.device = [];
    decoded.device.push(model);

    if (model.v == "Energy")
    {
        return jsonProtocolParser();   
    }
    if (model.v == "IMTdevice")
    {
        return imtIotProtocolParser(bytes);   
    }
    if (model.v == "NIT20L") 
    {
        return khumpProtocolParser(bytes);   
    }
    if (model.v == "NIT21L") 
    {
        return khumpProtocolParser(bytes);   
    }    
    return decoded;
}


if (msg.data)
{
    msg.decodedData = Decoder(msg.data, msg.props.port)
}
else
{
    msg.decodedData = Decoder(msg.payload, 0)
}
return msg;
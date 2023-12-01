package decode

import (
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"
)

type Imt struct {
	ApplicationID   string   `json:"applicationID"`
	ApplicationName string   `json:"applicationName"`
	NodeName        string   `json:"nodeName"`
	DevEUI          string   `json:"devEUI"`
	RxInfo          []RxInfo `json:"rxInfo"`
	TxInfo          TxInfo   `json:"txInfo"`
	FCnt            uint64   `json:"fCnt"`
	FPort           uint64   `json:"FPort"`
	Data            string   `json:"data"`
}

type RxInfo struct {
	Mac       string    `json:"mac"`
	Time      time.Time `json:"time"`
	Rssi      int64     `json:"rssi"`
	LoRaSNR   float64   `json:"loRaSNR"`
	Name      string    `json:"name"`
	Latitude  float64   `json:"latitude"`
	Longitude float64   `json:"longitude"`
	Altitude  int64     `json:"altitude"`
}

type DataRate struct {
	Modulation   string `json:"modulation"`
	Bandwidth    uint64 `json:"bandwidth"`
	SpreadFactor uint64 `json:"spreadFactor"`
}

type TxInfo struct {
	Frequency uint64   `json:"frequency"`
	DataRate  DataRate `json:"dataRate"`
	Adr       bool     `json:"adr"`
	CodeRate  string   `json:"codeRate"`
}

func LoraImt(d string) (string, error) {
	if d == "" {
		return d, errors.New("empty name")
	}

	var imt Imt
	var sb strings.Builder
	var pd string // parsed data

	json.Unmarshal([]byte(d), &imt)

	// Set measurement
	applicationName := imt.ApplicationName
	sb.WriteString(applicationName)
	sb.WriteString(",")

	// Set tags
	sb.WriteString("applicationID=")
	sb.WriteString(imt.ApplicationID)
	sb.WriteString(",")

	sb.WriteString("nodeName=")
	sb.WriteString(imt.NodeName)
	sb.WriteString(",")

	sb.WriteString("devEUI=")
	sb.WriteString(imt.DevEUI)
	sb.WriteString(",")

	for i, v := range imt.RxInfo {
		sb.WriteString("rxInfo_mac_")
		sb.WriteString(strconv.FormatUint(uint64(i), 10))
		sb.WriteString("=")
		sb.WriteString(v.Mac)
		sb.WriteString(",")

		sb.WriteString("rxInfo_name_")
		sb.WriteString(strconv.FormatUint(uint64(i), 10))
		sb.WriteString("=")
		sb.WriteString(v.Name)
		sb.WriteString(",")
	}

	sb.WriteString("txInfo_dataRate_modulation=")
	sb.WriteString(imt.TxInfo.DataRate.Modulation)
	sb.WriteString(",")

	sb.WriteString("txInfo_dataRate_bandwidth=")
	sb.WriteString(strconv.FormatUint(imt.TxInfo.DataRate.Bandwidth, 10))
	sb.WriteString(",")

	sb.WriteString("txInfo_adr=")
	sb.WriteString(strconv.FormatBool(imt.TxInfo.Adr))
	sb.WriteString(",")

	sb.WriteString("txInfo_codeRate=")
	sb.WriteString(imt.TxInfo.CodeRate)
	sb.WriteString(",")

	sb.WriteString("fPort=")
	sb.WriteString(strconv.FormatUint(imt.FPort, 10))
	sb.WriteString("")

	// Set fields
	sb.WriteString(" ")

	for i, v := range imt.RxInfo {
		// sb.WriteString("rxInfo_time_")
		// sb.WriteString(strconv.FormatUint(uint64(i), 10))
		// sb.WriteString("=")
		// sb.WriteString(v.Time.String())
		// sb.WriteString(",")

		sb.WriteString("rxInfo_rssi_")
		sb.WriteString(strconv.FormatUint(uint64(i), 10))
		sb.WriteString("=")
		sb.WriteString(strconv.FormatInt(v.Rssi, 10))
		sb.WriteString(",")

		sb.WriteString("rxInfo_loRaSNR_")
		sb.WriteString(strconv.FormatUint(uint64(i), 10))
		sb.WriteString("=")
		sb.WriteString(strconv.FormatInt(int64(v.LoRaSNR), 10))
		sb.WriteString(",")

		sb.WriteString("rxInfo_latitude_")
		sb.WriteString(strconv.FormatUint(uint64(i), 10))
		sb.WriteString("=")
		sb.WriteString(strconv.FormatInt(int64(v.Latitude), 10))
		sb.WriteString(",")

		sb.WriteString("rxInfo_longitude_")
		sb.WriteString(strconv.FormatUint(uint64(i), 10))
		sb.WriteString("=")
		sb.WriteString(strconv.FormatInt(int64(v.Longitude), 10))
		sb.WriteString(",")

		sb.WriteString("rxInfo_longitude_")
		sb.WriteString(strconv.FormatUint(uint64(i), 10))
		sb.WriteString("=")
		sb.WriteString(strconv.FormatInt(int64(v.Longitude), 10))
		sb.WriteString(",")

		sb.WriteString("rxInfo_longitude_")
		sb.WriteString(strconv.FormatUint(uint64(i), 10))
		sb.WriteString("=")
		sb.WriteString(strconv.FormatInt(int64(v.Longitude), 10))
		sb.WriteString(",")

		sb.WriteString("rxInfo_altitude_")
		sb.WriteString(strconv.FormatUint(uint64(i), 10))
		sb.WriteString("=")
		sb.WriteString(strconv.FormatInt(int64(v.Altitude), 10))
		sb.WriteString(",")
	}

	sb.WriteString("txInfo_frequency=")
	sb.WriteString(strconv.FormatUint(imt.TxInfo.Frequency, 10))
	sb.WriteString(",")

	sb.WriteString("txInfo_dataRate_spreadFactor=")
	sb.WriteString(strconv.FormatUint(imt.TxInfo.DataRate.SpreadFactor, 10))
	sb.WriteString(",")

	// Decode and Parse data
	data := imt.Data
	b, err := b64ToByte(data)
	if err != nil {
		log.Fatal(err)
	}

	switch imt.FPort {
	case 100:
		pd = imtIotProtocolParser(b)

		// case 200:
		// 	jsonProtocolParser()

		// case 3:
		// 	khompProtocolParser()

		// case 4:
		// 	khompProtocolParser()
	}
	sb.WriteString(pd)

	sb.WriteString("fCnt=")
	sb.WriteString(strconv.FormatUint(imt.FCnt, 10))

	// Set time
	sb.WriteString(" ")
	t := time.Now().UnixNano()
	sb.WriteString(strconv.FormatInt(t, 10))

	return sb.String(), nil
}

func imtIotProtocolParser(bytes []byte) string {
	var sb strings.Builder
	len := len(bytes)

	for i := 0; i < len; i++ {
		switch bytes[i] {
		case 0x00:
			fmt.Println("00")

		case 0x01:
			sb.WriteString("data_temperature=")
			v := uint64(bytes[i+1]) << 8
			v |= uint64(bytes[i+2])
			f := float64(v) / 10
			sb.WriteString(strconv.FormatFloat(f, 'f', -1, 64))
			sb.WriteString(",")
			i = i + 2

		case 0x02:
			sb.WriteString("data_humidity=")
			v := uint64(bytes[i+1]) << 8
			v |= uint64(bytes[i+2])
			f := float64(v) / 10
			sb.WriteString(strconv.FormatFloat(f, 'f', -1, 64))
			sb.WriteString(",")
			i = i + 2

		// 	// case 0x03:
		// 	//   var press = {};
		// 	//   press.v = (bytes[index++]<<8) | bytes[index++];
		// 	//   press.n = "press";
		// 	//   press.u = "hPa";
		// 	//   decoded.modules.push(press);
		// 	//   break;

		// 	// case 0x04:
		// 	//   var corrente = {};
		// 	//   corrente.v = (bytes[index++]<<8) | bytes[index++];
		// 	//   corrente.n = "corrente";
		// 	//   corrente.u = "A";
		// 	//   decoded.modules.push(corrente);
		// 	//   break;

		// 	// case 0x05:
		// 	//   var gyrox = {};
		// 	//   gyrox.v = (bytes[index++]<<8) | bytes[index++];
		// 	//   gyrox.n = "GiroscopioX";
		// 	//   gyrox.u = "g";
		// 	//   decoded.modules.push(gyrox);
		// 	//   var gyroy = {};
		// 	//   gyroy.v = (bytes[index++]<<8) | bytes[index++];
		// 	//   gyroy.n = "GiroscopioY";
		// 	//   gyroy.u = "g";
		// 	//   decoded.modules.push(gyroy);
		// 	//   var gyroz = {};
		// 	//   gyroz.v = (bytes[index++]<<8) | bytes[index++];
		// 	//   gyroz.n = "GiroscopioZ";
		// 	//   gyroz.u = "g";
		// 	//   decoded.modules.push(gyroz);
		// 	//   break;

		// 	// case 0x06:
		// 	//   var accx = {};
		// 	//   accx.v = (bytes[index++]<<8) | bytes[index++];
		// 	//   accx.n = "AceleromeroX";
		// 	//   accx.u = "g";
		// 	//   decoded.modules.push(accx);
		// 	//   var accy = {};
		// 	//   accy.v = (bytes[index++]<<8) | bytes[index++];
		// 	//   accy.n = "AceleromeroY";
		// 	//   accy.u = "g";
		// 	//   decoded.modules.push(accy);
		// 	//   var accz = {};
		// 	//   accz.v = (bytes[index++]<<8) | bytes[index++];
		// 	//   accz.n = "AceleromeroZ";
		// 	//   accz.u = "g";
		// 	//   decoded.modules.push(accz);
		// 	//   break;

		// 	// case 0x07:
		// 	//   var magx = {};
		// 	//   magx.v = (bytes[index++]<<8) | bytes[index++];
		// 	//   magx.n = "MagnetometroX";
		// 	//   magx.u = "mGauss";
		// 	//   decoded.modules.push(magx);
		// 	//   var magy = {};
		// 	//   magy.v = (bytes[index++]<<8) | bytes[index++];
		// 	//   magy.n = "MagnetometroY";
		// 	//   magy.u = "mGauss";
		// 	//   decoded.modules.push(magy);
		// 	//   var magz = {};
		// 	//   magz.v = (bytes[index++]<<8) | bytes[index++];
		// 	//   magz.n = "MagnetometroZ";
		// 	//   magz.u = "mGauss";
		// 	//   decoded.modules.push(magz);
		// 	//   break;

		// 	// case 0x08:
		// 	//     //data.rtc = data.remainingData.slice(0,6);
		// 	//     bytes[index++];bytes[index++];
		// 	//     bytes[index++];
		// 	//     bytes[index++];
		// 	//     break;

		// 	// case 0x09:
		// 	//     //data.date = data.remainingData.slice(0,8);
		// 	//     bytes[index++];bytes[index++];
		// 	//     bytes[index++];bytes[index++];

		// 	//     break;

		// 	// case 0x0A:
		// 	//   var lat = {};
		// 	//   lat.v = (bytes[index++]);
		// 	//   var aux = ((bytes[index++]<<16) |(bytes[index++]<<8) | (bytes[index++]));
		// 	//   aux = aux / 1000000.0;
		// 	//   if (lat.v > 127)
		// 	//   {
		// 	//       lat.v = -((255 - lat.v)+1)-aux;  //complemento de 2
		// 	//   }
		// 	//   else
		// 	//   {
		// 	//       lat.v = lat.v + aux;
		// 	//   }
		// 	//   lat.n = "latitude";
		// 	//   lat.u = "graus";
		// 	//   decoded.modules.push(lat);

		// 	//   var lng = {};
		// 	//   lng.v = (bytes[index++]);
		// 	//   aux = ((bytes[index++]<<16) |(bytes[index++]<<8) | (bytes[index++]));
		// 	//   aux = aux / 1000000.0;
		// 	//   if (lng.v > 127)
		// 	//   {
		// 	//       lng.v = -((255 - lng.v)+1)-aux;  //complemento de 2
		// 	//   }
		// 	//   else
		// 	//   {
		// 	//       lng.v = lng.v + aux;
		// 	//   }
		// 	//   lng.n = "longitude";
		// 	//   lng.u = "graus";
		// 	//   decoded.modules.push(lng);
		// 	//   break;

		case 0x0B:
			sb.WriteString("data_counter=")
			v := uint64(bytes[i+1]) << 8
			v |= uint64(bytes[i+2])
			f := float64(v)
			sb.WriteString(strconv.FormatFloat(f, 'f', -1, 64))
			sb.WriteString(",")
			i = i + 2

		case 0x0C:
			sb.WriteString("data_boardVoltage=")
			v := uint64(bytes[i+1]) << 8
			v |= uint64(bytes[i+2])
			f := float64(v) / 1000
			sb.WriteString(strconv.FormatFloat(f, 'f', -1, 64))
			sb.WriteString(",")
			i = i + 2

			// 	// case 0x0D:
			// 	//   switch(contador_0d++)
			// 	//   {
			// 	//       case 0:
			// 	//           var AnalogicInput1 = {};
			// 	//           AnalogicInput1.v = (bytes[index++]<<8) | bytes[index++]; //`${bytes[index++]}${bytes[index++]}`;
			// 	//           AnalogicInput1.n = "AnalogicInput1";
			// 	//           AnalogicInput1.u = "uAD";
			// 	//           decoded.modules.push(AnalogicInput1);
			// 	//           break;
			// 	//       case 1:
			// 	//           var AnalogicInput2 = {};
			// 	//           AnalogicInput2.v = (bytes[index++]<<8) | bytes[index++];
			// 	//           AnalogicInput2.n = "AnalogicInput2";
			// 	//           AnalogicInput2.u = "uAD";
			// 	//           decoded.modules.push(AnalogicInput2);
			// 	//           break;
			// 	//       case 2:
			// 	//           var AnalogicInput3 = {};
			// 	//           AnalogicInput3.v = (bytes[index++]<<8) | bytes[index++];
			// 	//           AnalogicInput3.n = "AnalogicInput3";
			// 	//           AnalogicInput3.u = "uAD";
			// 	//           decoded.modules.push(AnalogicInput3);
			// 	//           break;
			// 	//       case 3:
			// 	//           var AnalogicInput4 = {};
			// 	//           AnalogicInput4.v = (bytes[index++]<<8) | bytes[index++];
			// 	//           AnalogicInput4.n = "AnalogicInput4";
			// 	//           AnalogicInput4.u = "uAD";
			// 	//           decoded.modules.push(AnalogicInput4);
			// 	//           break;
			// 	//   }

			// 	//   break;

			// 	// case 0x0E:
			// 	//     //data.energy = data.remainingData.slice(0,6);
			// 	//     bytes[index++];bytes[index++];
			// 	//     bytes[index++];
			// 	//     break;

			// 	// case 0x0F:
			// 	//     //data.rfid = data.remainingData.slice(0,16);
			// 	//     bytes[index++];bytes[index++];
			// 	//     bytes[index++];bytes[index++];
			// 	//     bytes[index++];bytes[index++];
			// 	//     bytes[index++];bytes[index++];
			// 	//     break;

		case 0x10:
			sb.WriteString("data_ad=")
			v := uint64(bytes[i+1]) << 8
			v |= uint64(bytes[i+2])
			sb.WriteString(strconv.FormatUint(v, 16))
			sb.WriteString(",")
			i = i + 2

			// 	// case 0x11:
			// 	//     //data.currentLoop = data.remainingData.slice(0,4);
			// 	//     bytes[index++];bytes[index++];
			// 	//     break;

			// 	// case 0x12:
			// 	//     //data.color = data.remainingData.slice(0,4);
			// 	//     bytes[index++];bytes[index++];
			// 	//     break;

			// 	// case 0x13:
			// 	//   var analog_in = {};
			// 	//   analog_in.v = (bytes[index++]<<8) | bytes[index++];
			// 	//   analog_in.n = "distance";
			// 	//   analog_in.u = "mm";
			// 	//   decoded.modules.push(analog_in);
			// 	//   break;

			// 	// case 0x14:
			// 	//     //data.heartbeat = data.remainingData.slice(0,4);
			// 	//     bytes[index++];bytes[index++];
			// 	//     break;

			// 	// case 0x15:
			// 	//     //data.oxigenVolume = data.remainingData.slice(0,4);
			// 	//     bytes[index++];bytes[index++];
			// 	//     break;

			// // case 0x16:
			// //     //data.fastFourierTransform = data.remainingData.slice(0,34);
			// //     bytes[index++];bytes[index++];
			// //     break;
			// // }
		}
	}

	// fmt.Printf("DATA_PARSED: %v\n", sb.String())
	return sb.String()
}

func b64ToHex(b64 string) (string, error) {
	p, err := base64.StdEncoding.DecodeString(b64)
	if err != nil {
		log.Fatal(err)
	}
	h := hex.EncodeToString(p)
	return h, err
}

func b64ToByte(b64 string) ([]byte, error) {
	b, err := base64.StdEncoding.DecodeString(b64)
	if err != nil {
		log.Fatal(err)
	}
	return b, err
}

func byteToString(b []byte) string {
	s := hex.EncodeToString(b)
	return s
}

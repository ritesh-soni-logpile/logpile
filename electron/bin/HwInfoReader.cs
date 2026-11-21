using System;
using System.IO.MemoryMappedFiles;
using System.Text;
using System.Threading;

class HwInfoReader {
    static void Main(string[] args) {
        bool loop = args.Length > 0 && args[0] == "--watch";
        do {
            try {
                using (var mmf = MemoryMappedFile.OpenExisting("Global\\HWiNFO_SENS_SM2", MemoryMappedFileRights.Read))
                using (var accessor = mmf.CreateViewAccessor(0, 0, MemoryMappedFileAccess.Read)) {
                    uint sig = accessor.ReadUInt32(0);
                    if (sig == 0x53695748) { // "HWiS"
                        // Packed structure (1-byte alignment)
                        uint offsetReadings = accessor.ReadUInt32(32);
                        uint sizeReading = accessor.ReadUInt32(36);
                        uint numReadings = accessor.ReadUInt32(40);

                        // Fallback check if 64-bit aligned
                        if (sizeReading < 280 || sizeReading > 350) {
                            offsetReadings = accessor.ReadUInt32(36);
                            sizeReading = accessor.ReadUInt32(40);
                            numReadings = accessor.ReadUInt32(44);
                        }

                        double bestTemp = -1;
                        for (uint i = 0; i < numReadings; i++) {
                            long rPos = offsetReadings + (i * sizeReading);
                            uint rType = accessor.ReadUInt32(rPos);
                            if (rType == 1) { // SENSOR_TYPE_TEMP
                                byte[] labelBytes = new byte[128];
                                accessor.ReadArray(rPos + 12, labelBytes, 0, 128);
                                string label = Encoding.ASCII.GetString(labelBytes).TrimEnd('\0');

                                byte[] userBytes = new byte[128];
                                accessor.ReadArray(rPos + 140, userBytes, 0, 128);
                                string userLabel = Encoding.ASCII.GetString(userBytes).TrimEnd('\0');

                                double val = accessor.ReadDouble(rPos + 284);

                                string check = (userLabel + " " + label).ToLowerInvariant();
                                if (check.Contains("cpu package") || check.Contains("cpu (tctl/tdie)") || check.Contains("core max") || check.Contains("cpu core")) {
                                    if (val > 15 && val < 115) {
                                        bestTemp = val;
                                        break;
                                    }
                                } else if (bestTemp < 0 && check.Contains("cpu") && val > 15 && val < 115) {
                                    bestTemp = val;
                                }
                            }
                        }

                        if (bestTemp > 0) {
                            Console.WriteLine("CPU_TEMP:" + Math.Round(bestTemp));
                        }
                    }
                }
            } catch {
                // Shared memory not active or closed
            }

            if (loop) Thread.Sleep(1500);
        } while (loop);
    }
}

# This is a sample Python script.
import logging
from pprint import pprint
from openthread_cli_interface import OTCommunicator
import json
import jsonpickle
from webui import run

"""@dataclass
class ThreadNode:
    ExtAddress: bytes
    RLoc16: int
    TLVs: dict[TLVTypes, TLV]
    LeaderData: LeaderData

    @staticmethod
    def _parse_record(data: str):
        tlv_type = int(data[:2], 16)
        record_len = int(data[2:4], 16)
        record = data[4:4 + (record_len * 2)]
        return TLV(TLVTypes(tlv_type), record_len, record.encode('utf-8')), data[4 + (record_len * 2):]

    @staticmethod
    def from_net_diag(data: str):
        cmd, s = data.split(' ')

        tlvs: dict[TLVTypes, TLV] = {}

        while True:
            tlv, s = ThreadNode._parse_record(s)
            tlvs[tlv.type] = tlv
            if s == '':
                break

        return ThreadNode.from_tlvs(tlvs)

    @staticmethod
    def from_tlvs(tlvs: dict[TLVTypes, TLV]):
        ext_addr = tlvs[TLVTypes.ExtAddress].ext_address
        rloc16 = tlvs[TLVTypes.RLOC16].rloc16
        routers = tlvs[TLVTypes.RouteData].route_data
        ld = tlvs[TLVTypes.LeaderData].leader_data
        childs = tlvs[TLVTypes.ChildTable].chidl_table
        pprint(childs)
        return ThreadNode(ext_addr, rloc16, tlvs, ld), routers
"""


# Press the green button in the gutter to run the script.
if __name__ == '__main__':

    run()

    logging.basicConfig(level=logging.INFO, format='%(name)s - %(levelname)s - %(message)s')

    OTComm = OTCommunicator('COM9')
    OTComm.initialize_communication(0x1234, '00112233445566778899aabbccddeeff', 26)
    OTComm.query_routers()
    OTComm.build_nodes_from_tlvs()
    #pprint(OTComm.nodes)
    pprint(jsonpickle.encode(OTComm.nodes), indent=2)
    #for tlv in OTComm.TLVs:
    #pprint(OTComm.TLVs)
    #OTComm.get_diag_info()


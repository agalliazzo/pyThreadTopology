import json
from json import JSONEncoder
import time
import logging
import serial
from serial import Serial
import serial.tools.list_ports
from dataclasses import dataclass
from enum import IntEnum
from typing import Any

class myEncoder(JSONEncoder):
    def default(self, o: Any) -> str:
        if isinstance(o, dict):
            return o
        if isinstance(o, bytearray or bytes):
            return o.hex()
        return o.__dict__


class TLVTypes(IntEnum):
    """
    Enum to categorize the TLV received by the communication class
    """
    ExtAddress = 0
    RLOC16 = 1
    RouteData = 5
    LeaderData = 6
    ChildTable = 16


@dataclass
class RouteData:
    """
    Class representing the route information
    """
    RouteId: int
    LinkQualityOut: int
    LinkQualityIn: int
    RouteCost: int


@dataclass
class LeaderData:
    """
    Class representing the Leader information
    """
    PartitionId: int
    Weighting: int
    DataVersion: int
    StableDataVersion: int
    LeaderRouterId: int


@dataclass
class ChildData:
    """
    Class representing a router child information
    """
    Timeout: int
    RSV: int
    Id: int
    receiver_on_when_idle: bool
    secure_data_request: bool
    device_type: bool
    network_data: bool

    @property
    def mode(self):
        mode = self.receiver_on_when_idle << 3
        mode = mode | self.secure_data_request << 2
        mode = mode | self.device_type << 1
        mode = mode | self.network_data << 0
        return mode

    @staticmethod
    def mode_to_bool(mode: int):
        receiver_on_when_idle = (mode & 0x08) != 0
        secure_data_request = (mode & 0x04) != 0
        device_type = (mode & 0x02) != 0
        network_data = (mode & 0x01) != 0
        return receiver_on_when_idle, secure_data_request, device_type, network_data


@dataclass
class TLV:
    """
    Class misrepresenting a TLV. Based on the type attribute some function can be called to better extract data
    TODO: Maybe we can implements different classes based on type... this is only the faster solution, not the prettiest
    """
    type: TLVTypes
    len: int
    data: bytes

    @staticmethod
    def from_net_diag(data: bytes) -> tuple['TLV', bytes]:
        tlv_type = int(data[:2], 16)
        record_len = int(data[2:4], 16)
        record = data[4:4 + (record_len * 2)]
        return TLV(TLVTypes(tlv_type), record_len, record.encode('utf-8')), data[4 + (record_len * 2):]

    @property
    def ext_address(self) -> bytearray:
        if self.type != TLVTypes.ExtAddress:
            raise TypeError()
        out_bytes: bytearray = bytearray()
        for i in range(0, self.len*2, 2):
            out_bytes += bytes.fromhex(self.data[i:i+2].decode('utf-8'))

        return out_bytes

    @property
    def ext_address_str(self) -> str:
        return self.ext_address.hex()

    @property
    def rloc16(self) -> int:
        if self.type != TLVTypes.RLOC16:
            raise TypeError()
        return int(self.data, 16)

    @property
    def router_id(self) -> int:
        if self.type != TLVTypes.RLOC16:
            raise TypeError()
        return int(self.data, 16) >> 10

    @property
    def route_data(self) -> dict[int, RouteData]:
        if self.type != TLVTypes.RouteData:
            raise TypeError()
        routers: dict[int, RouteData] = {}
        id_sequence = int(self.data[:2], 16)
        router_ids = self.data[2:18]
        route_count = 0
        for i in range(64):
            rbyte = int(i / 8) * 2
            rmask = int(router_ids[rbyte:rbyte+2], 16)
            route_id = i
            if rmask & (0x80 >> i % 8):
                r_data = int(self.data[18 + (route_count*2):18+(route_count*2)+2], 16)
                l_q_o = (r_data >> 6) & 0x03
                l_q_i =  (r_data >> 4) & 0x03
                r_c =  r_data & 0x0f
                routers[route_id] = RouteData(route_id, l_q_o, l_q_i, r_c)
                route_count = route_count + 1

        return routers

    @property
    def leader_data(self) -> LeaderData:
        if self.type != TLVTypes.LeaderData:
            raise TypeError()

        p_id = int(self.data[:8], 16)
        weight = int(self.data[8:10], 16)
        data_version = int(self.data[10:12], 16)
        stable_data_version = int(self.data[12:14], 16)
        leader_router_id = int(self.data[14:16], 16)
        return LeaderData(p_id, weight, data_version, stable_data_version, leader_router_id)

    @property
    def child_table(self) -> dict[int, ChildData]:
        if self.type != TLVTypes.ChildTable:
            raise TypeError()

        children: dict[int, ChildData] = {}

        for i in range(0, self.len, 6):
            subs = self.data[i:(i+6)]
            child_data = int(subs, 16)
            timeout = (child_data >> 19) & 0x1f
            rsv = (child_data >> 17) & 0x03
            id = (child_data >> 8) & 0x1ff
            mode = (child_data >> 8) & 0xff
            children[id] = ChildData(timeout, rsv, id, *ChildData.mode_to_bool(mode))

        return children

    @property
    def is_router(self) -> bool:
        return (self.rloc16 & 0x00ff) == 0


@dataclass
class ThreadNode:
    """
    Class describing a thread node
    """
    label: str
    x_pos: float
    y_pos: float
    rloc16: int
    extended_address: bytes
    router: bool
    route_data: dict[int, RouteData]
    leader_data: LeaderData
    children: dict[int, 'ThreadNode']
    router_id: int

    def __init__(self):
        self.router_id = 0
        pass

    def __str__(self) -> str:
        """
        get a string representation of useful information of the node
        :return:
        """
        routes = [v for k, v in self.route_data.items()]
        filtered = list(filter(lambda x: (x.RouteCost == 1), routes))
        return f'Node: {"".join(format(x, "02x") for x in self.extended_address)} - Routes: {", ".join(str(x) for x in filtered)}'

    def __repr__(self) -> str:
        return self.__str__()


class OTCommunicator:
    """
    Class to manage serial communication and basic network services with the Openthread CLI board.
    """

    def __init__(self):
        self.ser: Serial = None
        self.port: str = 'COM9'
        self.receiver_state = ''
        self.thread_state = 'disabled'
        self.mleid_ipaddr: str = ''
        self.rloc16: int = 0
        self.routers_id: list[int] = []
        self.TLVs: dict[str, dict[TLVTypes, TLV]] = {}
        self.net_diag_ip: str = ''
        self.nodes: dict[str, ThreadNode] = {}
        self.file_objects: dict[str, object] = {}

    def open(self, port: str):
        self.port = port
        self.ser: Serial = Serial(port=self.port, baudrate=115200, parity=serial.PARITY_NONE, bytesize=serial.EIGHTBITS,
                   stopbits=serial.STOPBITS_ONE, timeout=5, xonxoff=False, rtscts=True, dsrdtr=True, writeTimeout=1)
        self.ser.rts = True
        self.ser.dtr = True
        self.ser.flushInput()
        self.ser.flushOutput()

    def close(self):
        self.ser.close()

    @staticmethod
    def get_port_list() -> list[str]:
        ports = serial.tools.list_ports.comports()
        return [port for port, _, _ in ports]

    def _parse_incoming_data(self, data: str) -> bool:
        """
        Process incoming data from the Openthread CLI device
        :param data: data received from serial port
        :return: True if the command is complete, False otherwise
        """
        data = data.strip()
        data = data.strip('> ')

        if 'Error' in data or data == 'Done':
            return True

        match self.receiver_state:
            case '':
                self.receiver_state = data
                if data.startswith('networkdiagnostic get'):
                    self.receiver_state = 'networkdiagnostic'
                    s = data.split(' ')
                    self.net_diag_ip = s[2]

            case 'state':
                self.thread_state = data
            case 'ipaddr mleid':
                self.mleid_ipaddr = data
            case 'rloc16':
                self.rloc16 = int(data, 16)
            case 'router list':
                routers = data.split(' ')
                self.routers_id = [int(x) for x in routers]
            case 'networkdiagnostic':
                if data == '':
                    return False
                cmd, s = data.split(' ')
                while True:
                    tlv, s = TLV.from_net_diag(s)
                    if self.net_diag_ip not in self.TLVs:
                        self.TLVs[self.net_diag_ip] = {}
                    self.TLVs[self.net_diag_ip][tlv.type] = tlv
                    if s == '':
                        break

                return True
            case _:
                if 'networkdiagnostic' in data:
                    self.receiver_state = 'networkdiagnostic'
        return False

    def _send_command(self, command: str) -> None:
        """
        Send a command to the NRF board
        :param command: Command to be sent
        :return:
        """

        full_command = f'{command}\r\n'.encode('utf-8')
        logging.debug('Sending command:')
        logging.debug(f'==>{full_command}')
        self.ser.write(full_command)
        self.receiver_state = ''
        while True:
            ret = self.ser.read_until(b'\n')
            if ret == b'':
                self._netdiag_timeout = self._netdiag_timeout + 1
                if self._netdiag_timeout > 3:
                    return
                continue
            logging.debug(f'<=={ret}')
            if self._parse_incoming_data(ret.decode('utf-8')):
                return

    def initialize_communication(self, pan_id: int, network_key: str, channel: int, full_init: bool = False) -> None:
        """
        Start the communication with the NRF board and set up basic functionalities
        :param full_init: If true do a full reset setting up network information
        :param pan_id: PanID to use on a full reset
        :param network_key: Network key to use on a full reset
        :param channel: Channel to use on a full reset
        :return: None
        """

        # Load JSON file for nodes
        self.load_configuration()

        # Join the Thread network
        self._send_command('state')

        if self.thread_state == 'detached' or self.thread_state == 'disabled':
            self._send_command('thread stop')
            self._send_command(f'channel {channel}')
            self._send_command(f'panid 0x{pan_id:04x}')
            self._send_command(f'masterkey {network_key}')
            self._send_command('ifconfig up')
            self._send_command('thread start')

        #Wait for state to become a child, then, ask to became a router, if already a router continue
        while True:
            self._send_command('state')
            if self.thread_state == 'child':
                self._send_command('state router')

            if self.thread_state == 'router' or self.thread_state == 'leader':
                break
            time.sleep(1)

        #Get some infos about this node
        self._send_command('rloc16')
        self._send_command('router list')
        self._send_command('ipaddr mleid')

    @staticmethod
    def router_id_to_rloc(router_id: int) -> int:
        """
        Convert router id to RLOC16 (basically, shift 10 times the router id to the left
        :param router_id: Router id to convert
        :return: the RLOC16
        """
        return router_id << 10

    def _get_multicast_mleid(self, rloc16: int = None):
        """
        Get unicast router address from RLOC16
        :param rloc16: RLOC16
        :return: a string containign the IPv6 Address
        """
        s = self.mleid_ipaddr.split(':')
        rloc16 = self.rloc16 if rloc16 is None else rloc16
        return f'{s[0]}:{s[1]}:{s[2]}:{s[3]}:0:ff:fe00:{rloc16:04x}'

    def get_diag_info(self, rloc16: int = None) -> None:
        """
        Send a diagnostic get query to the network
        :return: None
        """
        rloc16 = self.rloc16 if rloc16 is None else rloc16
        self._netdiag_timeout = 0
        self._send_command(f'networkdiagnostic get {self._get_multicast_mleid(rloc16)} 0 1 5 6 16')

    def query_routers(self):
        """
        Query all the discovered router for network diagnostics
        :return:
        """
        self.load_configuration()
        logging.info("Starting to query each router for network diagnostic information ")
        for router in self.routers_id:
            logging.info("Querying router %#2x", router)
            self.get_diag_info(self.router_id_to_rloc(router))

    def build_nodes_from_tlvs(self) -> None:
        """
        After quering the routers, use the received TLV data to build some ThreadNode objects that properly describe
        the network
        :return: None
        """
        logging.info("Staring building nodes from received TLVs")

        for ip_addr, tlvs in self.TLVs.items():
            ext_addr_str = tlvs[TLVTypes.ExtAddress].ext_address_str
            node = ThreadNode() if ext_addr_str not in self.nodes else self.nodes[ext_addr_str]

            if ext_addr_str in self.file_objects:
                fo: dict[str, object] = self.file_objects[ext_addr_str]
                node.label = fo['label']
                node.x_pos = fo['x_pos'] if 'x_pos' in fo else None
                node.y_pos = fo['y_pos'] if 'y_pos' in fo else None

            node.extended_address = tlvs[TLVTypes.ExtAddress].ext_address
            node.rloc16 = tlvs[TLVTypes.RLOC16].rloc16
            node.router = tlvs[TLVTypes.RLOC16].is_router
            node.router_id = tlvs[TLVTypes.RLOC16].router_id if node.router else 0
            node.route_data = tlvs[TLVTypes.RouteData].route_data
            node.leader_data = tlvs[TLVTypes.LeaderData].leader_data
            node.children = tlvs[TLVTypes.ChildTable].child_table
            self.nodes[ext_addr_str] = node
        logging.info("Node build")
        self.save_configuration()

    def load_configuration(self):
        with open('nodes.json', 'r') as f:
            try:
                self.file_objects = json.load(f)
            except json.JSONDecodeError:
                pass

    def save_configuration(self):
        with open('nodes.json', 'w') as f:
            f.write(json.dumps(self.nodes, cls=myEncoder, indent=4))

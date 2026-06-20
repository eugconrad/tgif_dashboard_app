class DMR_SESSION {
    constructor(data) {
        this.uuid = (data.uuid === null ? "" : data.uuid)
        this.r_uuid = (data.r_uuid === null ? "" : data.r_uuid)
        this.ts1_talkgroup = (data.ts1_talkgroup === null ? "" : data.ts1_talkgroup);
        this.ts2_talkgroup = (data.ts2_talkgroup === null ? "" : data.ts2_talkgroup);
        this.ts1_flags = (data.ts1_flags === null ? "" : data.ts1_flags);
        this.ts2_flags = (data.ts2_flags === null ? "" : data.ts2_flags);
        this.last_ping = (data.last_ping === null ? "" : data.last_ping);
        this.state = (data.state === null ? "" : data.state);
        this.salt = (data.salt === null ? "" : data.salt);
        this.flags = (data.flags === null ? "" : data.flags);
        this.slots = (data.slots === null ? "" : data.slots);
        this.attrib = (data.attrib === null ? "" : data.attrib);
        this.port = (data.port === null ? "" : data.port);
        this.security_level = (data.security_level === null ? "" : data.security_level);
        this.hotspot_security = (data.hotspot_security === null ? "" : data.hotspot_security);
        this.ip_addr = (data.ip_addr === null ? "" : data.ip_addr);
        this.ip_addr_str = (data.ip_addr === null ? "ERR" : utils.int2ip(parseInt(data.ip_addr)));
        this.last_src_id = (data.last_src_id === null ? "" : data.last_src_id);
        this.callsign = (data.callsign === null ? "" : data.callsign);
        this.tx_power = (data.tx_power === null ? "" : data.tx_power);
        this.colorcode = (data.colorcode === null ? "" : data.colorcode);
        this.latitude = (data.latitude === null ? "" : data.latitude);
        this.longitude = (data.longitude === null ? "" : data.longitude);
        this.height = (data.height === null ? "" : data.height);
        this.location = (data.location === null ? "" : data.location);

        this.package_id = (data.package_id === null ? "" : data.package_id);
        this.software_id = (data.software_id === null ? "" : data.software_id);
        this.description = (data.description === null ? "" : data.description);
        this.rx_freq = (data.rx_freq === null ? "" : data.rx_freq);
        this.tx_freq = (data.tx_freq === null ? "" : data.tx_freq);
        this.url = (data.url === null ? "" : data.url);

        this.cacheExpiration = utils.get_unix_time() + (60 * 15);
    }
}
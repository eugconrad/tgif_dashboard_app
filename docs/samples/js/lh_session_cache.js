class SessionCache {
    constructor() {
        this.sessions = [];
    }
    size() {
        return this.sessions.length;
    }
    contains(data) {
        var key = this.key(data);
        if (key === false) return false;

        if (key in this.sessions) {
            return true;
        }
        return false;
    }
    key(data) {
        if (!isDefined(data) || typeof (data) != "object") return false;
        if (data.radio_id == 0 || data.repeater_id == 0) return false;
        return String(data.radio_id) + String(data.repeater_id);
    }
    lookup(radio_id, repeater_id) {
        var key = String(radio_id) + String(repeater_id);
        if (key in this.sessions) {
            return this.sessions[key];
        }
        return false;
    }
    lookup(key) {
        if (key in this.sessions) {
            return this.sessions[key];
        }
        return false;
    }
    add(data) {
        var key = this.key(data);
        if (key === false) return false;

        var tmpdat = {};
        for (let key in data) {
            if ('key' == 'admin') {
                for (let keyz in data['admin']) {
                    tmpdat[keyz] = data['admin'][keyz];
                }
            }
            tmpdat[key] = data[key];
        }

        this.sessions[key] = tmpdat;
    }
}



var seshCache = (typeof seshCache == "undefined" ? null : seshCache);

setTimeout(function () {
    if (typeof seshCache == "undefined" || seshCache === null) {
        seshCache = new SessionCache();
    }
}, 100);
module.exports.eventHandler = (function(options) {
    let self = this;
    let events = {};

    let emit = (e, data) => {
        if(events[e] && Array.isArray(events[e])) {
            for(let i = 0; i < events[e].length; i++) {
                if(events[e][i] && typeof(events[e][i]) === "function") {
                    events[e][i](data);
                }
            }
        }
        data = null;
    }

    let on = (e, c) => {
        events[e] = events[e] || [];
        events[e].push(c);
    }

    let off = (e, c) => {
        if(events[e]) {
            let i = events[e].indexOf(c);
            if(i >= 0)
                events[e].splice(index, 1);
        }
    }

    return {
        emit: emit,
        on : on,
        off: off
    };
} )();
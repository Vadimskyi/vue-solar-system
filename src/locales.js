let locales = {}, locale = {};

module.exports.createLocaleMixin = (dataProvider) => {
    return {
        data: {
            langs: [],
            selectedLang: ""
        },
        computed: {
            selectedLangComp: {
                get: function () {
                    return this.selectedLang;
                },
                set: function (val) {
                    if (!locales[val]) return;
                    this.selectedLang = val;
                    locale = locales[val];
                }
            }
        },
        methods: {
            getComplectationPopupText(key, id, id2, id3, id4) {
                if (this.selectedLang == "" || !locales[this.selectedLang].complectationPopup[key]) return;
                let filter = [];
                switch (key) {
                    case "eModules":
                        if (this.selectedEModule.id) {
                            filter = locales[this.selectedLang].complectationPopup[key].filter(f => {
                                return f.id == this.selectedEModule.id;
                            });
                            if (filter.length > 0) {
                                return filter[0][id];
                            }
                        }
                        break;
                    case "eFastening":
                        if (this.selectedEFastening.id) {
                            filter = locales[this.selectedLang].complectationPopup[key].filter(f => {
                                return f.id == this.selectedEFastening.id;
                            });
                            if (filter.length > 0) {
                                return filter[0][id];
                            }
                        }
                        break;
                    case "generalInfo":
                        if (this.selectedPricing.id) {
                            filter = locales[this.selectedLang].complectationPopup[key].filter(f => {
                                return f.id == this.selectedPricing.id;
                            });
                            if (filter.length > 0) {
                                if (id4)
                                    return filter[0][id][id2][id3][id4];
                                if (id3)
                                    return filter[0][id][id2][id3];
                                if (id2)
                                    return filter[0][id][id2];
                                return filter[0][id];
                            }
                        }
                        return locales[this.selectedLang].complectationPopup[key][id];
                        break;
                    case "gridText":
                        return locales[this.selectedLang].complectationPopup[key][id];
                        break;
                }
                return "";
            },
            getBankText(id) {
                if (this.selectedLang == "" || !locales[this.selectedLang].bankTexts || !this.selectedBank.id) return;
                let filter = locales[this.selectedLang].bankTexts.filter(f => f.id == this.selectedBank.id);
                if (filter.length > 0) {
                    return filter[0][id];
                }
                return;
            },
            getCreditPopupText(id, id2, id3) {
                if (this.selectedLang == "" || !locales[this.selectedLang].creditPopupText) return;

                if (id3)
                    return locales[this.selectedLang].creditPopupText[id][id2][id3];
                if (id2)
                    return locales[this.selectedLang].creditPopupText[id][id2];
                else
                    return locales[this.selectedLang].creditPopupText[id];
            },
            getIncomeGridSummaryText(id) {
                if (this.selectedLang == "" || !locales[this.selectedLang].incomeGridSummaryText) return;
                return locales[this.selectedLang].incomeGridSummaryText[id];
            },
            getIncomeGridYearlyText(id) {
                if (this.selectedLang == "" || !locales[this.selectedLang].incomeGridYearlyText) return;
                return locales[this.selectedLang].incomeGridYearlyText[id];
            },
            getIncomeGridFirstYearText(id) {
                if (this.selectedLang == "" || !locales[this.selectedLang].incomeGridFirstYearText) return;
                return locales[this.selectedLang].incomeGridFirstYearText[id];
            },
            getInitialGridText(id) {
                if (this.selectedLang == "" || !locales[this.selectedLang].initialGridText) return;
                return locales[this.selectedLang].initialGridText[id];
            },
            getComplectationDetaisText() {
                if (this.selectedLang == "" || !locales[this.selectedLang].complectationDetails) return;
                return locales[this.selectedLang].complectationDetails;
            },
            getComplectationPricingText(id, fields) {
                if (this.selectedLang == "" || !locales[this.selectedLang].complectationPricing[id - 1]) return;
                return fields ? locales[this.selectedLang].complectationPricing[id - 1].fields : locales[this.selectedLang].complectationPricing[id - 1].name;
            },
            getRegionText(id) {
                if (!id) id = this.selectedRegion.id;
                if (this.selectedLang == "" || !locales[this.selectedLang].regions[id - 1]) return;
                return locales[this.selectedLang].regions[id - 1].name;
            },
            getMonthText(id, short) {
                if (this.selectedLang == "" || !locales[this.selectedLang].months[id - 1]) return;
                return short ? locales[this.selectedLang].months[id - 1].shortName : locales[this.selectedLang].months[id - 1].name;
            },
            getLabelText(id) {
                if (this.selectedLang == "") return;
                return locales[this.selectedLang].labels[id];
            },
            getButtonText(id) {
                if (this.selectedLang == "") return;
                return locales[this.selectedLang].buttons[id];
            },
            getTitleText(id) {
                if (this.selectedLang == "") return;
                return locales[this.selectedLang].titles[id];
            },
            getUnitsText(id) {
                if (this.selectedLang == "") return;
                return locales[this.selectedLang].units[id];
            },
            formatNumber(number, round) {
                if (Number.isNaN(number) || number == undefined || number == null) return "";
                if (round)
                    number = Math.round(number);
                let str = number + "";
                str = str.replace('.', ",");
                let pair = [];
                let beyond = str.indexOf(',') == -1;
                let i = 0;
                for (let index = str.length - 1; index >= 0; index--) {
                    if (str[index] == ',') {
                        beyond = true;
                        continue;
                    }
                    if (beyond) i++;
                    if ((i) % 3 == 0 && (index - 1) >= 0 && str[index - 1] != ',' && beyond) {
                        pair.push({
                            index: index,
                            insert: " "
                        });
                    }
                }
                let result = str;
                let length = str.length;
                for (let index = 0; index < pair.length; index++) {
                    result = result.slice(0, pair[index].index) + " " + result.slice(pair[index].index, result.length);
                }
                return result;
            }
        },
        mounted() {
            dataProvider.getLocales(data => {
                locales = data;
                this.langs = Object.keys(locales);
                this.selectedLangComp = window._defaultLocale;
                this.$forceUpdate();
            })
        }
    }
};
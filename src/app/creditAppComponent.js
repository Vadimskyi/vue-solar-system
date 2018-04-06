module.exports.createCreditApp = (dataProvider, eventHandler, mixins) => {
    return new Vue({
        el: '#credit-app',
        data: {
            isPopupActive: false,
            dollarValue: 0,
            creditOneTimeCommission: 0,
            initialFee: {},
            creditTerm: {},
            avaliableBanks: [],
            bankSchemas: [],
            selectedBank: {},
            selectedPlan: {},
            selectedSchema: {
                main: {},
                second: {}
            },
            cachedSchemePeriods: {}
        },
        mixins: mixins,
        computed: {
            selectedPlanComp: {
                get: function () {
                    return this.selectedPlan;
                },
                set: function (plan) {
                    this.selectedPlan = plan;
                    this.creditTerm = this.selectedPlan.creditTerm;
                    this.initialFee = this.selectedPlan.initialFee;
                }
            },
            commission() {
                let price = dataProvider.getComplectationPrice();
                return Math.round10(price * this.creditOneTimeCommission / 100, -1);
            },
            selectedBankComp: {
                get: function () {
                    return this.selectedBank;
                },
                set: function (bank) {
                    this.selectedBank = bank;
                    this.selectedSchema = this.setBankSchema(bank.id);
                }
            },
            isApplyDisabled() {
                return this.getYearlyPercent() <= 0;
            }
        },
        methods: {
            creditSummary(currency) {
                let usd = Math.round10((this.getMonthlyPayment("USD") * this.creditTerm.current) + this.getInitialFee("USD") + this.getCommission("USD"), -1);
                this.selectedPlan.selectedCreditSummary = usd;
                switch (currency) {
                    case "UAH":
                        return Math.round10(usd * this.dollarValue, -1);
                    case "USD":
                    default:
                        return usd;
                }
            },
            getMonthlyPayment(currency) {
                if (this.creditTerm.current == 0 || (this.initialFee.current < this.initialFee.min || this.initialFee.current > this.initialFee.max)) return 0;
                let i = (this.getYearlyPercent() / 12) / 100;
                let n = this.creditTerm.current;

                let k = (i * Math.pow((1 + i), n)) / (Math.pow((1 + i), n) - 1);
                let usa = Math.round10(k * this.getCreditedMoney(), -1);
                this.selectedPlan.selectedMonthlyPayment = usa;
                switch (currency) {
                    case "UAH":
                        return Math.round10(usa * this.dollarValue, -1);
                    case "USD":
                    default:
                        return usa;
                }
            },
            getCreditedMoney() {
                this.selectedPlan.selectedCreditedMoney = this.getNormalPrice("USD") - this.getInitialFee("USD");
                return this.selectedPlan.selectedCreditedMoney;
            },
            getNormalPrice(currency) {
                let usa = dataProvider.getComplectationPrice();
                let delta = 0;
                if (this.selectedPlan.increaseInTotalValue > 0 && dataProvider.increaseInPrice == 0) {
                    delta = usa * this.selectedPlan.increaseInTotalValue / 100;
                    usa += delta;
                } else if (this.selectedPlan.increaseInTotalValue == 0 && dataProvider.increaseInPrice > 0) {
                    usa = dataProvider.getComplectationPriceLocal();
                }
                switch (currency) {
                    case "UAH":
                        return Math.round10(usa * this.dollarValue, -1);
                    case "USD":
                    default:
                        return usa;
                }
            },
            getCommission(currency) {
                if (this.creditTerm.current == 0 || (this.initialFee.current < this.initialFee.min || this.initialFee.current > this.initialFee.max)) return 0;
                let price = this.getNormalPrice("USD");
                let usa = Math.round10((price - this.getInitialFee("USD")) * this.creditOneTimeCommission / 100, -1);
                this.selectedPlan.selectedCommission = usa;
                switch (currency) {
                    case "UAH":
                        return Math.round10(usa * this.dollarValue, -1);
                    case "USD":
                    default:
                        return usa;
                }
            },
            getInitialFee(currency) {
                if (this.creditTerm.current == 0 || (this.initialFee.current < this.initialFee.min || this.initialFee.current > this.initialFee.max)) return 0;
                let price = this.getNormalPrice("USD");
                let usa = Math.round10(price * this.initialFee.current / 100, -1);
                this.selectedPlan.selectedInitialFeeDollars = usa;
                switch (currency) {
                    case "UAH":
                        return Math.round10(usa * this.dollarValue, -1);
                    case "USD":
                    default:
                        return usa;
                }
            },
            getYearlyPercent() {
                if (!this.selectedPlan.id) return 0;
                let month = this.creditTerm.current;
                let filerPeriod = this.selectedPlan.periods.filter(s => {
                    return month <= s.to && month >= s.from;
                });
                let filterFirstPayment = this.selectedPlan.firstPayments.filter(s => {
                    return this.initialFee.current >= s.from && this.initialFee.current <= s.to;
                });
                if (filerPeriod.length > 0 && filterFirstPayment.length > 0) {
                    let perId = filerPeriod[0].id;
                    let firstPid = filterFirstPayment[0].id;
                    let filterResult = this.selectedPlan.percentPerYear.filter(s => {
                        return s.firstPid == firstPid && s.perId == perId;
                    });
                    this.selectedPlan.selectedYearlyPercent = filterResult.length > 0 ? filterResult[0].value : 0;
                    return this.selectedPlan.selectedYearlyPercent;
                }

                return 0;
            },
            getSchemeForPeriod(pId) {
                if (!this.selectedSchema.main.percentPerYear) return {};
                if (!this.cachedSchemePeriods[pId]) {
                    let main = this.selectedSchema.main.percentPerYear.filter(p => p.perId == pId);
                    let second = this.selectedSchema.second.percentPerYear.filter(p => p.perId == pId);
                    this.cachedSchemePeriods[pId] = {
                        main: main,
                        second: second
                    };
                }
                return this.cachedSchemePeriods[pId];
            },
            getAvaliablePlans() {
                return [
                    this.selectedSchema.main,
                    this.selectedSchema.second
                ]
            },
            setBankSchema(id) {
                let filter = this.bankSchemas.filter(b => b.bId == id);
                if (filter.length > 0) {
                    let main = filter[0].isDependent ? filter[1] || {} : filter[0];
                    let second = !filter[0].isDependent ? filter[1] || {} : filter[0];
                    return {
                        main: main,
                        second: second
                    }
                }
            },
            resetSelectedCreditPlan() {
                eventHandler.emit("applySelectedCreditPlan", {
                    initialFee: {},
                    creditTerm: {},
                });
                /*incomeGridApp.applySelectedCreditPlan({
                    initialFee: {},
                    creditTerm: {},
                });*/
                this.selectedSchema = {
                    main: {},
                    second: {}
                };
                this.selectedPlan = {};
                this.selectedBank = {};
                dataProvider.increasePrice(0);
                this.isPopupActive = false;
            },
            applySelectedCreditPlan() {
                if (this.isApplyDisabled) return;
                document.getElementById('income-grid-initial-data').scrollIntoView();
                eventHandler.emit("applySelectedCreditPlan", this.selectedPlan);
                //incomeGridApp.applySelectedCreditPlan(this.selectedPlan);
                dataProvider.increasePrice(this.selectedPlan.increaseInTotalValue);
                this.isPopupActive = false;
            },
            openPopup() {
                this.isPopupActive = !this.isPopupActive;
            },
            selectBank(bank) {
                this.selectedSchema = this.setBankSchema(bank.id);
            },
            setDependency(data) {

            },
            validateFee(value) {
                this.initialFee.current = parseInt(this.initialFee.current, 10);
                if (value.keyCode == 8) return;
                dataProvider.getAllData((data) => {
                    if (Number.isNaN(this.initialFee.current))
                        this.initialFee.current = this.initialFee.default;
                    else if (this.initialFee.current > this.initialFee.max)
                        this.initialFee.current = this.initialFee.max;
                    else if (this.initialFee.current < 0)
                        this.initialFee.current = this.initialFee.min;
                })
            },
            validateFeeOnChange(value) {
                this.initialFee.current = parseInt(this.initialFee.current, 10);
                dataProvider.getAllData((data) => {
                    if (Number.isNaN(this.initialFee.current))
                        this.initialFee.current = this.initialFee.default;
                    else if (this.initialFee.current > this.initialFee.max)
                        this.initialFee.current = this.initialFee.max;
                    else if (this.initialFee.current < this.initialFee.min)
                        this.initialFee.current = this.initialFee.min;
                })
            },
            validateTerm(value) {
                this.creditTerm.current = parseInt(this.creditTerm.current, 10);
                if (value.keyCode == 8) return;
                dataProvider.getAllData((data) => {
                    if (Number.isNaN(this.creditTerm.current))
                        this.creditTerm.current = this.creditTerm.default;
                    else if (this.creditTerm.current > this.creditTerm.max)
                        this.creditTerm.current = this.creditTerm.max;
                    else if (this.creditTerm.current < 0)
                        this.creditTerm.current = this.creditTerm.min;
                });
            },
            validateTermOnChange(value) {
                this.creditTerm.current = parseInt(this.creditTerm.current, 10);
                dataProvider.getAllData((data) => {
                    if (Number.isNaN(this.creditTerm.current))
                        this.creditTerm.current = this.creditTerm.default;
                    else if (this.creditTerm.current > this.creditTerm.max)
                        this.creditTerm.current = this.creditTerm.max;
                    else if (this.creditTerm.current < this.creditTerm.min)
                        this.creditTerm.current = this.creditTerm.min;
                })
            }
        },
        mounted() {
            dataProvider.getAllData((allData) => {
                this.avaliableBanks = allData.avaliableBanks;
                this.bankSchemas = allData.bankSchemas;
                this.dollarValue = allData.dollarValue;
                this.creditOneTimeCommission = allData.creditOneTimeCommission;
            })
        }
    });
}

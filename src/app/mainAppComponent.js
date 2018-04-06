import {eventHandler} from '../calcEventHandler.js';
import {calcModel} from '../model/calcModel.js';
import {createCreditApp} from './creditAppComponent.js';
import {createLocaleMixin} from '../locales.js';


let last_known_scroll_position = 0,
  monthlyPowertChart, grandFinanceChart, angleToAzimuth = [],
  grandChartUpdated = {},
  gridFirstYearDom = {},
  gridSummaryDom = {},
  gridYearlyDom = {},
  grandSummaryDom = {},
  initialDataDom = {},
  profitabilityYear = 0;
let creditApp = {},
  complectationPricingApp = {},
  incomeGridApp = {},
  calculatorApp = {},
  localeApp = {};
let vueMainInstances = [];

const getAllData = (c) => {
  return c(window._allData);
};

const getLocales = (c) => {
  return c(window._locales);
}

const localeMixin = createLocaleMixin({
  getLocales: getLocales
});

let fetchDataForChart = (data) => {
  let labels = data.map((set) => set.name);
  let series = [];
  series[0] = data.map((set) => set.value);
  return {
    labels: labels,
    series: series
  };
}

/**
 * calculate chart data
 *
 * @param {Object} data month data from data.monthlyPowerGeneraion
 * @param {Number} summary yearly power generation from vue.summary
 */
let updateChartData = (data, type) => { //calculate chart data
  let series = [];
  let labels = [];
  series[0] = data.map((set) => Math.round(set.value));
  let size = getGraphSize(type);
  let options = {};
  switch (type) {
    case "MonthlyChart":
      if (!monthlyPowertChart) return;
      labels = data.map((set) => calculatorApp.getMonthText(set.id, true));

      options = {
        seriesBarDistance: 5,
        width: size.width,
        height: size.height,
        showZLabels: true
      };
      monthlyPowertChart.update({
        labels: labels,
        series: series
      }, options);
      break;
    case "GrandFinance":
      if (!grandFinanceChart) return;
      labels = data.map((set) => set.name);

      options = {
        seriesBarDistance: 5,
        width: size.width,
        height: size.height,
        showZLabels: false
      };
      grandFinanceChart.update({
        labels: labels,
        series: series
      }, options);
      grandChartUpdated["GrandFinance"] = new Date().getTime();
      break;
  }
}

let generatePowerChart = (data) => {
  let chartData = fetchDataForChart(data);
  let size = getGraphSize("MonthlyChart");

  let options = {
    seriesBarDistance: 5,
    width: size.width,
    height: size.height,
    showZLabels: true
  };

  let responsiveOptions = [
    ['screen and (max-width: 640px)', {
      seriesBarDistance: 5,
      axisX: {
        labelInterpolationFnc: function (value) {
          return value[0];
        }
      }
    }]
  ];
  if (!grandChartUpdated["MonthlyChart"]) grandChartUpdated["MonthlyChart"] = new Date().getTime();
  monthlyPowertChart = new Chartist.Bar('.ct-chart', chartData, options, responsiveOptions);
  monthlyPowertChart.eventEmitter.addEventHandler('created', (data) => {});
}

let generateFinanceChart = (data) => {
  let chartData = fetchDataForChart(data);
  let size = getGraphSize("GrandFinance");

  let options = {
    seriesBarDistance: 5,
    width: size.width,
    height: size.height,
    showZLabels: false,
    chartType: "GrandFinance"
  };

  let responsiveOptions = [
    ['screen and (max-width: 640px)', {
      seriesBarDistance: 5,
      axisX: {
        labelInterpolationFnc: function (value) {
          return value[0];
        }
      }
    }]
  ];
  if (!grandChartUpdated["GrandFinance"]) grandChartUpdated["MonthlyChart"] = new Date().getTime();
  grandFinanceChart = new Chartist.Bar('.ct-chart.grand', chartData, options, responsiveOptions);
  grandFinanceChart.eventEmitter.addEventHandler('created', (data) => {});
}

let getGraphSize = (type) => {
  let result = {
    width: $(window).width(),
    height: 0
  }
  switch (type) {
    case "MonthlyChart":
      result.height = 240;
      if (result.width > 500) {
        result.width = 500;
      }
      break;
    case "GrandFinance":
      result.height = 400;
      if (result.width > 1024) {
        result.width = 1024;
      }
      break;
  }
  return result;
}

let generateAnglePicker = (data) => {
  $("#anglepicker").anglepicker({
    min: data.min,
    max: data.max,
    snap: data.step,
    value: data.selectedAngle,
    clockwise: false,
    change: function (e, ui) {
      if (data.selectedAngle != ui.value) data.selectedAngle = ui.value;
    }
  });
}

let generateCompass = data => {
  var compass = document.getElementById('jog_dial_house');
  var jog = document.getElementById('jog_dial_one');
  var dialOne = JogDial(jog, {
    touchMode: "wheel",
    wheelSize: '100%',
    knobSize: '50px',
    minDegree: data.min,
    maxDegree: data.max,
    degreeStartAt: data.current,
    degreeStep: data.step
  });
  dialOne.on('mousemove', function (evt) {
    let angle, delta = evt.target.degree;

    if (dialOne.info.now.rotation > 360) {
      dialOne.info.now.rotation = 0;
    } else if (dialOne.info.now.rotation < 0) {
      dialOne.info.now.rotation = 360;
    }

    compass.style.transform = 'rotate(' + evt.target.degree + 'deg)';
    data.current = evt.target.degree - data.offset;
  });
  dialOne.on("start", function (event) {
    compass.style.transform = 'rotate(' + data.current + 'deg)';
    data.current = data.current - data.offset;
  });
}

let generateMonthToRegionRelation = (monthlyPower, regions, data) => {
  data.forEach((rel, key) => {
    let region, month = monthlyPower.filter((m) => m.id == key + 1)
    if (month && month.length > 0) {
      month = month[0];
      Object.keys(rel).forEach((id) => {
        region = regions.filter((m) => (m.id + "") == id)
        if (region && region.length > 0) {
          region = region[0];
          region.mod.push({
            "mId": month.id,
            "value": rel[id]
          });
        }
      });
    }
  });
}

let generateUkraineMap = data => {
  let arr = document.getElementsByClassName("land");
  let title = document.getElementById("country_title");
  let yOffset = 20;

  let clearAllActive = (arr) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i].setAttribute('class', 'land');
    }
  }

  for (let el = 0; el < arr.length; el++) {
    arr[el].onclick = function () {
      clearAllActive(arr);
      this.setAttribute('class', 'land active');
      //
      let id = this.getAttribute('id');
      let region = data.regions.filter(f => f.id == id);
      if (region && region.length > 0) {
        data.selectedRegion = region[0];
      }
    }
  }
}

let generateFinanceResultModel = data => {
  for (let i = 1; i < data.yearsToShow + 1; i++) {
    data.totalFinanceResult.push({
      index: i,
      name: i + "й",
      value: i - 10
    });
  }
}



$(document).ready(() => {
  creditApp = createCreditApp({
    getAllData: getAllData,
    getComplectationPrice: () => complectationPricingApp.getComplectationPrice(),
    getComplectationPriceLocal: () => complectationPricingApp.getComplectationPriceLocal(),
    increasePrice : (data) => complectationPricingApp.increasePrice(data),
    increaseInPrice : () => complectationPricingApp.increaseInPrice,
  }, eventHandler, [localeMixin]);

  vueMainInstances.push(creditApp);

  complectationPricingApp = new Vue({
    el: '#complectation-pricing-app',
    data: {
      avgPowerCableLength: 0,
      increaseInPrice: 0,
      selectedPricing: {
        ratio: {}
      },
      isDetailsActive: false,
      preferedPower: calcModel.preferedPower,
      complectationPricing: [],
      eModules: [],
      selectedEModule: {},
      eFastening: [],
      selectedEFastening: {},
      webInverters: [],
      selectedwWebInverter: {},
      isComplectationPricingVisible: calcModel.isComplectationPricingVisible
    },
    mixins: [localeMixin],
    computed: {
      getCableLength: { // power slider model
        get: function () {
          return Math.round(this.getModuleCount() * this.avgPowerCableLength);
        }
      }
    },
    methods: {
      getMonitoring() {
        if (!this.selectedPricing.id) return "";
        let filter = this.getComplectationPricingText(this.selectedPricing.id, true).filter(f => f.label == "Мониторинг:");
        if (filter.length > 0)
          return "включено";
        return "не включено";
      },
      getComplectationPrice(data) {
        if (!data)
          data = this.selectedPricing;
        let delta = 0;
        let normalPrice = (this.preferedPower.current * data.ratio.value) * 1000;
        if (this.increaseInPrice > 0) {
          delta = normalPrice * this.increaseInPrice / 100;
        }
        return Math.round(normalPrice + delta);
      },
      getComplectationPriceLocal(data) {
        if (!data)
          data = this.selectedPricing;
        return Math.round((this.preferedPower.current * data.ratio.value) * 1000);
      },
      getModuleCount() {
        return Math.round((1000 * this.preferedPower.current) / this.getModuleDescr().power);
      },
      getModuleDescr() {
        var filter = this.eModules.filter(m => m.complectionId == this.selectedPricing.id);
        return filter[0] || {};
      },
      getFasteningDescr() {
        var filter = this.eFastening.filter(f => f.complectionId == this.selectedPricing.id);
        return filter[0] || {};
      },
      getInverterDescr() {
        if (this.webInverters.length <= 0) return {};
        var filter = this.webInverters.filter(w => w.power >= this.preferedPower.current && w.complectionId == this.selectedPricing.id);
        if (!filter || filter.length <= 0)
          var filter = this.webInverters.filter(w => w.complectionId == this.selectedPricing.id);
        else
          return filter[filter.length - 1];
        return filter[0] || {};
      },
      onDetailsClick(data, show) {
        if (data.id != this.selectedPricing.id && show) {
          this.onSelect(data);
        }
        this.isDetailsActive = show;
      },
      onSelect(data) {
        this.clearSelections();
        data.isSelected = true;
        this.selectedPricing = data;
        this.selectedEModule = this.getModuleDescr();
        this.selectedEFastening = this.getFasteningDescr();
        this.selectedwWebInverter = this.getInverterDescr();
      },
      setPreferedPower(data) {
        this.preferedPower = data;
      },
      clearSelections() {
        this.complectationPricing.forEach(el => {
          el.isSelected = false;
        });
      },
      isVisible() {
        return this.isComplectationPricingVisible;
      },
      appear(show) {
        if (this.isComplectationPricingVisible != show)
          this.isComplectationPricingVisible = show;
      },
      increasePrice(value) {
        this.increaseInPrice = value;
      }
    },
    mounted() {
      getAllData((allData) => {
        this.avgPowerCableLength = allData.avgPowerCableLength;
        this.complectationPricing = allData.complectationPricing;
        this.eModules = allData.eModules;
        this.eFastening = allData.eFastening;
        this.webInverters = allData.webInverters;
        this.onSelect(this.complectationPricing[1]);
      })
    }
  });
  vueMainInstances.push(complectationPricingApp);

  incomeGridApp = new Vue({
    el: '#income-grids-app',
    data: {
      yearsToShow: 0,
      dollarValue: 0,
      euroToDollarRatio: 0,
      solarPanelDegradation: 0,
      taxRate: 0,
      preferedPower: {},
      yearSummary: 0,
      monthlyPowerGeneraion: [],
      totalFinanceResult: [],
      powerLocale: "",
      seasonConsumption: calcModel.seasonConsumption,
      currentTariff: {},
      greenTariff: {},
      futureTariff: {},
      powerLocaleSeasonsMonthly: "",
      isIncomeGridFirstYearVisible: calcModel.isIncomeGridFirstYearVisible,
      isIncomeGridYearlyVisible: calcModel.isIncomeGridYearlyVisible,
      isIncomeGridFinanceGraphVisible: calcModel.isIncomeGridFinanceGraphVisible,
      isInitialInfoVisible: calcModel.isInitialInfoVisible,
      isSummaryInfoVisible: calcModel.isSummaryInfoVisible,
      selectedCreditPlan: {
        initialFee: {},
        creditTerm: {},
      }
    },
    mixins: [localeMixin],
    computed: {
      profitability() {
        if (!this.canUpdate()) return;
        return Math.round((this.getTotalIncomeY(this.yearsToShow) - this.creditInvestment - this.futureInvestment) / (this.creditInvestment + this.futureInvestment) * 100);
        //return Math.round10((this.getTotalIncomeY(this.yearsToShow) / this.investment) * 100 / this.yearsToShow,-1);
      },
      avgMonthlyIncome() {
        if (!this.canUpdate()) return;
        let year = new Date().getFullYear();
        let filter = this.totalFinanceResult.filter(r => {
          return (year + r.index) == (this.greenTariff.end)
        });

        if (filter.length > 0) {
          let saleSum = 0;
          let savingSum = 0;
          for (let index = 1; index <= filter[0].index; index++) {
            saleSum += this.getSaleIncomeY(index);
            savingSum += this.getSelfSavingY(index);
          }
          let income = saleSum + savingSum;
          return Math.round(income / (filter[0].index * 12));
        }
      },
      recoupment() {
        if (!this.canUpdate()) return;
        return Math.round10(profitabilityYear + this.getTotalIncomeY(profitabilityYear) / (this.getTotalIncomeY(profitabilityYear) - this.getTotalIncomeY(profitabilityYear + 1)), -1);
      },
      investment() {
        if (!this.canUpdate()) return;
        let res = complectationPricingApp.getComplectationPrice();
        if (this.totalFinanceResult[0])
          this.totalFinanceResult[0].value = -res;
        return Math.round10(res, -2);
      },
      futureInvestment() {
        if (!this.canUpdate() || !this.selectedCreditPlan.id) return 0;
        return Math.round10(this.getFutureInvestmentRecursively(25, 0), -2);
      },
      creditInvestment() {
        if (this.selectedCreditPlan.id) {
          return Math.round10(this.selectedCreditPlan.selectedInitialFeeDollars + this.selectedCreditPlan.selectedCommission, -2);
        } else {
          return this.investment;
        }
      },
      getFirstYearData() {
        return this.monthlyPowerGeneraion;
      }
    },
    methods: {
      getCurrentYear(index = 0) {
        return new Date().getFullYear() + index;
      },
      getFutureInvestmentRecursively(year, summary) {
        if (year == 0) return summary;
        let credit = this.getCreditPaymentY(year);
        if (credit == 0)
          return this.getFutureInvestmentRecursively(--year, summary);

        summary += credit - this.getSaleIncomeY(year) - this.getSelfSavingY(year);
        return this.getFutureInvestmentRecursively(--year, summary > 0 ? summary : 0);
      },
      getTotalIncomeY(index) {
        if (!this.canUpdate()) return;
        if (index) {
          let result = Math.round10(this.getTotalIncomeRecursively(index, -this.creditInvestment), -2);
          if (result < 0) profitabilityYear++;
          if (this.totalFinanceResult[index]) {
            let prev = this.totalFinanceResult[index].value;
            this.totalFinanceResult[index].value = result;
            if (index == this.yearsToShow && prev != result) {
              this.totalFinanceResult[0].value = -this.creditInvestment;
              updateChartData(this.totalFinanceResult, "GrandFinance");
            }
          }
          return Math.round10(result, -2);
        }
        return Math.round10(this.monthlyPowerGeneraion.sum((month) => (this.getSaleIncomeM(month) + this.getSelfSavingM(month) - this.getCreditPaymentM(month))), -2);
      },
      getTotalIncomeRecursively(year, summary) {
        let thisYear = new Date().getFullYear();
        if (year < 1)
          return summary;
        let delta = this.getSaleIncomeY(year) + this.getSelfSavingY(year) - this.getCreditPaymentY(year);
        return this.getTotalIncomeRecursively(--year, summary + delta);
      },
      getTotalIncomeM(month) {
        if (!this.canUpdate()) return;
        return Math.round10((this.getSaleIncomeM(month) + this.getSelfSavingM(month)) - this.getCreditPaymentM(month), -2);
      },
      getCreditPaymentY(index) {
        if (!this.canUpdate()) return;
        if (!this.selectedCreditPlan.id) return 0;
        if (index) {
          let months = index * 12;
          if (this.selectedCreditPlan.creditTerm.current - months <= -12) return 0;
          if (this.selectedCreditPlan.creditTerm.current > months) {
            return Math.round10(this.selectedCreditPlan.selectedMonthlyPayment * 12, -2);
          } else {
            let delta = 12 - (months - this.selectedCreditPlan.creditTerm.current);
            return Math.round10(this.selectedCreditPlan.selectedMonthlyPayment * delta, -2);
          }
        } else {
          return Math.round10(this.monthlyPowerGeneraion.sum((month) => this.getCreditPaymentM(month)), -2);
        }
      },
      getCreditPaymentM(month) {
        if (!this.canUpdate()) return;
        if (!this.selectedCreditPlan.id || !month) return 0;
        if (this.selectedCreditPlan.creditTerm)
          return Math.round10((this.selectedCreditPlan.creditTerm.current - month.id >= 0) ? this.selectedCreditPlan.selectedMonthlyPayment : 0, -2);
      },
      getSelfSavingY(index) {
        if (!this.canUpdate()) return;
        if (index) {
          return Math.round10((this.getSelfSavingY() / this.getCurrentTariffY()) * this.getCurrentTariffY(index), -2);
        }
        return Math.round10(this.monthlyPowerGeneraion.sum((month) => {
          let sale = this.getWebSaleM(month);
          return sale > 0 ? this.getSeasonConsumptionM(month) * this.getCurrentTariffM() : month.value * this.getCurrentTariffM();
        }), -2);
      },
      getSelfSavingM(month) {
        if (!this.canUpdate()) return;
        let sale = this.getWebSaleM(month);
        return Math.round10(sale > 0 ? this.getSeasonConsumptionM(month) * this.getCurrentTariffM() : (month.value * this.getCurrentTariffM()), -2);
      },
      getSaleIncomeY(index) {
        if (!this.canUpdate()) return;
        if (index) {
          return Math.round10(this.getRawIncomeY(index) - this.getTaxRateY(index), -2);
        }
        return Math.round10(this.monthlyPowerGeneraion.sum((month) => {
          let inc = this.getRawIncomeM(month);
          return inc - this.getTaxRateM(month);
        }), -2);
      },
      getSaleIncomeM(month) {
        if (!this.canUpdate()) return;
        let inc = this.getRawIncomeM(month);
        return Math.round10(inc - this.getTaxRateM(month), -2);
      },
      getTaxRateY(index) {
        if (!this.canUpdate()) return;
        if (index) {
          return Math.round10(this.getRawIncomeY(index) / 100 * this.taxRate, -2);
        }
        return Math.round10(this.monthlyPowerGeneraion.sum((month) => {
          let inc = this.getRawIncomeM(month);
          return inc / 100 * this.taxRate;
        }), -2);
      },
      getTaxRateM(month) {
        if (!this.canUpdate()) return;
        let inc = this.getRawIncomeM(month);
        return Math.round10(inc / 100 * this.taxRate, -2);
      },
      getRawIncomeY(index) {
        if (!this.canUpdate()) return;
        if (index) {
          return Math.round10(this.getWebSaleY(index) * this.getGreenTariffY(index), -2);
        }
        return Math.round10(this.monthlyPowerGeneraion.sum((month) => this.getWebSaleM(month) * this.getGreenTariffM()), -2);
      },
      getRawIncomeM(month) {
        if (!this.canUpdate()) return;
        return Math.round10(this.getWebSaleM(month) * this.getGreenTariffM(), -2);
      },
      getCurrentTariffY(index) {
        if (!this.canUpdate()) return;
        if (index) {
          return Math.round10(this.getCurrentTariffYRecursively(index, this.currentTariff.value / this.dollarValue), -5);
        }
        return Math.round10(this.currentTariff.value / this.dollarValue, -5);
      },
      getCurrentTariffYRecursively(year, summary) {
        let thisYear = new Date().getFullYear();
        if (year <= 1)
          return summary;
        if (thisYear + year > this.futureTariff.end + 1)
          return this.getCurrentTariffYRecursively(--year, summary);
        let initial = this.currentTariff.value / this.dollarValue;
        let delta = ((this.futureTariff.value - initial)) / (this.futureTariff.end - thisYear);
        return this.getCurrentTariffYRecursively(--year, summary + delta);
      },
      getCurrentTariffM() {
        if (!this.canUpdate()) return;
        return Math.round10(this.currentTariff.value / this.dollarValue, -5);
      },
      getGreenTariffY(index) {
        if (!this.canUpdate()) return;
        let currentYear = new Date().getFullYear();
        return currentYear + index <= this.greenTariff.end ? this.getGreenTariffM() : this.getCurrentTariffY(index);
      },
      getGreenTariffM() {
        if (!this.canUpdate()) return;
        return Math.round10(this.greenTariff.value * this.euroToDollarRatio, -5);
      },
      getWebSaleY(index) {
        if (!this.canUpdate()) return;
        if (index) {
          let res = this.getWebSaleRecursively(index, this.getWebSaleY());
          return res > 0 ? res : 0;
        }
        let fin = this.monthlyPowerGeneraion.sum((month) => {
          let res = month.value - this.getSeasonConsumptionM(month);
          return res > 0 ? res : 0;
        });
        return Math.round10(fin, -2);
      },
      getWebSaleRecursively(year, summary) {
        if (year <= 1)
          return summary;
        let delta = (this.getYearSummary(year - 1) - this.getYearSummary(year));
        return this.getWebSaleRecursively(--year, summary - delta);
      },
      getWebSaleM(month) {
        if (!this.canUpdate()) return;
        let res = month.value - this.getSeasonConsumptionM(month);
        return res > 0 ? res : 0;
      },
      getSeasonConsumptionY() {
        if (!this.canUpdate()) return;
        return Math.round((this.seasonConsumption.summer.current * 6) + (this.seasonConsumption.winter.current * 6));
      },
      getSeasonConsumptionM(month) {
        if (!this.canUpdate()) return;
        switch (month.id) {
          case 4:
          case 5:
          case 6:
          case 7:
          case 8:
          case 9:
            return this.seasonConsumption.summer.current;
          case 1:
          case 2:
          case 3:
          case 10:
          case 11:
          case 12:
            return this.seasonConsumption.winter.current;
        }
      },
      setDependency(data) {
        this.yearSummary = data.yearSummary,
          this.monthlyPowerGeneraion = data.monthlyPowerGeneraion,
          this.preferedPower = data.preferedPower;
      },
      getYearSummary(year) {
        if (!this.canUpdate()) return;
        return Math.round(this.getYearSummaryRecursively(year, this.yearSummary));
      },
      getYearSummaryRecursively(year, summary) {
        if (year <= 1)
          return summary;
        let delta = summary / 100 * this.solarPanelDegradation;
        return this.getYearSummaryRecursively(--year, summary - delta);
      },
      setYearSummary(sum) {
        this.yearSummary = sum;
      },
      appearGraph(show) {
        if (this.isIncomeGridFinanceGraphVisible != show) {
          if (show) {
            //this.$forceUpdate();
          }
          this.isIncomeGridFinanceGraphVisible = show;
        }
      },
      isVisibleYearly() {
        return this.isIncomeGridYearlyVisible;
      },
      appearYearly(show) {
        if (this.isIncomeGridYearlyVisible != show) {
          if (show) {
            //this.$forceUpdate();
          }
          this.isIncomeGridYearlyVisible = show;
        }
      },
      isVisibleFirstYear() {
        return this.isIncomeGridFirstYearVisible;
      },
      appearFirstYear(show) {
        if (this.isIncomeGridFirstYearVisible != show) {
          if (show) {
            this.$forceUpdate();
          }
          this.isIncomeGridFirstYearVisible = show;
        }
      },
      appearInitial(show) {
        if (this.isInitialInfoVisible != show) {
          if (show) {
            this.$forceUpdate();
          }
          this.isInitialInfoVisible = show;
        }
      },
      appearSummary(show) {
        if (this.isSummaryInfoVisible != show) {
          if (show) {
            this.$forceUpdate();
          }
          this.isSummaryInfoVisible = show;
        }
      },
      canUpdate() {
        return this.isIncomeGridYearlyVisible || this.isIncomeGridFirstYearVisible || this.isIncomeGridFinanceGraphVisible || this.isInitialInfoVisible || this.isSummaryInfoVisible;
      },
      applySelectedCreditPlan(plan) {
        this.selectedCreditPlan = plan;
      },
      showYearlyTable() {
        return $(window).width() > 1024;
      }
    },
    beforeUpdate() {
      profitabilityYear = 0;
    },
    mounted() {
      getAllData((data) => {
        this.yearsToShow = data.yearsToShow,
          this.dollarValue = data.dollarValue,
          this.euroToDollarRatio = data.euroToDollarRatio,
          this.solarPanelDegradation = data.solarPanelDegradation,
          this.taxRate = data.taxRate,
          this.yearSummary = data.yearSummary,
          this.monthlyPowerGeneraion = data.monthlyPowerGeneraion,
          this.powerLocale = data.powerLocale,
          this.currentTariff = data.currentTariff,
          this.greenTariff = data.greenTariff,
          this.futureTariff = data.futureTariff,
          this.powerLocaleSeasonsMonthly = data.powerLocaleSeasonsMonthly;
        this.preferedPower = data.preferedPower;
        this.totalFinanceResult = data.totalFinanceResult;
        this.seasonConsumption = data.seasonConsumption;
        generateFinanceResultModel(this);
        generateFinanceChart(this.totalFinanceResult);
      });
      eventHandler.on("applySelectedCreditPlan", this.applySelectedCreditPlan);
    }
  });
  vueMainInstances.push(incomeGridApp);

  calculatorApp = new Vue({
    el: '#solar-calculator-app',
    data: calcModel,
    mixins: [localeMixin],
    computed: {
      summary() {
        if (this.monthlyPowerGeneraion && this.monthlyPowerGeneraion.length > 0 && this.preferedPower.current > 0) {
          this.calculateMonthlyPower();
          this.yearSummary = Math.round10(this.monthlyPowerGeneraion.reduce((a, b) => {
            if (Number.isInteger(a.value) && Number.isInteger(b.value))
              return a.value + b.value;
            else if (!Number.isInteger(a.value) && Number.isInteger(b.value))
              return a + b.value;
            else if (Number.isInteger(a.value) && !Number.isInteger(b.value))
              return a.value + b;
            else
              return a + b;
          }), -2);
          updateChartData(this.monthlyPowerGeneraion, "MonthlyChart");
        }
        incomeGridApp.setYearSummary(this.yearSummary);
        return this.yearSummary;
      },
      powerSlide: { // power slider model
        get: function () {
          return this.preferedPower.current;
        },
        set: function (val) {
          if (val < this.preferedPower.current)
            this.preferedPower.current -= this.preferedPower.step;
          else
            this.preferedPower.current += this.preferedPower.step;
        }
      },
      selectedRegionLabel: { // power slider model
        get: function () {
          return (this.selectedRegion.name || "").toUpperCase();
        }
      }
    },
    methods: {
      calculateMonthlyPower() {
        this.monthlyPowerGeneraion.forEach((m) => {
          let mod = this.selectedRegion.mod.filter(f => f.mId == m.id);
          if (mod && mod.length > 0) {
            mod = mod[0];
            m.value = Math.round(mod.value * m.days * this.getAngleMod() * this.preferedPower.current * this.degradationMod);
          }
        });
      },
      selectRegion(region) {
        this.selectedRegion = region;
      },
      getAngleMod() {
        let mod = angleToAzimuth.filter(a => {
          return a.navA == Math.abs(this.navigation.current) && a.roofA == this.roofAngle.selectedAngle;
        });
        if (mod && mod.length > 0) {
          return mod[0].mod;
        }
        return 1;
      },
      isVisible() {
        return this.isCalcVisible;
      },
      appear(show) {
        if (this.isCalcVisible != show)
          this.isCalcVisible = show;
      },
      validateInput(value) {
        this.preferedPower.current = parseInt(this.preferedPower.current, 10);
        if (value.keyCode == 8) return;
        getAllData((data) => {
          if (Number.isNaN(this.preferedPower.current))
            this.preferedPower.current = this.preferedPower.default;
          else if (this.preferedPower.current > this.preferedPower.max)
            this.preferedPower.current = this.preferedPower.max;
        });
      }
    },
    mounted() {
      getAllData((allData) => {
        generateMonthToRegionRelation(allData.monthlyPowerGeneraion, allData.regions, allData.monthToRegions);
        this.powerLocale = allData.powerLocale;
        this.degradationMod = allData.degradationMod;
        this.powerLocaleSeasonsMonthly = allData.powerLocaleSeasonsMonthly;
        this.preferedPower = allData.preferedPower;
        this.roofAngle = allData.roofAngle;
        this.navigation = allData.navigation;
        this.monthlyPowerGeneraion = allData.monthlyPowerGeneraion;
        this.regions = allData.regions;
        angleToAzimuth = allData.angleToAzimuth;
        this.selectedRegion = allData.regions[8];
        generateUkraineMap(this);
        generateCompass(this.navigation);
        generatePowerChart(this.monthlyPowerGeneraion);
        generateAnglePicker(this.roofAngle);
        incomeGridApp.setDependency(this);
        complectationPricingApp.setPreferedPower(this.preferedPower);

      })

      /*fetch("http://localhost:5000/api/product/types").then(r => r.json()).then((data) => {
        this.types = data;
      });*/
    }
  });
  vueMainInstances.push(calculatorApp);

  localeApp = new Vue({
    el: '#locale-switch',
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
          this.selectedLang = val;
          vueMainInstances.forEach(v => {
            if (v.selectedLangComp)
              v.selectedLangComp = val;
          })
        }
      }
    },
    mounted() {
      getLocales((locales) => {
        this.langs = Object.keys(locales);
      });
      this.selectedLangComp = window._defaultLocale;
    }

  });

  gridFirstYearDom = $("#income-grid-first-year");
  gridYearlyDom = $("#income-grid-yearly");
  grandSummaryDom = $("#income-grid-finance-graph");
  initialDataDom = $("#income-grid-initial-data");
  gridSummaryDom = $("#income-grid-summary");

  gridFirstYearDom.appear();
  gridYearlyDom.appear();
  grandSummaryDom.appear();
  initialDataDom.appear();
  gridSummaryDom.appear();

  gridFirstYearDom.on('appear', function (event, $all_appeared_elements) {
    incomeGridApp.appearFirstYear(true);
  });
  gridFirstYearDom.on('disappear', function (event, $all_appeared_elements) {
    incomeGridApp.appearFirstYear(false);
  });

  gridYearlyDom.on('appear', function (event, $all_appeared_elements) {
    incomeGridApp.appearYearly(true);
  });
  gridYearlyDom.on('disappear', function (event, $all_appeared_elements) {
    incomeGridApp.appearYearly(false);
  });

  grandSummaryDom.on('appear', function (event, $all_appeared_elements) {
    incomeGridApp.appearGraph(true);
  });
  grandSummaryDom.on('disappear', function (event, $all_appeared_elements) {
    incomeGridApp.appearGraph(false);
  });

  initialDataDom.on('appear', function (event, $all_appeared_elements) {
    incomeGridApp.appearInitial(true);
  });
  initialDataDom.on('disappear', function (event, $all_appeared_elements) {
    incomeGridApp.appearInitial(false);
  });

  gridSummaryDom.on('appear', function (event, $all_appeared_elements) {
    incomeGridApp.appearSummary(true);
  });
  gridSummaryDom.on('disappear', function (event, $all_appeared_elements) {
    incomeGridApp.appearSummary(false);
  });

  incomeGridApp.appearFirstYear(gridFirstYearDom.is(':appeared'));

  incomeGridApp.appearYearly(gridYearlyDom.is(':appeared'));

  incomeGridApp.appearGraph(grandSummaryDom.is(':appeared'));

  incomeGridApp.appearInitial(initialDataDom.is(':appeared'));

  incomeGridApp.appearSummary(gridSummaryDom.is(':appeared'));

  $.force_appear()

  let last_scroll_pos = 0,
    lat_time_scrolled = 0,
    scroll_updated = false;
  const time_const = 1000,
    scroll_const = 200;

  window.addEventListener('scroll', function (e) {
    if (Math.abs(last_scroll_pos - window.scrollY) > scroll_const && isChrome()) {
      scroll_updated = true;

      //if(new Date().getTime() - lat_time_scrolled > time_const){
      incomeGridApp.appearFirstYear(gridFirstYearDom.is(':appeared'));

      incomeGridApp.appearYearly(gridYearlyDom.is(':appeared'));

      incomeGridApp.appearGraph(grandSummaryDom.is(':appeared'));

      incomeGridApp.appearInitial(initialDataDom.is(':appeared'));

      incomeGridApp.appearSummary(gridSummaryDom.is(':appeared'));
      //}

      last_scroll_pos = window.scrollY;
      lat_time_scrolled = new Date().getTime();
    }
  });

  window.addEventListener('orientationchange', function (e) {
    setTimeout(() => {
      updateChartData(calculatorApp.monthlyPowerGeneraion, "MonthlyChart");

      updateChartData(incomeGridApp.totalFinanceResult, "GrandFinance");
    }, 500);

  });
});

var isChrome = function () {
  var isChromium = window.chrome,
    winNav = window.navigator,
    vendorName = winNav.vendor,
    isOpera = winNav.userAgent.indexOf("OPR") > -1,
    isIEedge = winNav.userAgent.indexOf("Edge") > -1,
    isIOsChrome = winNav.userAgent.match("CriOS");

  if (isIOsChrome) {
    return true;
  } else if (isChromium !== null && typeof isChromium !== "undefined" && vendorName == "Google Inc." && isOpera === false && isIEedge === false) {
    return true;
  } else {
    return false;
  }
}
import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import { balanceAssignmentConditions, createDoc, fetchDoc, stampnow, updateExperimentCounter, updateSubjectDataRecord } from "../stores/firebase"
import axios from "axios"
import { config } from "process"

// export * from "pinia"

const inferLastRoute = (mode: string) => {
  switch (mode) {
    case "development":
      return "recruit";
    case "presentation":
      return "presentation_home";
    default:
      return "landing";
  }
}

const initAllowJumps = (mode: string) => {
  return ["development", "presentation"].includes(mode)
}

const localState = useLocalStorage("smile-nuxt/local", {
    knownUser: false,
    lastRoute: inferLastRoute("development"),
    allowJumps: initAllowJumps("development"),
    docref: "",
    partNum: "",
    completionCode: "",
    totalWrites: 0,
    lastWrite: Date.now(),
    // Do you want to use the random seed based on the participant's ID?
    seedActive: true,
    seedID: "",
    seedSet: false,
    pageTracker: 0,
    possibleConditions: {
      taskOrder: ["AFirst", "BFirst"],
      instructions: ["v1", "v2", "v3"]
    }
  },
  { mergeDefaults: true },
);

const globalState = {
  progress: 0,
  page_bg_color: "#fff",
  page_text_color: "#000",
  status_bar_bg_color: "#fff",
  status_bar_text_color: "#000",
  db_connected: false,
  search_params: null,
}

const devState = {
  page_provides_autofill: null,
}

// syncs with Firestore
const dataState = {
  trial_num: 0,
  consented: false,
  done: false,
  // Time Consented
  startTime: stampnow(),
  // Time Finished OR Withdrawn
  endTime: stampnow(),
  recruitment: {
    service: "web",
    info: {},
  },
  browser: {
    fingerprint: {},
    data: []
  },
  demographic_form: {},
  withdrawn: false,
  withdrawData: {},
  routeOrder: [],
  conditions: {},
}

export const useSmileStore = defineStore('smile', {
  state: () => ({
    local: localState,
    global: globalState,
    dev: devState,
    data: dataState,
  }),

  getters: {
    isKnownUser: (state) => state.local.knownUser,
    isConsented: (state) => state.data.consented,
    isWithdrawn: (state) => state.data.withdrawn,
    isDone: (state) => state.data.done,
    astRoute: (state) => state.local.lastRoute,
    isDBConnected: (state) => state.global.db_connected,
    hasAutofill: (state) => state.dev.page_provides_autofill,
    searchParams: (state) => state.global.search_params,
    recruitmentService: (state) => state.data.recruitment.service,
    isSeedSet: (state) => state.local.seedSet,
    getSeedID: (state) => state.local.seedID,
    getPage: (state) => state.local.pageTracker,
    getPossibleConditions: (state) => state.local.possibleConditions,
    getConditions: (state) => state.data.conditions,
  },

  actions: {
    setDBConnected() {
      this.global.db_connected = true
    },
    setSearchParams(params) {
      this.global.search_params = params
    },
    setConsented() {
      this.data.consented = true
      this.data.startTime = stampnow()
    },
    setWithdraw(forminfo) {
      this.data.withdrawn = true
      this.data.withdrawData = forminfo
      this.data.endTime = stampnow()
    },
    setCompletionCode(code: string) {
      this.local.completionCode = code
    },
    setSeedID(seed) {
      this.local.seedID = seed
      this.local.seedSet = true
    },
    incrementPageTracker() {
      this.local.pageTracker += 1
    },
    resetPageTracker() {
      this.local.pageTracker = 0
    },
    recordWindowEvent(event_type: string, event_data: {} | undefined = undefined) {
      const browser_data = {
        event_type, timestamp: stampnow(), event_data
      }
      this.data.browser.data.push(browser_data)
    },
    getBrowserFingerprint() {
      let ip = "unknown"
      axios.get("https://api.ipify.org/?format=json").then(response => {
        console.log(`IP address: ${response.data}`)
        if (response.data.ip) {
          ip = response.data.ip
        }
      }).catch((error) => {
        console.log(error)
      }).finally(() => {
        const { language, webdriver, userAgent } = window.navigator
        this.setFingerprint(ip, userAgent, language, webdriver)
      })
    },
    setFingerprint(ip, userAgent, language, webdriver) {
      this.data.browser.fingerprint = {
        ip, userAgent, language, webdriver
      }
      console.log(this.data.browser.fingerprint)
    },
    setPageAutofill(fn) {
      this.dev.page_provides_autofill = fn
    },
    rmPageAutofill() {
      this.dev.page_provides_autofill = null
    },
    setRecruitmentService(service, info) {
      this.data.recruitment.service = service
      this.data.recruitment.info = info
    },
    autofill() {
      if (this.dev.page_provides_autofill) {
        this.dev.page_provides_autofill()
      }
    },
    saveDemographicForm(data) {
      this.data.demographic_form = data
    },
    setCondition(name, condition) {
      this.data.conditions[name] = condition
    },
    async setKnown() {
      this.local.knownUser = true
      this.local.partNum = await updateExperimentCounter("participants")
      this.local.docref = await createDoc(this.data, this.local.seedID, this.local.partNum)
      if (this.local.possibleConditions) {
        this.data.conditions = await balanceAssignmentConditions(
          this.local.possibleConditions, this.data.conditions
        )
      }
      if (this.local.docref) {
        this.setDBConnected()
        this.saveData(true)
      }
      return this.data.conditions
    },
    async loadData() {
      let data;
      if (this.local.docref) {
        data = await fetchDoc(this.local.docref)
      }
      if (data) {
        this.data = data
        this.setDBConnected()
      }
    },
    setLastRoute(route) {
      this.local.lastRoute = route
    },
    recordRoute(route) {
      this.data.routeOrder.push(route)
    },
    async saveData(force: boolean = false) {
      if (!this.isDBConnected)
        return

      if (!force && this.local.totalWrites >= config.maxWrites) {
        // this should log an error and potentially trigger a bug report...
        return
      }

      const tooFast = this.local.lastWrite() < config.minWriteInterval
      if (!force && this.local.lastWrite && tooFast) {
        // this should log an error and likely trigger a bug report...
        return
      }

      updateSubjectDataRecord(this.data, this.local.docref)
      this.local.totalWrites += 1
      this.local.lastWrite = Date.now()
    },
    resetLocal() {
      this.$reset();
    }
  }
})

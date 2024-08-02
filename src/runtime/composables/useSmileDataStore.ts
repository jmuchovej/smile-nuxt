import { defineStore } from "pinia";
import { Timestamp } from "firebase/firestore";
import { computed, ref, type Ref } from "#imports";
import axios from "axios";

type SmileWindowEvent = {
  event_type: string;
  event_data?: any;
  timestamp: Timestamp;
}

type SmileRecruitment = {
  service: `web` | `prolific` | `cloudresearch` | `mturk` | `citizen-science`;
  participant_id: string;
  study_id: string;
  task_id: string
}

type SmileBrowserFingerprint = {
  ip: string;
  user_agent: string;
  language: string;
  web_driver: string;
}

type SmileBrowserData = {
  fingerprint: SmileBrowserFingerprint
  window_events: SmileWindowEvent[]
}

type SmileDataStore = {
  trial_num: number;
  consented: boolean;
  done: boolean;
  time_beg: Timestamp;
  time_end: Timestamp;
  recruitment: SmileRecruitment
  browser: {
    fingerprint: SmileBrowserFingerprint
    window_events: SmileWindowEvent[]
  },
  demographics: any;
  withdrawal: {
    state: boolean;
    data: any;
  }
  route_order: any[]
  conditions: any
}

const getBrowserFingerprint = async () => {
  let ip = `unknown`
  axios
    .get(`https://api.ipify.org/?format=json`)
    .then(({ data }) => {
      if (data.ip) {
        ip = data.ip
      }
    })
    .catch((error) => {
      console.log(error)
    })
    .finally(() => {
      // const { language, webdriver, userAgent } = window.navigator;
      // return { ip, language, web_driver: webdriver, user_agent: userAgent }
    })
}

export const useSmileDataStore = defineStore(`smile-data`, () => {
  const trial_num = ref(0)
  const consented = ref(false)
  const done = ref(false)
  const time_beg = ref(Timestamp.now())
  const time_end = ref(Timestamp.now())
  const recruitment = ref({} as SmileRecruitment)

  const fingerprint = getBrowserFingerprint()
  const browser = ref({ fingerprint, window_events: [] as SmileWindowEvent[], })
  const demographics = ref({})
  const withdrawal = ref({ state: false, data: {} })
  const route_order = ref([])
  const conditions = ref({})

  const hasConsented = computed(() => consented.value)
  const isDone = computed(() => done.value)
  const getConditions = computed(() => conditions.value)

  function consent() {
    consented.value = true
    time_beg.value = Timestamp.now()
  }
  function withdraw(data: any) {
    withdrawal.value.state = true
    withdrawal.value.data = data
  }
  const finish = () => {
    done.value = true
    time_end.value = Timestamp.now()
  }
  const recordWindowEvent = (
    event_type: SmileWindowEvent["event_type"],
    event_data: SmileWindowEvent["event_data"]
  ) => {
    const event: SmileWindowEvent = {event_type, timestamp: Timestamp.now()}
    if (event_data) {
      event.event_data = event_data
    }
    browser.value.window_events.push(event)
  }
  // const setRecruitment = (incoming: SmileRecruitment) => {
  //   recruitment.value = incoming
  // }
  const setRecruitment = (incoming) => {
    recruitment.value = incoming as SmileRecruitment
  }

  return {
    // state
    trial_num, consented, done, time_beg, time_end, recruitment, browser, demographics,
    withdrawal, route_order, conditions,
    // getters
    hasConsented, isDone, getConditions,
    // actions
    consent, withdraw, finish, recordWindowEvent, setRecruitment
  }
})

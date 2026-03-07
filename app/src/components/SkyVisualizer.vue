<template>
  <div class="sky-container" :style="skyGradient">
    <!-- Stars (visible at night) -->
    <div class="stars" :style="{ opacity: starsOpacity }">
      <div
        v-for="star in stars"
        :key="star.id"
        class="star"
        :style="{
          left: star.x + '%',
          top: star.y + '%',
          width: star.size + 'px',
          height: star.size + 'px',
          animationDelay: star.delay + 's',
          animationDuration: star.duration + 's',
        }"
      />
    </div>

    <!-- Clouds (visible during day) -->
    <div class="clouds" :style="{ opacity: cloudsOpacity }">
      <div
        v-for="cloud in clouds"
        :key="cloud.id"
        class="cloud"
        :style="{
          left: cloud.x + '%',
          top: cloud.y + '%',
          transform: 'scale(' + cloud.scale + ')',
          animationDuration: cloud.speed + 's',
          animationDelay: cloud.delay + 's',
          opacity: cloud.opacity,
        }"
      >
        <div class="cloud-part cloud-main" />
        <div class="cloud-part cloud-left" />
        <div class="cloud-part cloud-right" />
      </div>
    </div>

    <!-- Sun -->
    <div
      class="celestial sun"
      :style="{
        left: sunPosition.x + '%',
        top: sunPosition.y + '%',
        opacity: sunOpacity,
        transform: 'translate(-50%, -50%)',
      }"
    >
      <div class="sun-core" />
      <div class="sun-glow" />
      <div class="sun-rays" />
    </div>

    <!-- Moon -->
    <div
      class="celestial moon"
      :style="{
        left: moonPosition.x + '%',
        top: moonPosition.y + '%',
        opacity: moonOpacity,
        transform: 'translate(-50%, -50%)',
      }"
    >
      <div class="moon-body" />
      <div class="moon-shadow" />
      <div class="moon-glow" />
    </div>

    <!-- Date/Time overlay -->
    <div class="time-overlay">
      <div class="time-text">{{ formattedTime }}</div>
      <div class="date-text">{{ formattedDate }}</div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "SkyVisualizer",

  data() {
    return {
      now: new Date(),
      timer: null,
      stars: [],
      clouds: [],
    };
  },

  computed: {
    hours() {
      return this.now.getHours() + this.now.getMinutes() / 60;
    },

    sunTimes() {
      const month = this.now.getMonth();
      const riseTimes = [7.0, 6.5, 6.0, 5.5, 5.25, 5.0, 5.25, 5.75, 6.25, 6.75, 6.5, 7.0];
      const setTimes = [17.0, 17.5, 18.0, 19.0, 19.75, 20.25, 20.0, 19.25, 18.25, 17.5, 17.0, 16.75];
      return { rise: riseTimes[month], set: setTimes[month] };
    },

    dayProgress() {
      const { rise, set } = this.sunTimes;
      const h = this.hours;
      if (h < rise) return -1;
      if (h > set) return 2;
      return (h - rise) / (set - rise);
    },

    nightProgress() {
      const { rise, set } = this.sunTimes;
      const h = this.hours;
      if (h >= set) {
        return (h - set) / (24 - set + rise);
      } else if (h < rise) {
        return (h + 24 - set) / (24 - set + rise);
      }
      return -1;
    },

    sunPosition() {
      const p = this.dayProgress;
      if (p < -0.1 || p > 1.1) return { x: -20, y: 120 };
      const clamped = Math.max(0, Math.min(1, p));
      const x = 10 + clamped * 80;
      const y = 85 - Math.sin(clamped * Math.PI) * 75;
      return { x, y };
    },

    moonPosition() {
      const p = this.nightProgress;
      if (p < 0 || p > 1) return { x: -20, y: 120 };
      const x = 10 + p * 80;
      const y = 85 - Math.sin(p * Math.PI) * 70;
      return { x, y };
    },

    sunOpacity() {
      const p = this.dayProgress;
      if (p < 0) return Math.max(0, 1 + p * 5);
      if (p > 1) return Math.max(0, 1 - (p - 1) * 5);
      return 1;
    },

    moonOpacity() {
      const p = this.nightProgress;
      if (p < 0) return 0;
      if (p < 0.1) return p * 10;
      if (p > 0.9) return (1 - p) * 10;
      return 1;
    },

    isDaytime() {
      const { rise, set } = this.sunTimes;
      return this.hours >= rise && this.hours <= set;
    },

    skyGradient() {
      const h = this.hours;
      const { rise, set } = this.sunTimes;

      let colors;
      if (h < rise - 1) {
        colors = ["#0a0e27", "#111b3d", "#162040"];
      } else if (h < rise) {
        const t = h - (rise - 1);
        colors = this.lerpColors(
          ["#0a0e27", "#111b3d", "#162040"],
          ["#1a1040", "#4a2060", "#d4606b"],
          t
        );
      } else if (h < rise + 1) {
        const t = h - rise;
        colors = this.lerpColors(
          ["#1a1040", "#4a2060", "#d4606b"],
          ["#ff9a56", "#ffcc80", "#87ceeb"],
          t
        );
      } else if (h < rise + 2) {
        const t = h - rise - 1;
        colors = this.lerpColors(
          ["#ff9a56", "#ffcc80", "#87ceeb"],
          ["#5ba3d9", "#87ceeb", "#c2e3f5"],
          t
        );
      } else if (h < set - 2) {
        colors = ["#5ba3d9", "#87ceeb", "#c2e3f5"];
      } else if (h < set - 1) {
        const t = h - (set - 2);
        colors = this.lerpColors(
          ["#5ba3d9", "#87ceeb", "#c2e3f5"],
          ["#ff8c42", "#ffaa60", "#ffd194"],
          t
        );
      } else if (h < set) {
        const t = h - (set - 1);
        colors = this.lerpColors(
          ["#ff8c42", "#ffaa60", "#ffd194"],
          ["#c43e5a", "#6b2d6b", "#2d1b4e"],
          t
        );
      } else if (h < set + 1) {
        const t = h - set;
        colors = this.lerpColors(
          ["#c43e5a", "#6b2d6b", "#2d1b4e"],
          ["#0a0e27", "#111b3d", "#162040"],
          t
        );
      } else {
        colors = ["#0a0e27", "#111b3d", "#162040"];
      }

      return {
        background: `linear-gradient(180deg, ${colors[0]} 0%, ${colors[1]} 50%, ${colors[2]} 100%)`,
      };
    },

    starsOpacity() {
      const { rise, set } = this.sunTimes;
      const h = this.hours;
      if (h > set + 1 || h < rise - 1) return 1;
      if (h > set) return h - set;
      if (h < rise) return rise - h;
      return 0;
    },

    cloudsOpacity() {
      return this.isDaytime ? 0.7 : 0;
    },

    formattedTime() {
      return this.now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    },

    formattedDate() {
      return this.now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    },
  },

  created() {
    this.generateStars();
    this.generateClouds();
  },

  mounted() {
    this.timer = setInterval(() => {
      this.now = new Date();
    }, 1000);
  },

  beforeUnmount() {
    if (this.timer) clearInterval(this.timer);
  },

  methods: {
    generateStars() {
      const arr = [];
      for (let i = 0; i < 50; i++) {
        arr.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 70,
          size: Math.random() * 2.5 + 0.5,
          delay: Math.random() * 5,
          duration: Math.random() * 3 + 2,
        });
      }
      this.stars = arr;
    },

    generateClouds() {
      const arr = [];
      for (let i = 0; i < 4; i++) {
        arr.push({
          id: i,
          x: Math.random() * 80 + 10,
          y: Math.random() * 30 + 10,
          scale: Math.random() * 0.5 + 0.6,
          speed: Math.random() * 40 + 60,
          delay: Math.random() * 20,
          opacity: Math.random() * 0.3 + 0.4,
        });
      }
      this.clouds = arr;
    },

    lerpColors(from, to, t) {
      return from.map((fc, i) => this.lerpColor(fc, to[i], t));
    },

    lerpColor(a, b, t) {
      const ar = parseInt(a.slice(1, 3), 16);
      const ag = parseInt(a.slice(3, 5), 16);
      const ab = parseInt(a.slice(5, 7), 16);
      const br = parseInt(b.slice(1, 3), 16);
      const bg = parseInt(b.slice(3, 5), 16);
      const bb = parseInt(b.slice(5, 7), 16);
      const rr = Math.round(ar + (br - ar) * t);
      const rg = Math.round(ag + (bg - ag) * t);
      const rb = Math.round(ab + (bb - ab) * t);
      return `#${rr.toString(16).padStart(2, "0")}${rg.toString(16).padStart(2, "0")}${rb.toString(16).padStart(2, "0")}`;
    },
  },
});
</script>

<style>
.sky-container {
  position: relative;
  width: 100%;
  height: 300px;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 1.5rem;
  transition: background 2s ease;
}

/* Stars */
.stars {
  position: absolute;
  inset: 0;
  transition: opacity 2s ease;
}

.star {
  position: absolute;
  background: #fff;
  border-radius: 50%;
  animation: twinkle ease-in-out infinite alternate;
}

@keyframes twinkle {
  0% { opacity: 0.2; transform: scale(0.8); }
  100% { opacity: 1; transform: scale(1.2); }
}

/* Clouds */
.clouds {
  position: absolute;
  inset: 0;
  transition: opacity 3s ease;
}

.cloud {
  position: absolute;
  animation: cloud-drift linear infinite;
}

@keyframes cloud-drift {
  0% { transform: translateX(0); }
  50% { transform: translateX(30px); }
  100% { transform: translateX(0); }
}

.cloud-part {
  position: absolute;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 50%;
}

.cloud-main {
  width: 60px;
  height: 24px;
  border-radius: 12px;
  top: 8px;
  left: 0;
}

.cloud-left {
  width: 28px;
  height: 28px;
  top: -4px;
  left: 8px;
}

.cloud-right {
  width: 36px;
  height: 36px;
  top: -12px;
  left: 24px;
}

/* Sun */
.sun-core {
  width: 48px;
  height: 48px;
  background: radial-gradient(circle, #fff5c0 0%, #ffd540 40%, #ff9d00 100%);
  border-radius: 50%;
  position: relative;
  z-index: 2;
  box-shadow: 0 0 20px 4px rgba(255, 200, 0, 0.5);
}

.sun-glow {
  position: absolute;
  inset: -16px;
  background: radial-gradient(circle, rgba(255, 213, 64, 0.4) 0%, transparent 70%);
  border-radius: 50%;
  z-index: 1;
  animation: sun-pulse 4s ease-in-out infinite alternate;
}

.sun-rays {
  position: absolute;
  inset: -24px;
  background: radial-gradient(circle, rgba(255, 180, 0, 0.15) 0%, transparent 60%);
  border-radius: 50%;
  z-index: 0;
  animation: sun-pulse 6s ease-in-out infinite alternate-reverse;
}

@keyframes sun-pulse {
  0% { transform: scale(1); opacity: 0.7; }
  100% { transform: scale(1.15); opacity: 1; }
}

/* Moon */
.moon-body {
  width: 40px;
  height: 40px;
  background: radial-gradient(circle at 35% 35%, #f0f0f0 0%, #d4d4d4 50%, #b8b8c0 100%);
  border-radius: 50%;
  position: relative;
  z-index: 2;
  box-shadow: 0 0 15px 3px rgba(200, 210, 255, 0.3);
}

.moon-shadow {
  position: absolute;
  width: 32px;
  height: 32px;
  background: radial-gradient(circle at 60% 40%, rgba(15, 20, 50, 0.6) 0%, transparent 70%);
  border-radius: 50%;
  top: 4px;
  left: 10px;
  z-index: 3;
}

.moon-glow {
  position: absolute;
  inset: -14px;
  background: radial-gradient(circle, rgba(180, 200, 255, 0.25) 0%, transparent 70%);
  border-radius: 50%;
  z-index: 1;
  animation: moon-glow-pulse 5s ease-in-out infinite alternate;
}

@keyframes moon-glow-pulse {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(1.1); opacity: 1; }
}

/* Celestial positioning */
.celestial {
  position: absolute;
  transition: left 60s linear, top 60s linear, opacity 2s ease;
  z-index: 5;
}

/* Time overlay */
.time-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
  pointer-events: none;
}

.time-text {
  font-family: var(--font-heading);
  font-size: 2rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.3);
  letter-spacing: 0.02em;
  line-height: 1.2;
}

.date-text {
  font-family: var(--font-text);
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.3);
  margin-top: 4px;
  letter-spacing: 0.03em;
}
</style>

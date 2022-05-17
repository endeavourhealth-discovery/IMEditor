<template>
  <div id="select-entity-topbar-container">
    <TopBar>
      <template #content>
        <div class="topbar-content">
          <span class="title">IM Editor</span>
        </div>
      </template>
    </TopBar>
    <div id="select-entity-container">
      <h1>Select entity</h1>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "@vue/runtime-core";

export default defineComponent({
  name: "SelectEntity",
  props: { returnUrl: { type: String, default: "Editor" } }
});
</script>

<style scoped>
#select-entity-topbar-container {
  height: 100%;
  width: 100%;
  overflow: auto;
}

#select-entity-container {
  width: 100%;
  height: calc(100% - 3.5rem);
  overflow: auto;
  background-color: #ffffff;
}

.topbar-content {
  height: 100%;
  width: 100%;
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;
}

.title {
  font-size: 2rem;
  white-space: nowrap;
}
</style>

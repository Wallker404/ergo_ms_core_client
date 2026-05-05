<template>
  <div class="container mt-5">
    <h3 class="mb-4">Импорт CSV</h3>

    <div
      class="p-4 text-center border border-2 border-dashed rounded bg-light"
      :class="{ 'border-primary bg-primary bg-opacity-10': isDragging }"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
      style="cursor: pointer; min-height: 120px;"
    >
      <p v-if="!isDragging" class="mb-2">Перетащите CSV сюда или</p>
      <p v-else class="mb-2 text-primary fw-bold">Отпустите файл</p>
      
      <input
        type="file"
        accept=".csv"
        class="form-control mx-auto"
        style="max-width: 300px;"
        @change="handleFileSelect"
        ref="fileInput"
      />
    </div>

    <div v-if="loading" class="alert alert-info mt-3">⏳ Загрузка и обработка...</div>
    <div v-if="error" class="alert alert-danger mt-3">❌ {{ error }}</div>
    <div v-if="success" class="alert alert-success mt-3">✅ {{ success }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

//import { onMounted } from 'vue'
import { apiClient } from '@/js/api/manager'
import { roomAnalyticsEndpoints } from '../js/endpoints'

const isDragging = ref(false)
const loading = ref(false)
const error = ref(null)
const success = ref(null)
const fileInput = ref(null)

const handleDrop = (e) => {
  isDragging.value = false
  const file = e.dataTransfer.files[0]
  if (file) processFile(file)
}

const handleFileSelect = (e) => {
  const file = e.target.files[0]
  if (file) processFile(file)
}

const processFile = async (file) => {
  if (!file.name.toLowerCase().endsWith('.csv')) {
    error.value = 'Разрешены только файлы .csv'
    success.value = null
    return
  }

  loading.value = true
  error.value = null
  success.value = null

  const formData = new FormData()
  formData.append('file', file)

  try {
    const res = await apiClient.post(roomAnalyticsEndpoints.roomAnalytics.loadcsv, formData)
    success.value = `Таблица создана: ${res.data.table_name}. Записей: ${res.data.rows_imported}`
  } catch (err) {
    error.value = err.response?.data?.error || 'Ошибка загрузки'
  } finally {
    loading.value = false
    if (fileInput.value) fileInput.value.value = '' // Сброс input
  }
}
</script>

<style scoped>
.border-dashed { border-style: dashed !important; }
</style>

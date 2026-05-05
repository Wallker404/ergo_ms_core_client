<template>
    <div class="select-box" ref="rootEl">
        <label v-if="label" class="form-label mb-1">{{ label }}</label>
        <div class="dropdown" :class="{ 'is-open': isOpen }">
            <button class="btn btn-light w-100 d-flex align-items-center justify-content-between select-trigger" type="button" :disabled="disabled" @click="toggle" @blur="$emit('blur')">
                <span class="select-trigger-slot d-flex align-items-center flex-grow-1 me-2">
                    <slot name="selected" :option="selectedOption" :label="currentLabel">
                        <span ref="valueTextEl" class="value-text" :style="valueTextInlineStyle">{{ currentLabel }}</span>
                    </slot>
                </span>
                <span v-if="!hideChevron" class="d-inline-flex align-items-center"><ChevronDown class="icon-center" /></span>
            </button>
            <teleport to="body">
                <div
                    v-if="isOpen"
                    ref="menuEl"
                    :class="dropdownTeleportMenuClass"
                    :style="fixedMenuStyle"
                >
                    <input
                        v-if="searchable"
                        ref="searchInputEl"
                        v-model="searchQuery"
                        type="text"
                        class="select-box-search"
                        :placeholder="searchPlaceholder"
                        autocomplete="off"
                    />
                    <template v-if="!virtualized">
                        <ul class="dropdown-menu-list">
                            <li v-if="includeAllOption && !hasActiveSearch">
                                <a class="dropdown-item" :class="{ active: multiple ? (modelValue?.length === 0) : isSelected(null) }" href="#" @click.prevent="choose(null)">{{ allLabel }}</a>
                            </li>
                            <li v-for="opt in filteredOptions" :key="opt.key">
                                <a class="dropdown-item multi-line" :class="{ active: isSelected(opt.value) }" href="#" @click.prevent="choose(opt.value)">
                                    <slot name="option" :option="opt.raw" :label="opt.label" :value="opt.value" :active="isSelected(opt.value)">
                                        <div v-if="multiple && showCheckboxesWhenMultiple" class="d-flex align-items-center">
                                            <input type="checkbox" :checked="isSelected(opt.value)" class="form-check-input me-2" @change="() => {}" />
                                            <span>{{ opt.label }}</span>
                                        </div>
                                        <span v-else>{{ opt.label }}</span>
                                    </slot>
                                </a>
                            </li>
                        </ul>
                    </template>
                    <template v-else>
                        <div class="dropdown-menu-list-virtual-wrap">
                            <div ref="listContainerRef" class="dropdown-menu-list virtual-list-container" @scroll="onListScroll">
                                <div class="virtual-list-spacer" :style="{ height: totalHeight + 'px', position: 'relative' }">
                                    <div class="virtual-list-inner" :style="{ position: 'absolute', top: 0, left: 0, right: 0, transform: 'translateY(' + virtualOffsetY + 'px)' }">
                                        <template v-for="opt in visibleOptions" :key="opt.key">
                                            <a v-if="opt.key === '__all__'" class="dropdown-item" :class="{ active: multiple ? (modelValue?.length === 0) : isSelected(null) }" href="#" :style="{ minHeight: itemHeight + 'px' }" @click.prevent="choose(null)">{{ opt.label }}</a>
                                            <a v-else class="dropdown-item multi-line" :class="{ active: isSelected(opt.value) }" href="#" :style="{ minHeight: itemHeight + 'px' }" @click.prevent="choose(opt.value)">
                                                <slot name="option" :option="opt.raw" :label="opt.label" :value="opt.value" :active="isSelected(opt.value)">
                                                    <div v-if="multiple && showCheckboxesWhenMultiple" class="d-flex align-items-center">
                                                        <input type="checkbox" :checked="isSelected(opt.value)" class="form-check-input me-2" @change="() => {}" />
                                                        <span>{{ opt.label }}</span>
                                                    </div>
                                                    <span v-else>{{ opt.label }}</span>
                                                </slot>
                                            </a>
                                        </template>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </template>
                </div>
            </teleport>
        </div>
    </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { ChevronDown } from 'lucide-vue-next'

const NULL_VALUE = 'null'

const props = defineProps({
    modelValue: { type: [String, Number, Boolean, Object, Array, null], default: null },
    options: { type: Array, default: () => [] },
    label: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    clearable: { type: Boolean, default: false },
    includeAllOption: { type: Boolean, default: true },
    allLabel: { type: String, default: 'Не выбрана' },
    valueKey: { type: String, default: 'id' },
    labelKey: { type: String, default: 'name' },
    size: { type: String, default: 'md' },
    castToNumber: { type: Boolean, default: false },
    currentLabelFormatter: { type: Function, default: null },
    fullWidth: { type: Boolean, default: true },
    maxSelectedChars: { type: [Number, null], default: null },
    hideChevron: { type: Boolean, default: false },
    dropdownAnchorRef: { type: Object, default: null },
    searchable: { type: Boolean, default: false },
    searchPlaceholder: { type: String, default: 'Поиск...' },
    searchByFirstLetters: { type: Boolean, default: false },
    multiple: { type: Boolean, default: false },
    showCheckboxesWhenMultiple: { type: Boolean, default: false },
    multipleLabelFormat: { type: String, default: 'list', validator: (v) => ['count', 'list'].includes(v) },
    virtualized: { type: Boolean, default: false },
    itemHeight: { type: Number, default: 36 },
    overscan: { type: Number, default: 6 },
    /** Не подстраивать размер подписи под ширину и computed-style триггера (для компактных тулбаров) */
    fixedTriggerLabelFontSize: { type: Boolean, default: false },
    /** Доп. класс на выпадающее меню (teleport в body — для стилей с :global у потребителя) */
    dropdownMenuClass: { type: String, default: '' },
    /** Одинаковый размер шрифта у всех пунктов списка, включая active (компактные тулбары) */
    uniformDropdownListFont: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'change', 'blur'])

const dropdownTeleportMenuClass = computed(() => {
    const parts = ['dropdown-menu', 'show', 'fixed-menu']
    if (props.dropdownMenuClass) parts.push(props.dropdownMenuClass)
    if (props.uniformDropdownListFont) parts.push('select-box-menu--uniform-font')
    return parts
})

function toKey(value) {
    if (value === null || value === undefined) return NULL_VALUE
    const type = typeof value
    if (type === 'object') return `${type}:${JSON.stringify(value)}`
    return `${type}:${String(value)}`
}

const normalizedOptions = computed(() => {
    const result = []
    for (const raw of props.options) {
        const isObject = typeof raw === 'object' && raw !== null
        const value = isObject ? raw[props.valueKey] : raw
        const label = isObject ? (raw[props.labelKey] ?? String(value ?? '')) : String(raw ?? '')
        result.push({ key: toKey(value), value, label, raw })
    }
    return result
})

function matchesFirstLetters(label, query) {
    const words = (label || '').split(/[\s\-]+/).filter(Boolean)
    const q = query.toLowerCase()
    let wordIdx = 0
    let charIdx = 0
    while (charIdx < q.length && wordIdx < words.length) {
        const firstChar = words[wordIdx].charAt(0).toLowerCase()
        if (firstChar === q.charAt(charIdx)) charIdx++
        wordIdx++
    }
    return charIdx === q.length
}

const searchQuery = ref('')
const hasActiveSearch = computed(() => props.searchable && searchQuery.value.trim().length > 0)
const filteredOptions = computed(() => {
    if (!props.searchable || !searchQuery.value.trim()) return normalizedOptions.value
    const q = searchQuery.value.trim()
    const qLower = q.toLowerCase()
    if (props.searchByFirstLetters) {
        return normalizedOptions.value.filter(opt => {
            const label = opt.label ?? ''
            const labelLower = label.toLowerCase()
            return matchesFirstLetters(label, q) || labelLower.includes(qLower)
        })
    }
    return normalizedOptions.value.filter(opt => (opt.label ?? '').toLowerCase().includes(qLower))
})

const isOpen = ref(false)
const fixedMenuStyle = ref({ top: '0px', left: '0px', width: '0px' })
function updateMenuPosition() {
    const root = rootEl.value
    if (!root) return
    const trigger = root.querySelector('.select-trigger')
    if (!trigger) return
    const triggerRect = trigger.getBoundingClientRect()
    const anchorEl = props.dropdownAnchorRef?.value
    const anchorRect = anchorEl ? anchorEl.getBoundingClientRect() : null
    const rect = (anchorRect && anchorRect.width > 0) ? anchorRect : triggerRect
    const viewportPadding = 8
    const minDropdownWidth = 120
    const maxWidth = Math.max(0, window.innerWidth - viewportPadding * 2)
    const width = Math.max(minDropdownWidth, Math.min(rect.width, maxWidth))
    const left = Math.min(
        rect.left,
        window.innerWidth - viewportPadding - width
    )
    fixedMenuStyle.value = {
        top: `${triggerRect.bottom + 4}px`,
        left: `${left}px`,
        width: `${width}px`,
        maxWidth: `${maxWidth}px`,
        boxSizing: 'border-box',
    }
}
const searchInputEl = ref(null)
function toggle() {
    if (props.disabled) return
    isOpen.value = !isOpen.value
    if (isOpen.value) {
        updateMenuPosition()
        if (props.dropdownAnchorRef) {
            nextTick(() => {
                updateMenuPosition()
                requestAnimationFrame(() => updateMenuPosition())
            })
        } else {
            requestAnimationFrame(() => updateMenuPosition())
        }
        if (props.searchable) {
            nextTick(() => searchInputEl.value?.focus())
        }
        if (props.virtualized) {
            startIndex.value = 0
            endIndex.value = 0
            nextTick(() => {
                if (listContainerRef.value) {
                    listContainerRef.value.scrollTop = 0
                    updateVisibleRange()
                }
            })
        }
    }
}
function close() {
    isOpen.value = false
    searchQuery.value = ''
}

function coerce(val) {
    if (val === null || val === undefined) return null
    if (props.castToNumber) {
        const n = Number(val)
        return Number.isFinite(n) ? n : null
    }
    return val
}

function choose(value) {
    if (props.multiple && Array.isArray(props.modelValue)) {
        if (value === null || value === undefined) {
            emit('update:modelValue', [])
            emit('change', [])
            return
        }
        const v = coerce(value)
        const arr = [...props.modelValue]
        const idx = arr.findIndex((item) => valuesAreEqual(item, v))
        if (idx >= 0) arr.splice(idx, 1)
        else arr.push(v)
        emit('update:modelValue', arr)
        emit('change', arr)
        return
    }
    const v = coerce(value)
    emit('update:modelValue', v)
    emit('change', v)
    close()
}

const rawCurrentLabel = computed(() => {
    if (props.multiple && Array.isArray(props.modelValue)) {
        if (!props.modelValue.length) return props.allLabel
        if (props.multipleLabelFormat === 'count' && props.modelValue.length > 1) {
            return `${props.modelValue.length} выбрано`
        }
        if (props.multipleLabelFormat === 'count' && props.modelValue.length === 1) {
            const val = props.modelValue[0]
            const found = normalizedOptions.value.find((o) => valuesAreEqual(o.value, val))
            return found ? found.label : String(val)
        }
        const labels = props.modelValue.map((val) => {
            const found = normalizedOptions.value.find((o) => valuesAreEqual(o.value, val))
            return found ? found.label : String(val)
        })
        return labels.join(', ')
    }
    if (props.modelValue === null || props.modelValue === undefined || props.modelValue === '') return props.allLabel
    const found = normalizedOptions.value.find(o => valuesAreEqual(o.value, props.modelValue))
    if (!found) return props.allLabel
    if (typeof props.currentLabelFormatter === 'function') {
        try { return props.currentLabelFormatter({ option: found.raw, value: found.value, label: found.label }) } catch { return found.label }
    }
    return found.label
})

const currentLabel = computed(() => {
    const label = rawCurrentLabel.value ?? ''
    const limit = props.maxSelectedChars
    if (typeof limit === 'number' && limit > 0 && label.length > limit) {
        return label.slice(0, Math.max(0, limit - 1)) + '…'
    }
    return label
})

const selectedOption = computed(() => {
    const found = normalizedOptions.value.find(o => valuesAreEqual(o.value, props.modelValue))
    return found ? found.raw : null
})

function valuesAreEqual(a, b) {
    const aNil = a === null || a === undefined || a === ''
    const bNil = b === null || b === undefined || b === ''
    if (aNil || bNil) return aNil && bNil
    if (typeof a === 'object' || typeof b === 'object') {
        try { return JSON.stringify(a) === JSON.stringify(b) } catch { return false }
    }
    return String(a) === String(b)
}

function isSelected(val) {
    if (props.multiple && Array.isArray(props.modelValue)) {
        return props.modelValue.some((item) => valuesAreEqual(item, val))
    }
    return valuesAreEqual(props.modelValue, val)
}

function handleClickOutside(e) {
    const root = rootEl.value
    if (!root) return
    if (menuEl.value?.contains(e.target)) return
    if (!root.contains(e.target)) close()
}

const rootEl = ref(null)
const menuEl = ref(null)
const valueTextEl = ref(null)
const listContainerRef = ref(null)
const listScrollTop = ref(0)
const listViewportHeight = ref(260)
const startIndex = ref(0)
const endIndex = ref(0)

const effectiveOptionsForVirtual = computed(() => {
    if (!props.virtualized) return []
    const list = filteredOptions.value
    if (props.includeAllOption && !hasActiveSearch.value) {
        return [{ key: '__all__', value: null, label: props.allLabel, raw: null }, ...list]
    }
    return list
})

const totalHeight = computed(() => (props.virtualized ? effectiveOptionsForVirtual.value.length * props.itemHeight : 0))
const visibleOptions = computed(() => {
    if (!props.virtualized) return filteredOptions.value
    const list = effectiveOptionsForVirtual.value
    const start = Math.max(0, startIndex.value)
    const end = Math.min(list.length, endIndex.value)
    return list.slice(start, end)
})
const virtualOffsetY = computed(() => (props.virtualized ? startIndex.value * props.itemHeight : 0))

function updateVisibleRange() {
    if (!props.virtualized || !listContainerRef.value) return
    const el = listContainerRef.value
    listViewportHeight.value = el.clientHeight
    const scrollTop = el.scrollTop
    listScrollTop.value = scrollTop
    const count = effectiveOptionsForVirtual.value.length
    const start = Math.max(0, Math.floor(scrollTop / props.itemHeight) - props.overscan)
    const end = Math.min(count, Math.ceil((scrollTop + el.clientHeight) / props.itemHeight) + props.overscan)
    startIndex.value = start
    endIndex.value = end
}

function onListScroll() {
    updateVisibleRange()
}
const currentFontSize = ref('1rem')
const valueTextInlineStyle = computed(() => {
    if (props.fixedTriggerLabelFontSize) return undefined
    return { fontSize: currentFontSize.value }
})
const baseFontSize = 16
const minFontSize = 12
function adjustFontSize() {
    if (props.fixedTriggerLabelFontSize) return
    if (typeof props.maxSelectedChars === 'number' && props.maxSelectedChars > 0) return
    const el = valueTextEl.value
    if (!el) return
    el.style.fontSize = ''
    currentFontSize.value = '1rem'
    const parent = el.parentElement
    if (!parent) return
    const iconWidth = props.hideChevron ? 0 : 22
    const available = parent.clientWidth - iconWidth - 8
    if (available <= 0) return
    const trigger = rootEl.value?.querySelector('.select-trigger')
    const containerFontSizePx = trigger ? (parseFloat(getComputedStyle(trigger).fontSize) || baseFontSize) : baseFontSize
    const effectiveMinSize = Math.max(minFontSize, Math.round(containerFontSizePx))
    let size = Math.round(containerFontSizePx)
    el.style.fontSize = size + 'px'
    el.style.whiteSpace = 'nowrap'
    while (el.scrollWidth > available && size > effectiveMinSize) {
        size -= 1
        el.style.fontSize = size + 'px'
    }
    currentFontSize.value = el.style.fontSize
}
const onResize = () => {
    adjustFontSize()
    updateMenuPosition()
}
onMounted(() => {
    document.addEventListener('click', handleClickOutside, true)
    nextTick(adjustFontSize)
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', updateMenuPosition, true)
})
onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutside, true)
    window.removeEventListener('resize', onResize)
    window.removeEventListener('scroll', updateMenuPosition, true)
})

watch(() => props.modelValue, async () => {
    await nextTick()
    adjustFontSize()
})

watch([() => (props.virtualized ? effectiveOptionsForVirtual.value.length : filteredOptions.value.length), isOpen], () => {
    if (props.virtualized && isOpen.value) {
        nextTick(updateVisibleRange)
    }
})

watch(searchQuery, () => {
    if (props.virtualized && isOpen.value && listContainerRef.value) {
        listContainerRef.value.scrollTop = 0
        nextTick(updateVisibleRange)
    }
})
</script>

<style scoped lang="scss">
.select-trigger {
    background-color: var(--color-primary-background);
    border: 1px solid var(--bs-border-color, #dee2e6);
    color: var(--color-primary-text);
    text-shadow: none;
    box-shadow: none;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    min-height: 38px;
    white-space: nowrap;
    text-align: left;
    display: inline-flex;
}

.select-trigger :deep(svg) {
    filter: none;
}
.select-trigger-slot {
    min-width: 0;
    overflow: hidden;
}
.select-trigger .value-text {
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.dropdown-menu {
    position: absolute;
    left: 0;
    right: 0;
    top: 100%;
    margin-top: .25rem;
    z-index: 100002;
    width: auto;
    min-width: 100%;
    max-width: 100vw;
    background-color: var(--color-primary-background);
    border: 1px solid var(--color-border);
    border-radius: .375rem;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 0;
}

.select-box-search {
    flex-shrink: 0;
    padding: 0.5rem 0.75rem;
    border: none;
    border-bottom: 1px solid var(--color-border);
    border-radius: 0;
    background-color: var(--color-primary-background);
    color: var(--color-primary-text);
    font-size: 14px;
    outline: none;
    width: 100%;
    box-sizing: border-box;
}

.select-box-search::placeholder {
    color: var(--color-secondary-text);
}

.dropdown-menu-list {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 260px;
    overflow-y: auto;
    overflow-x: hidden;
}

.dropdown-menu-list-virtual-wrap {
    display: flex;
    flex-direction: column;
    max-height: 260px;
    overflow: hidden;
}

.dropdown-menu-list.virtual-list-container {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
}

.virtual-list-spacer {
    pointer-events: none;
}

.virtual-list-inner {
    pointer-events: auto;
}

.fixed-menu {
    position: fixed;
    z-index: 100002;
    left: auto;
    right: auto;
    top: auto;
    min-width: unset;
}
.select-box { max-width: 100%; }
.select-box .dropdown { position: relative; width: 100%; max-width: 100%; }

.dropdown-item {
    color: var(--color-primary-text);
    background-color: transparent;
    font-size: clamp(0.75rem, 2vmin, 1rem);
    padding: clamp(0.35rem, 1vmin, 0.5rem) clamp(0.75rem, 2vmin, 1rem);
    display: block;
    width: 100%;
    clear: both;
    font-weight: 400;
    text-align: left;
    text-decoration: none;
    transition: all 0.15s ease-in-out;
    border: 0;
    cursor: pointer;
}

.dropdown-item :deep(svg) {
    width: 1em;
    height: 1em;
    flex-shrink: 0;
    vertical-align: middle;
}

.dropdown-item:hover {
    background-color: var(--color-hover-background);
    color: var(--color-primary-text);
}

.dropdown-item.multi-line {
    white-space: normal;
    overflow-wrap: anywhere;
    word-break: break-word;
}
.dropdown-item.active {
    background-color: var(--color-accent-bg, rgba(var(--bs-primary-rgb), 0.1));
    color: var(--color-accent, #0d6efd);
    font-weight: 400;
}

.select-box-menu--uniform-font .dropdown-item,
.select-box-menu--uniform-font .dropdown-item.active {
    font-size: 12px;
    font-weight: 400;
}

.icon-center {
    width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; vertical-align: middle;
}

.form-check-input {
    margin-top: 0.25rem;
    cursor: pointer;
}
</style>
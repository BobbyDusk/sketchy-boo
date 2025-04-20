<script lang="ts">
  /*
  Copyright (C) 2023 Edge of Dusk

  This file is part of Sketchy Boo.

  Sketchy Boo is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

  Sketchy Boo is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

  You should have received a copy of the GNU General Public License along with Sketchy Boo. If not, see <https://www.gnu.org/licenses/>.
  */

  import ControlsContainer from "./ControlsContainer.svelte";
  import ButtonGroup from "./ButtonGroup.svelte";
  import { inputSettings } from "./global.svelte.ts"

</script>

<ControlsContainer>
  <ButtonGroup>
    <div class="">
      <label for="images" class="bg-blue-500 px-4 py-2 rounded-md"
        >{inputSettings.inputFile || "Select image"}</label
      >
      <input
        accept="image/png, image/jpeg, image/webp"
        id="images"
        name="images"
        type="file"
        class="hidden"
        bind:value={inputSettings.inputFile}
      />
    </div>
  </ButtonGroup>

  <!--
  <div class="button_group {disabledIfNoImage}">
    <div class="button_item_horizontal">
      <label for="model">mode:</label>
      <select name="mode" bind:value={selectedMode} class="button-item">
        {#each MODES as mode}
          <option value={mode}>
            {mode}
          </option>
        {/each}
      </select>
    </div>

    <div class="button_item_horizontal">
      <label for="backgroundColor">background color:</label>
      <select
        name="backgroundColor"
        bind:value={selectedBackgroundColor}
        class="button-item"
      >
        {#each BACKGROUND_COLORS as color}
          <option value={color}>
            {color}
          </option>
        {/each}
      </select>
    </div>
  </div>

  <div class="button_group {disabledIfNoManual}">
    <div class="button_item_horizontal">
      <input
        type="checkbox"
        id="enable_crop"
        name="enable_crop"
        bind:checked={isCropEnabled}
      />
      <label for="enable_crop">crop</label>
    </div>
    <div class="button_item_horizontal {!isCropEnabled && 'disabled'}">
      <input
        type="checkbox"
        id="enable_auto_crop"
        name="enable_auto_crop"
        bind:checked={isAutoCropEnabled}
      />
      <label for="enable_auto_crop">auto crop</label>
    </div>
    <div
      class="button_item stretch {(!isCropEnabled || !isAutoCropEnabled) &&
        'disabled'}"
    >
      <label for="opacity_threshold">opacity threshold</label>
      <RangeSlider
        id="range_container"
        bind:values={cropOpacityThreshold}
        float
        min={0}
        max={255}
        step={1}
      />
    </div>
  </div>

  <div class="button_group {disabledIfNoManual}">
    <div class="button_item_horizontal">
      <input
        type="checkbox"
        id="enable_background_removal"
        name="enable_background_removal"
        bind:checked={isRemoveBackgroundEnabled}
      />
      <label for="enable_background_removal">background removal</label>
    </div>
    <div class="button_item_horizontal {disabledIfNoRemoveBackground}">
      <label for="model">model:</label>
      <select
        name="model"
        bind:value={selectedRemoveBackgroundModel}
        class="button-item"
      >
        {#each BACKGROUND_REMOVAL_MODELS as model}
          <option value={model}>
            {model}
          </option>
        {/each}
      </select>
    </div>
    <div class="button_item_horizontal {disabledIfNoRemoveBackground}">
      <input
        type="checkbox"
        id="enable_background_removal_post_process"
        name="enable_background_removal_post_process"
        bind:checked={isRemoveBackgroundPostProcessEnabled}
      />
      <label for="enable_background_removal_post_process">
        post process mask
      </label>
    </div>
    <div class="button_item_horizontal {disabledIfNoRemoveBackground}">
      <input
        type="checkbox"
        id="enable_background_removal_edge_white_filter"
        name="enable_background_removal_edge_white_filter"
        bind:checked={isRemoveBackgroundEdgeWhiteFilterEnabled}
      />
      <label for="enable_background_removal_edge_white_filter">
        edge {selectedBackgroundColor} filter
      </label>
    </div>
    <div class="button_item_horizontal {disabledIfNoEdgeWhiteFilter}">
      <label for="edge_white_filter_width">edge width </label>
      <input
        name="edge_white_filter_width"
        id="edge_white_filter_width"
        type="number"
        min="1"
        max="100"
        bind:value={removeBackgroundEdgeWhiteFilterWidth}
      />
    </div>

    <div
      class="button_item stretch {disabledIfNoEdgeWhiteFilter}
			"
    >
      <RangeSlider
        id="range_container"
        range
        pushy
        bind:values={removeBackgroundEdgeWhiteFilterRange}
        float
        min={0}
        max={255}
        step={1}
      />
    </div>
  </div>

  <div class="button_group {disabledIfNoManual}">
    <div class="button_item_horizontal">
      <input
        type="checkbox"
        id="enable_filter_white"
        name="enable_filter_white"
        bind:checked={isFilterWhiteEnabled}
      />
      <label for="enable_filter_white">filter {selectedBackgroundColor}</label>
    </div>
    <div class="button_item {disabledIfNoFilterWhite}">
      <label for="model">model:</label>
      <select
        name="model"
        bind:value={selectedFilterWhiteModel}
        class="button-item"
      >
        {#each WHITE_FILTER_MODELS as model}
          <option value={model}>
            {model}
          </option>
        {/each}
      </select>
    </div>
    <div class="button_item stretch {disabledIfNoFilterWhite}">
      <RangeSlider
        id="range_container"
        range
        pushy
        bind:values={filterWhiteRange}
        float
        min={0}
        max={255}
        step={1}
      />
    </div>
  </div>

  <div class="button_group {disabledIfNoManual}">
    <div class="button_item_horizontal">
      <input
        type="checkbox"
        id="enable_resize"
        name="enable_resize"
        bind:checked={isResizeEnabled}
      />
      <label for="enable_resize">resize</label>
    </div>
    <div class="button_item {disabledIfNoResize}">
      <label for="resize_width">width</label>
      <input
        type="number"
        id="resize_width"
        name="resize_width"
        bind:value={resizeWidth}
        on:change={updateResizeHeight}
        bind:this={resizeWidthInput}
      />
    </div>
    <div class="button_item {disabledIfNoResize}">
      <label for="resize_height">height</label>
      <input
        type="number"
        id="resize_height"
        name="resize_height"
        bind:value={resizeHeight}
        on:change={updateResizeWidth}
        bind:this={resizeHeightInput}
      />
    </div>
  </div>

  <div class="button_group {disabledIfNoImage}">
    <div class="button_item">
      <label for="format">output format:</label>
      <select name="format" bind:value={format} class="button-item">
        {#each FORMATS as format}
          <option value={format}>
            {format}
          </option>
        {/each}
      </select>
    </div>
  </div>

  <div class="button_group {disabledIfNoImage}">
    {#if format == "SVG"}
      <div class="button_item_horizontal">
        <input
          type="checkbox"
          id="simplify_svg"
          name="simplify_svg"
          bind:checked={svgSimplify}
        />
        <label for="simplify_svg">simplify svg</label>
      </div>
      <div class="button_item stretch {!svgSimplify && 'disabled'}">
        <label for="approximation_length"> approximation length</label>
        <RangeSlider
          id="range_container"
          bind:values={svgApproximationLengthPercentage}
          float
          min={0}
          max={1}
          step={0.01}
        />
      </div>
    {:else if format == "WEBP"}
      <div class="button_item_horizontal">
        <input
          type="checkbox"
          id="lossless_webp"
          name="lossless_webp"
          bind:checked={webpLossless}
        />
        <label for="lossless_webp">losless</label>
      </div>
      <div class="button_item stretch">
        <label for="webp_quality">quality</label>
        <RangeSlider
          id="range_container"
          bind:values={webpQuality}
          float
          min={0}
          max={100}
          step={1}
        />
      </div>
      <div class="button_item">
        <label for="webp_method">method</label>
        <select name="webp_method" bind:value={webpMethod} class="button-item">
          {#each Array(7).keys() as num}
            <option value={num}>
              {num}
            </option>
          {/each}
        </select>
      </div>
      <a
        href="https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html"
        target="_blank"
      >
        See here for more info
      </a>
    {:else}
      <p>No format settings</p>
    {/if}
  </div>

  <div class="button_group {disabledIfNoImage}">
    {#if isLoading}
      <div class="loader" />
    {:else}
      <button class="button_item button" on:click={uploadImage}>
        process
      </button>
    {/if}
  </div>
-->
</ControlsContainer>

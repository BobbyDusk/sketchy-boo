<script>
	const SERVER_URL = "http://localhost:8000";
	//	const SERVER_URL = "http://digitizer.api.edgeofdusk.com";
	const WHITE_FILTER_MODES = ["luminocity", "average", "lightness"];
	const BACKGROUND_REMOVAL_MODES = [
		"u2net",
		"u2netp",
		// "u2net_human_seg",
		// "u2net_cloth_seg",
		"silueta",
		"isnet_general_use",
		"isnet_anime",
		"sam",
	];

	let files;
	let removeBackgroundEnabled = true;
	let selectedRemoveBackgroundMode = "u2net";
	let filterWhiteEnabled = true;
	let selectedFilterWhiteMode = "luminocity";
	let filterWhiteThreshold = 90;
	let originalImageSource;
	let processedImageSource;
	let proposedFileName = "processed.png";
	let loading = false;

	$: if (files && files[0]) {
		proposedFileName = `${getBaseFilenameWithoutExtension(
			files[0].name
		)}_processed.png`;
	}

	$: if (files && files[0]) {
		const reader = new FileReader();
		reader.readAsDataURL(files[0]);
		reader.onload = () => {
			originalImageSource = reader.result;
		};
	}

	function getBaseFilenameWithoutExtension(filename) {
		// Remove the path (if any) and then remove the extension
		const baseFilename = filename
			.split("/")
			.pop()
			.split(".")
			.slice(0, -1)
			.join(".");
		return baseFilename;
	}

	async function uploadImage() {
		const formData = new FormData();
		formData.append("file", files[0]);
		formData.append("filterWhiteEnabled", filterWhiteEnabled);
		formData.append("filterWhiteMode", selectedFilterWhiteMode);
		formData.append("filterWhiteThreshold", filterWhiteThreshold);
		formData.append("removeBackgroundEnabled", removeBackgroundEnabled);
		formData.append("removeBackgroundMode", selectedRemoveBackgroundMode);
		try {
			loading = true;
			const response = await fetch(`${SERVER_URL}/upload`, {
				method: "POST",
				body: formData,
			});
			response.headers.forEach(console.log);
			if (response.headers.get("content-type") == "image/png") {
				console.log(response);
				console.log(response.body);
				response.headers.forEach(console.log);
				processedImageSource = URL.createObjectURL(response.body);
			} else {
				const data = await response.json();
				processedImageSource = data.image;
				console.log(data.message);
			}
		} catch (error) {
			console.log(`Error: ${error}`);
		} finally {
			loading = false;
		}
	}
</script>

<div class="app_root">
	<div class="buttons_container">
		<div class="button_group">
			<div class="button_item">
				<label for="images">Select images:</label>
				<input
					accept="image/png, image/jpeg"
					bind:files
					id="images"
					name="images"
					type="file"
				/>
			</div>
		</div>

		<div class="button_group">
			<div class="button_item_horizontal">
				<input
					type="checkbox"
					id="enable_background_removal"
					name="enable_background_removal"
					bind:checked={removeBackgroundEnabled}
				/>
				<label for="enable_background_removal"
					>enable background removal</label
				>
			</div>
			<div class="button_item {!removeBackgroundEnabled && 'disabled'}">
				<label for="mode">mode:</label>
				<select
					name="mode"
					bind:value={selectedRemoveBackgroundMode}
					class="button-item"
				>
					{#each BACKGROUND_REMOVAL_MODES as mode}
						<option value={mode}>
							{mode}
						</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="button_group">
			<div class="button_item_horizontal">
				<input
					type="checkbox"
					id="enable_filter_white"
					name="enable_filter_white"
					bind:checked={filterWhiteEnabled}
				/>
				<label for="enable_filter_white">enable filter white</label>
			</div>
			<div class="button_item {!filterWhiteEnabled && 'disabled'}">
				<label for="mode">mode:</label>
				<select
					name="mode"
					bind:value={selectedFilterWhiteMode}
					class="button-item"
				>
					{#each WHITE_FILTER_MODES as mode}
						<option value={mode}>
							{mode}
						</option>
					{/each}
				</select>
			</div>
			<div class="button_item {!filterWhiteEnabled && 'disabled'}">
				<label for="threshold">threshold</label>
				<div class="threshold_container">
					<input
						type="range"
						bind:value={filterWhiteThreshold}
						name="threshold"
						class="threshold"
						min="0"
						max="100"
						step="1"
					/>
					<p class="threshold_text">{filterWhiteThreshold}</p>
				</div>
			</div>
		</div>

		<div class="button_group">
			{#if loading}
				<div class="loader" />
			{:else}
				<button class="button_item button" on:click={uploadImage}>
					process
				</button>
			{/if}
		</div>
		{#if processedImageSource}
			<div class="button_group">
				<a
					target="_blank"
					href={processedImageSource}
					download={proposedFileName}
					class="button_item button"
				>
					Download
				</a>
			</div>
		{/if}
	</div>

	<div class="image_row">
		<div class="image_container">
			{#if originalImageSource}
				<img
					src={originalImageSource}
					alt="selected img"
					class="image"
				/>
			{:else}
				<p>No image selected</p>
			{/if}
		</div>
		<div class="image_container">
			{#if processedImageSource}
				<img
					src={processedImageSource}
					class="image checkered"
					alt="processed img"
				/>
			{/if}
		</div>
	</div>
</div>
<style>
	.app_root {
		width: 100%;
		min-height: calc(100vh - var(--header-height));
		margin: 0;
		padding: 0 10%;
		display: flex;
		flex-direction: column;
		gap: 25px;
		box-sizing: border-box;
		align-items: stretch;
	}

	.buttons_container {
		width: 100%;
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		gap: 10px;
	}

	.button_group {
		/* border: 1px solid black; */
		border-radius: 15px;
		padding: 20px;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 20px;
		height: 200px;
	}

	.button_item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}

	.button_item_horizontal {
		display: flex;
		flex-direction: row;
		justify-content: center;
		gap: 8px;
	}

	.button {
		border: none;
		border-radius: 10px;
		padding: 15px 30px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 12pt;
		color: black;
		text-decoration: none;
		background-color: lightgray;
	}

	.button:hover {
		filter: brightness(0.8);
		cursor: pointer;
	}

	.image_row {
		width: 100%;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}

	.left,
	.right {
		display: flex;
		flex-direction: row;
		gap: 20px;
	}

	.left {
		grid-column: 1;
	}

	.right {
		grid-column: 2;
	}

	.process_buttons {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 10px;
	}

	.threshold_container {
		width: 100%;
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 10px;
	}

	.threshold {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		background-image: linear-gradient(to right, black, white);
	}

	.threshold_text {
		width: 3ch;
		line-height: 0;
		height: 0;
	}

	.image_container {
		justify-self: center;
	}

	.image {
		width: 40vw;
	}
	.checkered {
		background: -webkit-linear-gradient(
				45deg,
				rgba(0, 0, 0, 0.0980392) 25%,
				transparent 25%,
				transparent 75%,
				rgba(0, 0, 0, 0.0980392) 75%,
				rgba(0, 0, 0, 0.0980392) 0
			),
			-webkit-linear-gradient(45deg, rgba(0, 0, 0, 0.0980392) 25%, transparent
						25%, transparent 75%, rgba(0, 0, 0, 0.0980392) 75%, rgba(
							0,
							0,
							0,
							0.0980392
						)
						0),
			white;
		background: -moz-linear-gradient(
				45deg,
				rgba(0, 0, 0, 0.0980392) 25%,
				transparent 25%,
				transparent 75%,
				rgba(0, 0, 0, 0.0980392) 75%,
				rgba(0, 0, 0, 0.0980392) 0
			),
			-moz-linear-gradient(45deg, rgba(0, 0, 0, 0.0980392) 25%, transparent
						25%, transparent 75%, rgba(0, 0, 0, 0.0980392) 75%, rgba(
							0,
							0,
							0,
							0.0980392
						)
						0),
			white;
		background: linear-gradient(
				45deg,
				rgba(0, 0, 0, 0.0980392) 25%,
				transparent 25%,
				transparent 75%,
				rgba(0, 0, 0, 0.0980392) 75%,
				rgba(0, 0, 0, 0.0980392) 0
			),
			linear-gradient(
				45deg,
				rgba(0, 0, 0, 0.0980392) 25%,
				transparent 25%,
				transparent 75%,
				rgba(0, 0, 0, 0.0980392) 75%,
				rgba(0, 0, 0, 0.0980392) 0
			),
			white;
		background-repeat: repeat, repeat;
		background-position: 0px 0, 5px 5px;
		-webkit-transform-origin: 0 0 0;
		transform-origin: 0 0 0;
		-webkit-background-origin: padding-box, padding-box;
		background-origin: padding-box, padding-box;
		-webkit-background-clip: border-box, border-box;
		background-clip: border-box, border-box;
		-webkit-background-size: 10px 10px, 10px 10px;
		background-size: 10px 10px, 10px 10px;
		-webkit-box-shadow: none;
		box-shadow: none;
		text-shadow: none;
		-webkit-transition: none;
		-moz-transition: none;
		-o-transition: none;
		transition: none;
		-webkit-transform: scaleX(1) scaleY(1) scaleZ(1);
		transform: scaleX(1) scaleY(1) scaleZ(1);
	}

	.loader {
		border: 6px solid #f3f3f3; /* Light grey */
		border-top: 6px solid hsla(0, 0%, 13%);
		border-radius: 50%;
		width: 10px;
		height: 10px;
		animation: spin 2s linear infinite;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.disabled {
		opacity: 0.4;
	}
</style>

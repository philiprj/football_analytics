document.addEventListener('DOMContentLoaded', function() {
    const pitch = document.getElementById('pitch');
    const shotMarker = document.getElementById('shot-marker');
    const addDefenderBtn = document.getElementById('add-defender');
    const toggleGoalkeeperBtn = document.getElementById('add-goalkeeper'); // We'll rename this in the code but keep the ID
    const clearPlayersBtn = document.getElementById('clear-players');
    const calculateXgBtn = document.getElementById('calculate-xg');
    const resultDiv = document.getElementById('result');
    const xgValueDiv = document.getElementById('xg-value');
    const shotTypeSelect = document.getElementById('shot-type');
    const shotTechniqueSelect = document.getElementById('shot-technique');

    let shotPosition = null;
    let players = [];
    let draggedElement = null;
    let isPenalty = false;

    // Update goalkeeper button text
    toggleGoalkeeperBtn.textContent = 'Remove Goalkeeper';

    // Handle penalty shot selection
    shotTypeSelect.addEventListener('change', function() {
        isPenalty = shotTypeSelect.value === 'Penalty';

        if (isPenalty) {
            // Force shot technique to Normal
            shotTechniqueSelect.value = 'Normal';
            shotTechniqueSelect.disabled = true;

            // Disable add defender button
            addDefenderBtn.disabled = true;

            // Clear any existing players
            clearPlayersBtn.click();

            // Add a goalkeeper if none exists
            const hasGoalkeeper = players.some(p => p.position === 'Goalkeeper');
            if (!hasGoalkeeper) {
                addPlayer('goalkeeper');
            }

            // Position shot marker at penalty spot
            const penaltyX = (108.0 / 120) * pitch.offsetWidth;
            const penaltyY = (40.0 / 80) * pitch.offsetHeight;

            shotMarker.style.left = `${penaltyX}px`;
            shotMarker.style.top = `${penaltyY}px`;
            shotMarker.classList.remove('hidden');

            // Convert to StatsBomb coordinates
            shotPosition = [
                Math.round(penaltyX / pitch.offsetWidth * 120),
                Math.round(penaltyY / pitch.offsetHeight * 80)
            ];

            // Update trajectory
            drawShotTrajectory();
        } else {
            // Reset to normal state
            shotTechniqueSelect.disabled = false;
            addDefenderBtn.disabled = false;
        }
    });

    // Initialize shot marker at the penalty spot
    function initializeShotMarker() {
        // Position at penalty spot (in pixels)
        const penaltyX = (108.0 / 120) * pitch.offsetWidth;
        const penaltyY = (40.0 / 80) * pitch.offsetHeight;

        // Set position
        shotMarker.style.left = `${penaltyX}px`;
        shotMarker.style.top = `${penaltyY}px`;
        shotMarker.classList.remove('hidden');

        // Convert to StatsBomb coordinates
        const sbX = Math.round(penaltyX / pitch.offsetWidth * 120);
        const sbY = Math.round(penaltyY / pitch.offsetHeight * 80);
        shotPosition = [sbX, sbY];

        // Draw initial trajectory
        drawShotTrajectory();

        // Make shot marker draggable with mouse
        shotMarker.addEventListener('mousedown', function(e) {
            // Don't allow dragging if it's a penalty
            if (isPenalty) return;

            e.preventDefault();
            e.stopPropagation();
            draggedElement = 'shot';

            function moveHandler(e) {
                const rect = pitch.getBoundingClientRect();
                let x = e.clientX - rect.left;
                let y = e.clientY - rect.top;

                // Keep within bounds
                x = Math.max(0, Math.min(x, pitch.offsetWidth));
                y = Math.max(0, Math.min(y, pitch.offsetHeight));

                shotMarker.style.left = `${x}px`;
                shotMarker.style.top = `${y}px`;

                // Update StatsBomb coordinates
                shotPosition = [
                    Math.round(x / pitch.offsetWidth * 120),
                    Math.round(y / pitch.offsetHeight * 80)
                ];

                // Update trajectory as shot moves
                drawShotTrajectory();
            }

            function upHandler() {
                document.removeEventListener('mousemove', moveHandler);
                document.removeEventListener('mouseup', upHandler);
                draggedElement = null;
            }

            document.addEventListener('mousemove', moveHandler);
            document.addEventListener('mouseup', upHandler);
        });

        // Add touch support for shot marker
        shotMarker.addEventListener('touchstart', function(e) {
            // Don't allow dragging if it's a penalty
            if (isPenalty) return;

            e.preventDefault();
            e.stopPropagation();
            draggedElement = 'shot';

            function touchMoveHandler(e) {
                if (e.touches.length > 0) {
                    const rect = pitch.getBoundingClientRect();
                    let x = e.touches[0].clientX - rect.left;
                    let y = e.touches[0].clientY - rect.top;

                    // Keep within bounds
                    x = Math.max(0, Math.min(x, pitch.offsetWidth));
                    y = Math.max(0, Math.min(y, pitch.offsetHeight));

                    shotMarker.style.left = `${x}px`;
                    shotMarker.style.top = `${y}px`;

                    // Update StatsBomb coordinates
                    shotPosition = [
                        Math.round(x / pitch.offsetWidth * 120),
                        Math.round(y / pitch.offsetHeight * 80)
                    ];

                    // Update trajectory as shot moves
                    drawShotTrajectory();
                }
            }

            function touchEndHandler() {
                document.removeEventListener('touchmove', touchMoveHandler);
                document.removeEventListener('touchend', touchEndHandler);
                document.removeEventListener('touchcancel', touchEndHandler);
                draggedElement = null;
            }

            document.addEventListener('touchmove', touchMoveHandler, { passive: false });
            document.addEventListener('touchend', touchEndHandler);
            document.addEventListener('touchcancel', touchEndHandler);
        });
    }

    // Initialize shot marker when page loads
    initializeShotMarker();

    // Add defender
    addDefenderBtn.addEventListener('click', function() {
        // Don't allow adding defenders if it's a penalty
        if (isPenalty) return;

        addPlayer('defender');
    });

    // Toggle goalkeeper (add/remove)
    toggleGoalkeeperBtn.addEventListener('click', function() {
        const existingGk = players.find(p => p.position === 'Goalkeeper');

        if (existingGk) {
            // Remove goalkeeper
            pitch.removeChild(existingGk.element);
            players = players.filter(p => p !== existingGk);
            toggleGoalkeeperBtn.textContent = 'Add Goalkeeper';
        } else {
            // Add goalkeeper
            addPlayer('goalkeeper');
            toggleGoalkeeperBtn.textContent = 'Remove Goalkeeper';
        }
    });

    // Clear all players
    clearPlayersBtn.addEventListener('click', function() {
        players.forEach(player => {
            pitch.removeChild(player.element);
        });
        players = [];

        // Update goalkeeper button text
        toggleGoalkeeperBtn.textContent = 'Add Goalkeeper';
    });

    // Calculate xG
    calculateXgBtn.addEventListener('click', async function() {
        if (!shotPosition) {
            alert('Please place a shot on the pitch first!');
            return;
        }

        // Show loading state
        calculateXgBtn.disabled = true;
        calculateXgBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Calculating...';

        const shotData = {
            location: shotPosition,
            shot_body_part: document.getElementById('shot-body-part').value,
            shot_type: document.getElementById('shot-type').value,
            shot_technique: document.getElementById('shot-technique').value,
            shot_one_on_one: document.getElementById('one-on-one').checked ? 1 : 0,
            under_pressure: document.getElementById('under-pressure').checked ? 1 : 0,
            shot_first_time: document.getElementById('first-time').checked ? 1 : 0,
            game_period: document.getElementById('game-period').value,
            players: players.map(player => ({
                x: player.x,
                y: player.y,
                teammate: false,
                position: player.position
            }))
        };

        try {
            const response = await fetch('/predict_xg', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(shotData),
            });

            const data = await response.json();

            // Display result
            xgValueDiv.textContent = data.xG.toFixed(2);
            resultDiv.classList.remove('hidden');

            // Display derived features
            displayDerivedFeatures(data.features);

        } catch (error) {
            console.error('Error:', error);
            alert('Error calculating xG. See console for details.');
        } finally {
            // Reset button state
            calculateXgBtn.disabled = false;
            calculateXgBtn.innerHTML = 'Calculate xG';
        }
    });

    // Function to display derived features
    function displayDerivedFeatures(features) {
        // Get or create features container
        let featuresContainer = document.getElementById('features-container');
        if (!featuresContainer) {
            featuresContainer = document.createElement('div');
            featuresContainer.id = 'features-container';
            featuresContainer.className = 'mt-4 p-3 border rounded bg-light';
            resultDiv.appendChild(featuresContainer);
        } else {
            // Clear previous content
            featuresContainer.innerHTML = '';
        }

        // Add heading
        const heading = document.createElement('h5');
        heading.textContent = 'Model Features';
        heading.className = 'mb-3';
        featuresContainer.appendChild(heading);

        // Create table for features
        const table = document.createElement('table');
        table.className = 'table table-sm table-striped';

        // Create table header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const featureHeader = document.createElement('th');
        featureHeader.textContent = 'Feature';
        const valueHeader = document.createElement('th');
        valueHeader.textContent = 'Value';
        headerRow.appendChild(featureHeader);
        headerRow.appendChild(valueHeader);
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create table body
        const tbody = document.createElement('tbody');

        // Format and add each feature
        Object.entries(features).forEach(([key, value]) => {
            const row = document.createElement('tr');

            // Feature name cell
            const featureCell = document.createElement('td');
            featureCell.textContent = formatFeatureName(key);

            // Feature value cell
            const valueCell = document.createElement('td');
            valueCell.textContent = formatFeatureValue(value);

            row.appendChild(featureCell);
            row.appendChild(valueCell);
            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        featuresContainer.appendChild(table);
    }

    // Helper function to format feature names for display
    function formatFeatureName(name) {
        // Replace underscores with spaces and capitalize each word
        return name
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    // Helper function to format feature values for display
    function formatFeatureValue(value) {
        if (typeof value === 'number') {
            // Round numbers to 2 decimal places if they have decimals
            return Number.isInteger(value) ? value.toString() : value.toFixed(2);
        } else if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
        } else if (value === null || value === undefined) {
            return 'N/A';
        } else {
            return value.toString();
        }
    }

    // Helper function to add a player
    function addPlayer(type) {
        // Don't allow adding defenders if it's a penalty
        if (isPenalty && type === 'defender') return;

        const playerElement = document.createElement('div');
        playerElement.className = `player ${type}`;

        // Default position
        let x, y;
        if (type === 'goalkeeper') {
            // Position goalkeeper near the goal
            x = pitch.offsetWidth * 0.98;
            y = pitch.offsetHeight / 2;
            playerElement.textContent = 'GK';
        } else {
            // Position defender in front of goal
            x = pitch.offsetWidth * 0.85;
            y = pitch.offsetHeight / 2;
            playerElement.textContent = 'D';
        }

        playerElement.style.left = `${x}px`;
        playerElement.style.top = `${y}px`;

        // Convert to StatsBomb coordinates
        const sbX = Math.round(x / pitch.offsetWidth * 120);
        const sbY = Math.round(y / pitch.offsetHeight * 80);

        const player = {
            element: playerElement,
            x: sbX,
            y: sbY,
            position: type === 'goalkeeper' ? 'Goalkeeper' : 'Defender',
        };

        players.push(player);
        pitch.appendChild(playerElement);

        // Make player draggable with mouse
        playerElement.addEventListener('mousedown', function(e) {
            // For penalties, only allow dragging the goalkeeper
            if (isPenalty && type !== 'goalkeeper') return;

            e.preventDefault();
            e.stopPropagation();
            draggedElement = player;

            // Mouse move handler for dragging
            function moveHandler(e) {
                const rect = pitch.getBoundingClientRect();
                let x = e.clientX - rect.left;
                let y = e.clientY - rect.top;

                // Keep within bounds
                x = Math.max(0, Math.min(x, pitch.offsetWidth));
                y = Math.max(0, Math.min(y, pitch.offsetHeight));

                playerElement.style.left = `${x}px`;
                playerElement.style.top = `${y}px`;

                // Update StatsBomb coordinates
                player.x = Math.round(x / pitch.offsetWidth * 120);
                player.y = Math.round(y / pitch.offsetHeight * 80);

                // Update trajectory as players move (they might affect xG)
                drawShotTrajectory();
            }

            // Mouse up handler to stop dragging
            function upHandler() {
                document.removeEventListener('mousemove', moveHandler);
                document.removeEventListener('mouseup', upHandler);
                draggedElement = null;
            }

            document.addEventListener('mousemove', moveHandler);
            document.addEventListener('mouseup', upHandler);
        });

        // Add touch support for players
        playerElement.addEventListener('touchstart', function(e) {
            // For penalties, only allow dragging the goalkeeper
            if (isPenalty && type !== 'goalkeeper') return;

            e.preventDefault();
            e.stopPropagation();
            draggedElement = player;

            // Touch move handler for dragging
            function touchMoveHandler(e) {
                if (e.touches.length > 0) {
                    const rect = pitch.getBoundingClientRect();
                    let x = e.touches[0].clientX - rect.left;
                    let y = e.touches[0].clientY - rect.top;

                    // Keep within bounds
                    x = Math.max(0, Math.min(x, pitch.offsetWidth));
                    y = Math.max(0, Math.min(y, pitch.offsetHeight));

                    playerElement.style.left = `${x}px`;
                    playerElement.style.top = `${y}px`;

                    // Update StatsBomb coordinates
                    player.x = Math.round(x / pitch.offsetWidth * 120);
                    player.y = Math.round(y / pitch.offsetHeight * 80);

                    // Update trajectory as players move
                    drawShotTrajectory();
                }
            }

            // Touch end handler to stop dragging
            function touchEndHandler() {
                document.removeEventListener('touchmove', touchMoveHandler);
                document.removeEventListener('touchend', touchEndHandler);
                document.removeEventListener('touchcancel', touchEndHandler);
                draggedElement = null;
            }

            document.addEventListener('touchmove', touchMoveHandler, { passive: false });
            document.addEventListener('touchend', touchEndHandler);
            document.addEventListener('touchcancel', touchEndHandler);
        });
    }

    // Function to draw shot trajectory
    function drawShotTrajectory() {
        // Remove any existing trajectory line
        const existingLine = document.querySelector('.shot-trajectory');
        if (existingLine) {
            pitch.removeChild(existingLine);
        }

        if (!shotPosition) return;

        // Create trajectory line
        const trajectoryLine = document.createElement('div');
        trajectoryLine.className = 'shot-trajectory';

        // Convert StatsBomb coordinates back to pixel positions
        const shotX = (shotPosition[0] / 120) * pitch.offsetWidth;
        const shotY = (shotPosition[1] / 80) * pitch.offsetHeight;

        // Goal center position (in pixels)
        const goalCenterX = pitch.offsetWidth;
        const goalCenterY = pitch.offsetHeight / 2;

        // Calculate angle and length
        const angle = Math.atan2(goalCenterY - shotY, goalCenterX - shotX);
        const length = Math.sqrt(Math.pow(goalCenterX - shotX, 2) + Math.pow(goalCenterY - shotY, 2));

        // Position and rotate the line
        trajectoryLine.style.width = `${length}px`;
        trajectoryLine.style.left = `${shotX}px`;
        trajectoryLine.style.top = `${shotY}px`;
        trajectoryLine.style.transformOrigin = '0 0';
        trajectoryLine.style.transform = `rotate(${angle}rad)`;

        pitch.appendChild(trajectoryLine);
    }

    // Check if penalty is selected on page load
    if (shotTypeSelect.value === 'Penalty') {
        isPenalty = true;
        shotTechniqueSelect.value = 'Normal';
        shotTechniqueSelect.disabled = true;
        addDefenderBtn.disabled = true;
    }

    // Add a default goalkeeper when the page loads
    addPlayer('goalkeeper');
});

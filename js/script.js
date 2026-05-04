/**
 * World Cup Ticket Prices - Main Application Script
 * Handles loading data and providing utilities for the app
 */

class TicketApp {
    constructor() {
        this.matches = [];
        this.stadiums = [];
        this.prices = {};
        this.currentMatch = null;
        this.currentStadium = null;
        this.selectedSeat = null;
    }

    /**
     * Initialize the app by loading all data
     */
    async init() {
        try {
            console.log('Initializing Ticket App...');
            await Promise.all([
                this.loadMatches(),
                this.loadStadiums(),
                this.loadPrices()
            ]);
            console.log('Ticket App initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize Ticket App:', error);
            return false;
        }
    }

    /**
     * Load match data from matches.json
     */
    async loadMatches() {
        try {
            const response = await fetch('data/matches.json');
            if (!response.ok) throw new Error('Failed to load matches');
            this.matches = await response.json();
            console.log(`Loaded ${this.matches.length} matches`);
        } catch (error) {
            console.error('Error loading matches:', error);
            throw error;
        }
    }

    /**
     * Load stadium data from stadium-map.json
     */
    async loadStadiums() {
        try {
            const response = await fetch('data/stadium-map.json');
            if (!response.ok) throw new Error('Failed to load stadiums');
            this.stadiums = await response.json();
            console.log(`Loaded ${this.stadiums.length} stadiums`);
        } catch (error) {
            console.error('Error loading stadiums:', error);
            throw error;
        }
    }

    /**
     * Load price data from prices.json
     */
    async loadPrices() {
        try {
            const response = await fetch('data/prices.json');
            if (!response.ok) throw new Error('Failed to load prices');
            this.prices = await response.json();
            console.log(`Loaded price data with ${this.prices.ticketSites.length} ticket sites`);
        } catch (error) {
            console.error('Error loading prices:', error);
            throw error;
        }
    }

    /**
     * Get a match by ID
     */
    getMatchById(matchId) {
        return this.matches.find(m => m.id === matchId);
    }

    /**
     * Get a stadium by ID
     */
    getStadiumById(stadiumId) {
        return this.stadiums.find(s => s.id === stadiumId);
    }

    /**
     * Get all unique dates from matches
     */
    getUniqueDates() {
        const dates = [...new Set(this.matches.map(m => m.date))];
        return dates.sort();
    }

    /**
     * Get all unique cities from matches
     */
    getUniqueCities() {
        const cities = [...new Set(this.matches.map(m => m.city))];
        return cities.sort();
    }

    /**
     * Filter matches by criteria
     */
    filterMatches(criteria = {}) {
        const { searchText = '', date = '', city = '' } = criteria;
        
        return this.matches.filter(match => {
            const textMatch = !searchText || 
                match.homeTeam.toLowerCase().includes(searchText.toLowerCase()) ||
                match.awayTeam.toLowerCase().includes(searchText.toLowerCase());
            
            const dateMatch = !date || match.date === date;
            const cityMatch = !city || match.city === city;
            
            return textMatch && dateMatch && cityMatch;
        });
    }

    /**
     * Get seat status (available, sold, premium) based on random probability
     */
    getSeatStatus() {
        const rand = Math.random();
        const statusConfig = this.prices.seatStatuses;
        
        let cumulative = 0;
        for (const [status, config] of Object.entries(statusConfig)) {
            cumulative += config.probability;
            if (rand <= cumulative) {
                return status;
            }
        }
        return 'available';
    }

    /**
     * Calculate seat price with all sites
     */
    calculateSeatPrices(basePrice) {
        const priceList = [];
        
        this.prices.ticketSites.forEach(site => {
            const priceBeforeFee = Math.round(basePrice * site.priceMultiplier);
            const fee = Math.round(priceBeforeFee * (site.feePercentage / 100));
            const total = priceBeforeFee + fee;
            
            priceList.push({
                siteId: site.id,
                siteName: site.name,
                siteUrl: site.url,
                basePrice: priceBeforeFee,
                fee: fee,
                total: total,
                feePercentage: site.feePercentage,
                description: site.description
            });
        });
        
        return priceList.sort((a, b) => a.total - b.total);
    }

    /**
     * Get section details for a stadium
     */
    getSectionDetails(stadiumId, sectionId) {
        const stadium = this.getStadiumById(stadiumId);
        if (!stadium || !stadium.sections[sectionId]) {
            return null;
        }
        return stadium.sections[sectionId];
    }

    /**
     * Generate array of seats for a section
     */
    generateSeats(stadiumId, sectionId) {
        const section = this.getSectionDetails(stadiumId, sectionId);
        if (!section) return [];
        
        const seats = [];
        for (let row = 1; row <= section.rows; row++) {
            for (let seat = 1; seat <= section.seatsPerRow; seat++) {
                const seatId = `${sectionId}${String.fromCharCode(64 + row)}${seat}`;
                
                seats.push({
                    id: seatId,
                    row: row,
                    seat: seat,
                    label: `${String.fromCharCode(64 + row)}${seat}`,
                    status: this.getSeatStatus(),
                    sectionId: sectionId,
                    stadiumId: stadiumId,
                    basePrice: section.price
                });
            }
        }
        return seats;
    }

    /**
     * Generate buy links with seat and section context
     */
    generateBuyLink(seat, site, matchId, matchInfo) {
        const params = new URLSearchParams({
            seat: seat.id,
            section: seat.sectionId,
            match: matchId,
            price: site.total,
            team1: matchInfo.homeTeam,
            team2: matchInfo.awayTeam,
            date: matchInfo.date,
            time: matchInfo.time,
            stadium: matchInfo.stadium,
            utm_source: 'world-cup-prices',
            utm_medium: 'seat-selection',
            utm_campaign: `${matchInfo.homeTeam}-vs-${matchInfo.awayTeam}`
        });

        return `${site.siteUrl}?${params.toString()}`;
    }

    /**
     * Render match selector HTML
     */
    renderMatchSelector(containerId, onMatchSelect) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        container.innerHTML = this.matches.map(match => `
            <div class="match-card" data-match-id="${match.id}">
                <div class="match-info">
                    <div class="match-teams">
                        <span class="team">${match.homeTeam}</span>
                        <span class="vs-badge">VS</span>
                        <span class="team">${match.awayTeam}</span>
                    </div>
                    <div class="match-details">
                        <span>📅 ${this.formatDate(match.date)} ${match.time}</span>
                        <span>🏟️ ${match.stadium}</span>
                        <span>📍 ${match.city}</span>
                    </div>
                </div>
                <div class="match-meta">
                    <span class="group-badge">${match.group}</span>
                    <span class="available-tickets">${match.ticketsAvailable} Available</span>
                </div>
            </div>
        `).join('');

        // Attach event listeners
        container.querySelectorAll('.match-card').forEach(card => {
            card.addEventListener('click', () => {
                const matchId = card.getAttribute('data-match-id');
                const match = this.getMatchById(matchId);
                if (onMatchSelect) {
                    onMatchSelect(match);
                }
            });
        });
    }

    /**
     * Render section selector for a stadium map
     */
    renderSections(stadiumId, containerId, onSectionClick) {
        const stadium = this.getStadiumById(stadiumId);
        if (!stadium) {
            console.error(`Stadium ${stadiumId} not found`);
            return;
        }

        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        const sections = Object.entries(stadium.sections).map(([sectionId, sectionData]) => `
            <div class="stadium-section" data-section-id="${sectionId}" title="${sectionData.name}">
                ${sectionId}
            </div>
        `).join('');

        container.innerHTML = sections;

        // Attach event listeners
        container.querySelectorAll('.stadium-section').forEach(section => {
            section.addEventListener('click', () => {
                const sectionId = section.getAttribute('data-section-id');
                const sectionData = stadium.sections[sectionId];
                if (onSectionClick) {
                    onSectionClick({
                        sectionId,
                        stadium,
                        ...sectionData
                    });
                }
            });
        });
    }

    /**
     * Render seats for a section
     */
    renderSeats(stadiumId, sectionId, containerId, onSeatClick) {
        const seats = this.generateSeats(stadiumId, sectionId);
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        const seatsHtml = seats.map(seat => `
            <div class="seat" 
                 data-seat-id="${seat.id}" 
                 data-status="${seat.status}"
                 title="${seat.label} - ${seat.status}"
                 ${seat.status === 'sold' ? 'disabled' : ''}>
                ${seat.label}
            </div>
        `).join('');

        container.innerHTML = seatsHtml;

        // Attach event listeners
        container.querySelectorAll('.seat').forEach(seatElement => {
            if (seatElement.getAttribute('data-status') !== 'sold') {
                seatElement.addEventListener('click', () => {
                    const seatId = seatElement.getAttribute('data-seat-id');
                    const seat = seats.find(s => s.id === seatId);
                    if (onSeatClick) {
                        onSeatClick(seat);
                    }
                });
            }
        });
    }

    /**
     * Render price comparison for a seat
     */
    renderPrices(seat, matchId, containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        const match = this.getMatchById(matchId);
        if (!match) {
            console.error(`Match ${matchId} not found`);
            return;
        }

        const prices = this.calculateSeatPrices(seat.basePrice);

        const pricesHtml = prices.map(site => `
            <div class="price-item">
                <div class="price-site">
                    <div class="price-site-name">${site.siteName}</div>
                    <div class="price-site-fee">+ $${site.fee} fee (${site.feePercentage}%)</div>
                </div>
                <div class="price-value">$${site.total}</div>
                <a href="${this.generateBuyLink(seat, site, matchId, match)}" 
                   class="buy-btn" 
                   target="_blank"
                   data-site="${site.siteId}">
                    Buy on ${site.siteName}
                </a>
            </div>
        `).join('');

        container.innerHTML = pricesHtml;
    }

    /**
     * Format date helper
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    /**
     * Format time helper
     */
    formatTime(timeString) {
        return timeString; // Already in HH:MM format
    }

    /**
     * Get match URL parameter from query string
     */
    static getMatchIdFromURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('id');
    }

    /**
     * Get match ID from URL
     */
    static getSeatFromURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('seat');
    }

    /**
     * Navigate to match details page
     */
    static navigateToMatch(matchId) {
        window.location.href = `match-details.html?id=${matchId}`;
    }

    /**
     * Navigate to stadium map page
     */
    static navigateToStadium(matchId) {
        window.location.href = `stadium-map.html?matchId=${matchId}`;
    }

    /**
     * Get seat price with multiplier for level
     */
    getSeatPriceWithLevel(basePrice, level = 'ground') {
        const multiplier = this.prices.levelPriceMultipliers[level] || 1;
        return Math.round(basePrice * multiplier);
    }
}

// Create a global instance
const ticketApp = new TicketApp();

// Export for use in other modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TicketApp;
}

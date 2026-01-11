"""
Lineup Team Solver API

Production-ready Flask API for the OR-Tools team generation solver.
Deploy on Railway, Render, or any Python hosting.

Endpoints:
    POST /api/solve - Generate balanced teams
    GET /api/health - Health check
"""

import os
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from solver import solve_from_dict, solve_teams, Player, Position

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Allow requests from your Next.js frontend

PORT = int(os.environ.get('PORT', 5001))


@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'lineup-solver',
        'version': '2.0.0',
        'engine': 'Google OR-Tools CP-SAT'
    })


@app.route('/api/solve', methods=['POST'])
def solve():
    """
    Generate balanced teams.

    Request:
    {
        "players": [
            {
                "player_id": "uuid",
                "name": "Player Name",
                "age": 25,
                "rating": 4,
                "main_position": "MID",
                "alt_position": "DF"
            }
        ],
        "options": {
            "timeout_seconds": 10.0
        }
    }
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({'success': False, 'message': 'No data provided'}), 400

        players_data = data.get('players', [])
        options = data.get('options', {})
        timeout = options.get('timeout_seconds', 10.0)

        if not players_data:
            return jsonify({'success': False, 'message': 'No players provided'}), 400

        logger.info(f"Solving for {len(players_data)} players")

        result = solve_from_dict(players_data, timeout=timeout)

        status_code = 200 if result.get('success') else 422
        return jsonify(result), status_code

    except Exception as e:
        logger.exception("Solve error")
        return jsonify({
            'success': False,
            'message': f'Server error: {str(e)}'
        }), 500


@app.route('/api/validate', methods=['POST'])
def validate():
    """Validate player data without solving"""
    try:
        data = request.get_json()
        players = data.get('players', [])

        errors = []
        warnings = []

        for i, p in enumerate(players):
            for field in ['player_id', 'name', 'age', 'main_position']:
                if field not in p:
                    errors.append(f"Player {i+1}: Missing '{field}'")

            rating = p.get('rating', 3)
            if not 1 <= rating <= 5:
                errors.append(f"Player '{p.get('name', i+1)}': Rating must be 1-5")

            pos = p.get('main_position', '')
            if pos not in ['GK', 'DF', 'MID', 'ST']:
                errors.append(f"Player '{p.get('name', i+1)}': Invalid position '{pos}'")

        if len(players) < 6:
            warnings.append(f"Only {len(players)} players. Need at least 6.")

        gk_count = sum(1 for p in players if p.get('main_position') == 'GK' or p.get('alt_position') == 'GK')
        team_count = 3 if len(players) >= 21 else 2

        if gk_count < team_count:
            warnings.append(f"Only {gk_count} GK(s) for {team_count} teams")

        return jsonify({
            'valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings,
            'player_count': len(players)
        })

    except Exception as e:
        return jsonify({'valid': False, 'errors': [str(e)]}), 400


if __name__ == '__main__':
    logger.info(f"Starting Lineup Solver API on port {PORT}")
    app.run(host='0.0.0.0', port=PORT)

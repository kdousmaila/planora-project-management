"""
Planora AI — Sentiment Analysis Server
Usage : python app.py
Port  : 8000
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import os
import pyodbc
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'planora_sentiment_model.pkl')
try:
    model = joblib.load(MODEL_PATH)
    print(f'✅ Model loaded from {MODEL_PATH}')
except FileNotFoundError:
    print(f'❌ Model file not found : {MODEL_PATH}')
    model = None

DB_CONNECTION_STRING = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=(localdb)\\mssqllocaldb;"
    "DATABASE=PlanoraDev;"
    "Trusted_Connection=yes;"
)

def get_db_connection():
    return pyodbc.connect(DB_CONNECTION_STRING)

def normalize(s):
    return s


@app.route('/api/sentiment/team-health-live', methods=['POST'])
def analyze_team_health_live():
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 503

    body     = request.get_json(force=True)
    scope_id = body.get('projectId', '').strip()

    if not scope_id:
        return jsonify({'error': 'projectId required'}), 400

    try:
        conn   = get_db_connection()
        cursor = conn.cursor()
        since  = datetime.utcnow() - timedelta(days=7)

        if scope_id.lower() == 'all':
            cursor.execute("""
                SELECT cm.Id, cm.Content,
                       ISNULL(cm.SenderUserId, 'unknown'),
                       ISNULL(u.FirstName + ' ' + u.LastName, 'Unknown')
                FROM ChatMessages cm
                INNER JOIN ChatSessions cs ON cm.ChatSessionId = cs.Id
                LEFT  JOIN AspNetUsers  u  ON cm.SenderUserId  = u.Id
                WHERE cm.IsAssistant = 0
                  AND cm.CreatedAt  >= ?
                  AND cm.Content    IS NOT NULL
                  AND LEN(LTRIM(RTRIM(cm.Content))) > 5
                ORDER BY cm.CreatedAt DESC
            """, since)
        else:
            cursor.execute("""
                SELECT cm.Id, cm.Content,
                       ISNULL(cm.SenderUserId, 'unknown'),
                       ISNULL(u.FirstName + ' ' + u.LastName, 'Unknown')
                FROM ChatMessages cm
                INNER JOIN ChatSessions cs ON cm.ChatSessionId = cs.Id
                INNER JOIN Projects     p  ON cs.ProjectId     = p.Id
                INNER JOIN Workspaces   w  ON p.WorkspaceId    = w.Id
                LEFT  JOIN AspNetUsers  u  ON cm.SenderUserId  = u.Id
                WHERE w.ProjectManagerId = ?
                  AND cm.IsAssistant     = 0
                  AND cm.CreatedAt      >= ?
                  AND cm.Content        IS NOT NULL
                  AND LEN(LTRIM(RTRIM(cm.Content))) > 5
                ORDER BY cm.CreatedAt DESC
            """, scope_id, since)

        rows = cursor.fetchall()
        conn.close()

    except Exception as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500

    if not rows:
        return jsonify({
            'projectId': scope_id,
            'analyzedAt': datetime.utcnow().isoformat(),
            'totalMessages': 0,
            'globalScore': 5,
            'globalMood': 'Not enough data',
            'globalMoodIcon': '💤',
            'globalMoodColor': 'neutral',
            'distribution': {'Positive': 0, 'Neutral': 0, 'Stressed': 0, 'Frustrated': 0},
            'percentages':  {'Positive': 0, 'Neutral': 0, 'Stressed': 0, 'Frustrated': 0},
            'alerts': [], 'membersSummary': [], 'messageResults': []
        })

    messages   = [{'id': str(r[0]), 'content': r[1], 'authorId': str(r[2]), 'authorName': r[3]} for r in rows]
    texts      = [m['content'] for m in messages]
    sentiments = model.predict(texts)
    probas     = model.predict_proba(texts)

    counts = {'Positive': 0, 'Neutral': 0, 'Stressed': 0, 'Frustrated': 0}
    for s in sentiments:
        counts[normalize(s)] = counts.get(normalize(s), 0) + 1

    total = len(messages)
    pct   = {k: round(v / total * 100, 1) for k, v in counts.items()}
    pos_r = counts['Positive']   / total
    str_r = counts['Stressed']   / total
    fru_r = counts['Frustrated'] / total

    global_score = max(0, min(10, round((pos_r * 10) - (str_r * 4) - (fru_r * 6))))

    if global_score >= 7:   mood, icon, color = 'Motivated team',  '🚀', 'positive'
    elif global_score >= 5: mood, icon, color = 'Good atmosphere', '😊', 'neutral'
    elif str_r > fru_r:     mood, icon, color = 'Stress detected', '⚠️', 'stressed'
    else:                   mood, icon, color = 'Team tensions',   '🔴', 'frustrated'

    member_stats = {}
    for msg, sentiment, proba in zip(messages, sentiments, probas):
        aid  = msg['authorId']
        name = msg['authorName']
        s    = normalize(sentiment)
        if aid not in member_stats:
            member_stats[aid] = {
                'authorId': aid, 'authorName': name,
                'counts': {'Positive': 0, 'Neutral': 0, 'Stressed': 0, 'Frustrated': 0},
                'total': 0
            }
        member_stats[aid]['counts'][s] = member_stats[aid]['counts'].get(s, 0) + 1
        member_stats[aid]['total'] += 1

    alerts, members_summary = [], []
    for uid, stats in member_stats.items():
        t   = stats['total']
        s_r = stats['counts']['Stressed']   / t
        f_r = stats['counts']['Frustrated'] / t
        members_summary.append({
            'authorId': uid,
            'authorName': stats['authorName'],
            'totalMessages': t,
            'dominantMood': max(stats['counts'], key=stats['counts'].get),
            'stressRatio': round(s_r * 100, 1),
            'frustrationRatio': round(f_r * 100, 1)
        })
        if s_r >= 0.5:
            alerts.append({
                'type': 'stress', 'icon': '😰', 'level': 'warning',
                'message': f'High stress detected for {stats["authorName"]}',
                'detail':  f'{int(s_r * 100)}% of their messages express stress'
            })
        if f_r >= 0.5:
            alerts.append({
                'type': 'frustration', 'icon': '😤', 'level': 'danger',
                'message': f'Frustration detected for {stats["authorName"]}',
                'detail':  f'{int(f_r * 100)}% of their messages express frustration'
            })

    if global_score <= 3 and not alerts:
        alerts.append({
            'type': 'team', 'icon': '🔴', 'level': 'danger',
            'message': 'General atmosphere degraded',
            'detail':  'Team morale needs immediate attention'
        })

    return jsonify({
        'projectId': scope_id,
        'analyzedAt': datetime.utcnow().isoformat(),
        'totalMessages': total,
        'globalScore': global_score,
        'globalMood': mood,
        'globalMoodIcon': icon,
        'globalMoodColor': color,
        'distribution': counts,
        'percentages': pct,
        'alerts': alerts,
        'membersSummary': members_summary,
        'messageResults': [
            {
                'id': m['id'],
                'content': m['content'],
                'authorName': m['authorName'],
                'sentiment': normalize(s),
                'confidence': round(float(np.max(p)) * 100, 1)
            }
            for m, s, p in zip(messages, sentiments, probas)
        ]
    })


@app.route('/api/health', methods=['GET'])
def health():
    db_status = 'ok'
    try:
        conn = get_db_connection()
        conn.close()
    except Exception as e:
        db_status = f'error: {str(e)}'
    return jsonify({
        'status': 'ok',
        'model': 'loaded' if model else 'missing',
        'database': db_status,
        'time': datetime.utcnow().isoformat()
    })


if __name__ == '__main__':
    print('🚀 Planora Sentiment API started on http://localhost:8000')
    app.run(debug=True, port=8000)
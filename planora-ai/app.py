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
import re
import pyodbc
from datetime import datetime, timedelta, timezone

UTC = timezone.utc

app = Flask(__name__)
CORS(app)

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'planora_sentiment_model.pkl')
try:
    sentiment_model = joblib.load(MODEL_PATH)
    print(f'✅ Model loaded from {MODEL_PATH}')
    print(f'🔍 Model classes: {sentiment_model.classes_}')
except FileNotFoundError:
    print(f'❌ Model file not found : {MODEL_PATH}')
    sentiment_model = None
except Exception as exc:
    print(f'❌ Failed to load model: {exc}')
    sentiment_model = None

DB_CONNECTION_STRING = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=(localdb)\\mssqllocaldb;"
    "DATABASE=PlanoraDev;"
    "Trusted_Connection=yes;"
)

def get_db_connection():
    return pyodbc.connect(DB_CONNECTION_STRING)


ENGLISH_HINT_WORDS = {
    'the', 'and', 'is', 'are', 'am', 'to', 'for', 'with', 'thanks', 'great', 'good', 'nice',
    'update', 'status', 'task', 'bug', 'issue', 'blocker', 'deadline', 'help', 'please', 'review',
    'meeting', 'deploy', 'deployment', 'release', 'build', 'sprint', 'team', 'project', 'work',
    'stuck', 'overwhelmed', 'frustrated', 'happy', 'progress', 'done', 'ready', 'today', 'tomorrow',
    'again', 'nobody', 'nothing', 'someone', 'support', 'urgent', 'fix', 'broken', 'waiting', 'on',
}

FOREIGN_HINT_WORDS = {
    'le', 'la', 'les', 'des', 'un', 'une', 'de', 'du', 'et', 'est', 'pour', 'avec', 'dans', 'sur',
    'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'bonjour', 'merci', 'tres', 'très',
    'equipe', 'équipe', 'travail', 'travaille', 'reunion', 'réunion', 'bloque', 'bloqué', 'delai',
    'délai', 'sprint', 'projet', 'depuis', 'encore', 'personne', 'rapport', 'besoin', 'aide',
}

NON_ASCII_HINTS = set('àâçéèêëîïôùûüÿœæ')


def tokenize(text):
    return re.findall(r"[a-z']+", text.lower())


def is_english_text(text):
    if not text or not text.strip():
        return False

    lowered = text.lower()
    if any(char in lowered for char in NON_ASCII_HINTS):
        return False

    tokens = tokenize(lowered)
    if not tokens:
        return False

    english_score = 0.0
    for token in tokens:
        if token in ENGLISH_HINT_WORDS:
            english_score += 1.5
        if token in FOREIGN_HINT_WORDS:
            english_score -= 2.5

    if len(tokens) <= 2 and english_score <= 0:
        return False

    return english_score > 0

def normalize(s):
    mapping = {
        'Positive':   'Positive',
        'Neutral':    'Neutral',
        'Stressed':   'Stressed',
        'Frustrated': 'Frustrated',
        'Positif':    'Positive',
        'Neutre':     'Neutral',
        'Stresse':    'Stressed',
        'Frustre':    'Frustrated',
    }
    return mapping.get(s, 'Neutral')


def predict_sentiment(text):
    if not is_english_text(text):
        return 'Neutral', 0.0

    if sentiment_model is None:
        return 'Neutral', 0.0

    probabilities = sentiment_model.predict_proba([text])[0]
    label_index = int(np.argmax(probabilities))
    label = normalize(sentiment_model.classes_[label_index])
    confidence = round(float(np.max(probabilities)) * 100, 1)
    return label, confidence


@app.route('/api/sentiment/team-health-live', methods=['POST'])
def analyze_team_health_live():
    body     = request.get_json(force=True)
    scope_id = body.get('projectId', '').strip()

    if not scope_id:
        return jsonify({'error': 'projectId required'}), 400

    try:
        conn   = get_db_connection()
        cursor = conn.cursor()
        since  = datetime.now(UTC) - timedelta(days=7)

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
                LEFT  JOIN AspNetUsers  u  ON cm.SenderUserId  = u.Id
                WHERE cs.ProjectId  = ?
                  AND cm.IsAssistant = 0
                  AND cm.CreatedAt  >= ?
                  AND cm.Content    IS NOT NULL
                  AND LEN(LTRIM(RTRIM(cm.Content))) > 5
                ORDER BY cm.CreatedAt DESC
            """, scope_id, since)

        rows = cursor.fetchall()
        conn.close()

    except Exception as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500

    EMPTY = {'Positive': 0, 'Neutral': 0, 'Stressed': 0, 'Frustrated': 0}

    if not rows:
        return jsonify({
            'projectId':      scope_id,
            'analyzedAt':     datetime.now(UTC).isoformat(),
            'totalMessages':  0,
            'globalScore':    5,
            'globalMood':     'Not enough English data',
            'globalMoodIcon': '💤',
            'globalMoodColor':'neutral',
            'distribution':   EMPTY,
            'percentages':    EMPTY,
            'alerts': [], 'membersSummary': [], 'messageResults': []
        })

    messages   = [{'id': str(r[0]), 'content': r[1], 'authorId': str(r[2]), 'authorName': r[3]} for r in rows]
    texts      = [m['content'] for m in messages]
    predictions = [predict_sentiment(text) for text in texts]
    sentiments  = [item[0] for item in predictions]
    confidences = [item[1] for item in predictions]

    counts = {'Positive': 0, 'Neutral': 0, 'Stressed': 0, 'Frustrated': 0}
    for s in sentiments:
        normalized = normalize(s)
        counts[normalized] = counts.get(normalized, 0) + 1

    total     = len(messages)
    pct       = {k: round(v / total * 100, 1) for k, v in counts.items()}
    pos_r     = counts['Positive']   / total
    neu_r     = counts['Neutral']    / total
    str_r     = counts['Stressed']   / total
    fru_r     = counts['Frustrated'] / total

    global_score = max(1, min(10, round(
        (pos_r * 10) +
        (neu_r * 5)  -
        (str_r * 3)  -
        (fru_r * 4)
    )))

    if global_score >= 7:   mood, icon, color = 'Motivated team',    '🚀', 'positive'
    elif global_score >= 5: mood, icon, color = 'Good atmosphere',   '😊', 'neutral'
    elif str_r > fru_r:     mood, icon, color = 'Stress detected',   '⚠️', 'stressed'
    else:                   mood, icon, color = 'Tension detected',  '🔴', 'frustrated'

    member_stats = {}
    for msg, sentiment in zip(messages, sentiments):
        aid  = msg['authorId']
        name = msg['authorName']
        s    = normalize(sentiment)
        if aid not in member_stats:
            member_stats[aid] = {
                'authorId':   aid,
                'authorName': name,
                'counts': {'Positive': 0, 'Neutral': 0, 'Stressed': 0, 'Frustrated': 0},
                'total':  0
            }
        member_stats[aid]['counts'][s] = member_stats[aid]['counts'].get(s, 0) + 1
        member_stats[aid]['total'] += 1

    alerts, members_summary = [], []
    for uid, stats in member_stats.items():
        t   = stats['total']
        s_r = stats['counts']['Stressed']   / t
        f_r = stats['counts']['Frustrated'] / t
        members_summary.append({
            'authorId':         uid,
            'authorName':       stats['authorName'],
            'totalMessages':    t,
            'dominantMood':     max(stats['counts'], key=stats['counts'].get),
            'stressRatio':      round(s_r * 100, 1),
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
            'message': 'Overall atmosphere degraded',
            'detail':  'Team morale requires immediate attention'
        })

    return jsonify({
        'projectId':       scope_id,
        'analyzedAt':      datetime.now(UTC).isoformat(),
        'totalMessages':   total,
        'globalScore':     global_score,
        'globalMood':      mood,
        'globalMoodIcon':  icon,
        'globalMoodColor': color,
        'distribution':    counts,
        'percentages':     pct,
        'alerts':          alerts,
        'membersSummary':  members_summary,
        'messageResults': [
            {
                'id':         m['id'],
                'content':    m['content'],
                'authorName': m['authorName'],
                'sentiment':  normalize(s),
                'confidence': confidence
            }
            for m, s, confidence in zip(messages, sentiments, confidences)
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
        'status':   'ok',
        'model':    'loaded' if sentiment_model else 'missing',
        'database': db_status,
        'time':     datetime.now(UTC).isoformat()
    })


if __name__ == '__main__':
    print('🚀 Planora Sentiment API started on http://localhost:8000')
    app.run(debug=True, port=8000)

import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
import joblib

data = [
    ('Great work everyone', 'Positive'), ('Excellent job on the feature', 'Positive'),
    ('We finished the sprint successfully', 'Positive'), ('The demo went really well', 'Positive'),
    ('Good progress on the project', 'Positive'), ('We delivered on time', 'Positive'),
    ('Super travail toute l equipe', 'Positive'), ('On a termine le sprint avec succes', 'Positive'),
    ('Bravo a toute l equipe', 'Positive'), ('Le client est tres satisfait', 'Positive'),
    ('Tout fonctionne comme prevu', 'Positive'), ('Bonne ambiance dans l equipe', 'Positive'),

    ('The meeting is at 2pm', 'Neutral'), ('I updated the task in the backlog', 'Neutral'),
    ('Deployment is scheduled for Friday', 'Neutral'), ('The server was restarted', 'Neutral'),
    ('I created a new git branch', 'Neutral'), ('Build is complete', 'Neutral'),
    ('La reunion est a 14h', 'Neutral'), ('Le deploiement est prevu pour vendredi', 'Neutral'),
    ('Le serveur a ete redemarre', 'Neutral'), ('Les tests unitaires sont en cours', 'Neutral'),
    ('Je travaille sur le module de connexion', 'Neutral'), ('J ai assigne la tache', 'Neutral'),

    ('I have been stuck since yesterday', 'Stressed'), ('I have too many tasks this week', 'Stressed'),
    ('The deadline is tight I won t make it', 'Stressed'), ('I cannot solve this problem', 'Stressed'),
    ('The pressure is too high right now', 'Stressed'), ('I need help I am lost', 'Stressed'),
    ('I am exhausted from this sprint', 'Stressed'), ('Too many meetings impossible to code', 'Stressed'),
    ('Je suis bloque depuis hier', 'Stressed'), ('J ai trop de taches pour cette semaine', 'Stressed'),
    ('Le delai est tres serre je vais pas y arriver', 'Stressed'), ('La pression est trop forte', 'Stressed'),
    ('J ai peur de ne pas finir a temps', 'Stressed'), ('Je suis epuise par ce sprint', 'Stressed'),
    ('J ai besoin d aide je suis perdu', 'Stressed'), ('Je suis deborde aidez moi', 'Stressed'),

    ('This bug blocks since 3 days nobody responds', 'Frustrated'), ('We always make the same mistakes', 'Frustrated'),
    ('Requirements keep changing it is impossible', 'Frustrated'), ('I am the only one working here', 'Frustrated'),
    ('Another useless meeting', 'Frustrated'), ('Nobody reads my messages', 'Frustrated'),
    ('Nobody respects deadlines in this team', 'Frustrated'), ('I am tired of fixing other people bugs', 'Frustrated'),
    ('Ce bug est bloquant depuis 3 jours personne ne repond', 'Frustrated'),
    ('Personne ne respecte les delais dans cette equipe', 'Frustrated'),
    ('Encore une reunion inutile', 'Frustrated'), ('Personne ne lit mes messages', 'Frustrated'),
    ('Je suis le seul a travailler ici', 'Frustrated'), ('J en ai marre de corriger les bugs des autres', 'Frustrated'),
    ('Les requirements changent tout le temps', 'Frustrated'), ('On refait toujours les memes erreurs', 'Frustrated'),
]

df = pd.DataFrame(data, columns=['text', 'label'])

model = Pipeline([
    ('tfidf', TfidfVectorizer(ngram_range=(1, 2), max_features=5000, strip_accents='unicode')),
    ('clf', LogisticRegression(max_iter=1000, C=1.0, class_weight='balanced'))
])

model.fit(df['text'], df['label'])
joblib.dump(model, 'planora_sentiment_model.pkl')
print('✅ planora_sentiment_model.pkl créé avec succès !')

tests = ['Great sprint this week!', 'Je suis bloque sur ce bug', 'Encore une reunion inutile', 'La reunion est a 14h']
for t in tests:
    print(f'  {t!r:45} → {model.predict([t])[0]}')
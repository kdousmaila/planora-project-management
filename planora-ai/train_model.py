"""
Lance ce script UNE SEULE FOIS pour créer le modèle sur ton PC.
python train_model.py
"""

import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
import joblib

data = [
    ('Super travail toute l equipe !', 'Positif'),
    ('Excellent boulot sur cette fonctionnalite', 'Positif'),
    ('Merci pour votre aide precieuse', 'Positif'),
    ('On a termine le sprint avec succes', 'Positif'),
    ('La demo s est tres bien passee', 'Positif'),
    ('Bravo a toute l equipe pour cet effort', 'Positif'),
    ('Le client est tres satisfait', 'Positif'),
    ('On avance bien sur le projet', 'Positif'),
    ('Tres bonne collaboration cette semaine', 'Positif'),
    ('J adore travailler avec cette equipe', 'Positif'),
    ('Objectif atteint felicitations', 'Positif'),
    ('La nouvelle fonctionnalite marche parfaitement', 'Positif'),
    ('Super sprint cette semaine bien joue', 'Positif'),
    ('Tout fonctionne comme prevu', 'Positif'),
    ('Bonne ambiance dans l equipe', 'Positif'),

    ('La reunion est a 14h', 'Neutre'),
    ('J ai mis a jour la tache dans le backlog', 'Neutre'),
    ('La documentation est disponible sur le drive', 'Neutre'),
    ('Le deploiement est prevu pour vendredi', 'Neutre'),
    ('Reunion de sprint demain matin', 'Neutre'),
    ('Je vais commencer la tache cet apres-midi', 'Neutre'),
    ('Le serveur a ete redemarre', 'Neutre'),
    ('J ai cree une nouvelle branche git', 'Neutre'),
    ('La version 2.0 sera livree lundi', 'Neutre'),
    ('Je travaille sur le module de connexion', 'Neutre'),
    ('Les tests unitaires sont en cours', 'Neutre'),
    ('J ai assigne la tache a Mohamed', 'Neutre'),
    ('Le rapport est pret pour la revue', 'Neutre'),
    ('On fait une pause de 10 minutes', 'Neutre'),
    ('J ai lu les nouvelles specifications', 'Neutre'),

    ('Je suis bloque depuis hier je ne sais plus quoi faire', 'Stresse'),
    ('J ai trop de taches pour cette semaine', 'Stresse'),
    ('Le delai est tres serre je vais pas y arriver', 'Stresse'),
    ('Je travaille jusqu a minuit depuis 3 jours', 'Stresse'),
    ('Je n arrive pas a resoudre ce probleme', 'Stresse'),
    ('La pression est trop forte en ce moment', 'Stresse'),
    ('J ai peur de ne pas finir a temps', 'Stresse'),
    ('Ce bug me prend trop de temps', 'Stresse'),
    ('Je suis epuise par ce sprint', 'Stresse'),
    ('Trop de reunions cette semaine impossible de coder', 'Stresse'),
    ('Je ne comprends pas les nouvelles exigences', 'Stresse'),
    ('J ai besoin d aide je suis perdu', 'Stresse'),
    ('Le projet devient ingerable', 'Stresse'),
    ('Je n ai pas dormi a cause de ce bug', 'Stresse'),
    ('Je suis deborde aidez moi', 'Stresse'),

    ('Ce bug est bloquant depuis 3 jours personne ne repond', 'Frustre'),
    ('Ca fait 2 fois qu on reporte cette tache c est ridicule', 'Frustre'),
    ('Personne ne respecte les delais dans cette equipe', 'Frustre'),
    ('On refait toujours les memes erreurs', 'Frustre'),
    ('Les requirements changent tout le temps c est impossible', 'Frustre'),
    ('Je suis le seul a travailler ici', 'Frustre'),
    ('Encore une reunion inutile', 'Frustre'),
    ('Personne ne lit mes messages', 'Frustre'),
    ('Cette architecture est un desastre', 'Frustre'),
    ('On perd du temps sur des choses inutiles', 'Frustre'),
    ('Je repete la meme chose depuis une semaine', 'Frustre'),
    ('Le client change d avis encore une fois', 'Frustre'),
    ('Ce n est pas normal de travailler dans ces conditions', 'Frustre'),
    ('Tout le monde s en fiche de la qualite du code', 'Frustre'),
    ('J en ai marre de corriger les bugs des autres', 'Frustre'),
]

df = pd.DataFrame(data, columns=['message', 'sentiment'])

model = Pipeline([
    ('tfidf', TfidfVectorizer(ngram_range=(1, 2), max_features=5000)),
    ('clf',   LogisticRegression(max_iter=1000))
])

model.fit(df['message'], df['sentiment'])

joblib.dump(model, 'planora_sentiment_model.pkl')
print('✅ Modèle entraîné et sauvegardé : planora_sentiment_model.pkl')


tests = [
    'Super boulot cette semaine !',
    'Je suis bloque sur ce bug',
    'Encore une reunion inutile',
    'La reunion est a 14h',
]
for t in tests:
    print(f'  {t!r:45} → {model.predict([t])[0]}')
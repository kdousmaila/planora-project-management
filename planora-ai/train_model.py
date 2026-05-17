from pathlib import Path

import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import FeatureUnion, Pipeline


def expand(templates, contexts):
    examples = []
    for template in templates:
        for context in contexts:
            examples.append(template.format(**context))
    return examples


POSITIVE_TEMPLATES = [
    'Great work on the {item}',
    'Nice job everyone, the {item} is moving fast',
    'We finished the {item} ahead of schedule',
    'The {item} went really well',
    'I love the progress on {item}',
    'Thanks for the fast turnaround on {item}',
    'This release is looking solid',
    'The team nailed the {item}',
    'The demo was a success',
    'We are in a really good place with {item}',
    'Excellent collaboration on the {item}',
    'The customer is happy with the result',
    'Our plan is working perfectly',
    'Good momentum on the project',
    'The build looks clean and stable',
    'Everything is on track for the delivery',
]

NEUTRAL_TEMPLATES = [
    'I updated the {item}',
    'The meeting is at {time}',
    'Deployment is scheduled for {day}',
    'I pushed the latest changes',
    'The task is in review',
    'I added a comment to the ticket',
    'The server was restarted',
    'We are waiting for feedback',
    'The backlog item is assigned',
    'I synced the branch with main',
    'The document is ready for review',
    'Status is unchanged for now',
    'I am checking the logs',
    'The next step is already planned',
    'No blockers right now',
    'The dashboard was updated',
]

STRESSED_TEMPLATES = [
    'I am stuck on {item}',
    'The deadline for {item} is too tight',
    'I need help with {item}',
    'I cannot get {item} to work',
    'I am overloaded with too many tasks',
    'The pressure is high right now',
    'I am behind on {item}',
    'I am exhausted and need a break',
    'The blocker is still open and slowing me down',
    'I am worried we will miss the deadline',
    'This sprint feels impossible to finish on time',
    'I keep hitting the same problem with {item}',
    'I am lost and need support',
    'Too many things are happening at once',
    'I am running out of time',
    'The workload is becoming overwhelming',
]

FRUSTRATED_TEMPLATES = [
    'This bug is still broken after {count} tries',
    'Nobody is responding to my messages',
    'We keep making the same mistakes',
    'I am tired of redoing {item}',
    'This is wasting time and energy',
    'The requirements keep changing again',
    'Another useless meeting',
    'I am fed up with this process',
    'The same issue keeps coming back',
    'No one reads the updates I send',
    'This release keeps failing for no good reason',
    'I am sick of fixing the same problem',
    'The team is ignoring the real blocker',
    'It feels pointless to keep trying',
    'This workflow is broken and frustrating',
    'I am annoyed by the repeated delays',
]

CONTEXTS = {
    'positive': [
        {'item': 'feature'},
        {'item': 'release'},
        {'item': 'sprint'},
        {'item': 'demo'},
        {'item': 'build'},
        {'item': 'deployment'},
        {'item': 'plan'},
    ],
    'neutral': [
        {'item': 'task', 'time': '2pm', 'day': 'Friday'},
        {'item': 'ticket', 'time': 'tomorrow morning', 'day': 'Monday'},
        {'item': 'branch', 'time': 'this afternoon', 'day': 'Wednesday'},
        {'item': 'document', 'time': '3pm', 'day': 'next week'},
        {'item': 'dashboard', 'time': '11am', 'day': 'Thursday'},
    ],
    'stressed': [
        {'item': 'this bug'},
        {'item': 'the rollout'},
        {'item': 'the backlog item'},
        {'item': 'the migration'},
        {'item': 'the support issue'},
        {'item': 'the integration'},
    ],
    'frustrated': [
        {'item': 'the same bug', 'count': '3'},
        {'item': 'the rollout', 'count': '4'},
        {'item': 'the task', 'count': '2'},
        {'item': 'the review cycle', 'count': '5'},
        {'item': 'the backlog', 'count': '6'},
    ],
}

data = []
data.extend((text, 'Positive') for text in expand(POSITIVE_TEMPLATES, CONTEXTS['positive']))
data.extend((text, 'Neutral') for text in expand(NEUTRAL_TEMPLATES, CONTEXTS['neutral']))
data.extend((text, 'Stressed') for text in expand(STRESSED_TEMPLATES, CONTEXTS['stressed']))
data.extend((text, 'Frustrated') for text in expand(FRUSTRATED_TEMPLATES, CONTEXTS['frustrated']))

model = Pipeline([
    ('features', FeatureUnion([
        ('word', TfidfVectorizer(
            analyzer='word',
            ngram_range=(1, 2),
            stop_words='english',
            strip_accents='unicode',
            sublinear_tf=True,
            min_df=1,
        )),
        ('char', TfidfVectorizer(
            analyzer='char_wb',
            ngram_range=(3, 5),
            strip_accents='unicode',
            sublinear_tf=True,
            min_df=1,
        )),
    ])),
    ('clf', LogisticRegression(
        max_iter=2500,
        class_weight='balanced',
        C=2.0,
        random_state=42,
    )),
])

texts = [text for text, _ in data]
labels = [label for _, label in data]

model.fit(texts, labels)

output_path = Path(__file__).with_name('planora_sentiment_model.pkl')
joblib.dump(model, output_path)
print(f'✅ {output_path.name} created successfully with {len(texts)} English-only samples')

tests = [
    'Great sprint this week!',
    'I am stuck on this blocker',
    'Another useless meeting',
    'The task is in review',
    'Je suis bloque sur ce bug',
]

for text in tests:
    print(f'  {text!r:45} → {model.predict([text])[0]}')
# Registre des activités de traitement — findmysmell.com

> **Кристине, по-русски, один раз.** Это реестр обработок по статье 30 GDPR
> (по-французски — *registre des traitements*). Его не подают никуда: он
> просто должен существовать и быть актуальным, чтобы предъявить CNIL, если
> спросят. Я заполнил его по коду и по живой конфигурации — всё, что здесь
> написано, проверено, а не предположено.
>
> **Что сделать тебе:** прочитать и убедиться, что три обработки описаны
> верно. Дальше — обновлять, когда что-то меняется: появится оплата,
> партнёрская программа, рассылка или новый сервис. И отдельно — когда
> зарегистрируешь компанию: ответственным за обработку станет она, а не ты
> как частное лицо, и это меняет первую строку здесь, mentions légales и
> раздел 13 политики.
>
> Дата последнего обновления стоит в заголовке каждой обработки. Держать её
> в согласии с реальностью — и есть вся работа по этому документу.

**Responsable du traitement :** Kristina Vanhove — Lille, France —
contact@findmysmell.com

*À mettre à jour dès l'immatriculation d'une structure : le responsable
devient alors la structure, avec sa forme juridique et son numéro SIRET.*

**Délégué à la protection des données (DPO) :** non désigné. La désignation
n'est pas obligatoire ici : pas d'autorité publique, pas de suivi
systématique à grande échelle, pas de données sensibles au sens de
l'article 9.

**Représentant dans l'Union (art. 27) :** sans objet, le responsable est
établi en France.

**Analyse d'impact (AIPD/DPIA) :** non requise. Pas de catégories
particulières de données, pas de surveillance à grande échelle, aucune
décision produisant des effets juridiques. Une recommandation de parfum
n'en est pas une.

---

## Traitement n° 1 — Quiz et recommandation de parfum

*Créé en septembre 2026. Dernière mise à jour : 24 septembre 2026.*

**Finalités**
- Proposer à la personne un parfum correspondant à ses réponses.
- Recherche sur les préférences olfactives, à partir de réponses agrégées.
- Comprendre à quel endroit du quiz les gens s'arrêtent.

**Base légale**
- Consentement (art. 6.1.a) pour l'usage des réponses en recherche : case à
  cocher explicite sur le dernier écran, avant le résultat. Le refus
  n'empêche pas de voir son résultat, celui-ci étant calculé dans le
  navigateur.
- Intérêt légitime (art. 6.1.f) pour les passages abandonnés et l'analyse
  agrégée : savoir où le quiz décroche. Ces enregistrements ne contiennent
  ni nom ni adresse.

**Personnes concernées :** visiteurs du site qui commencent le quiz.

**Catégories de données**
- Réponses aux questions (codes de réponse), score par archétype, résultat.
- Textes libres écrits par la personne : champ « Autre » dans neuf
  questions, et la question ouverte finale.
- Langue de la page, date et heure.
- Nombre aléatoire de navigateur (`browser_key`) et numéro du passage :
  servent uniquement à distinguer un nouveau passage d'un passage répété.
- Indicateur de consentement à la recherche, indicateur « terminé ».

**Ni nom, ni adresse e-mail, ni adresse IP, ni user-agent, ni referrer, ni
localisation.** Absence vérifiée dans le schéma de la base.

**Catégories particulières (art. 9) :** aucune.

**Destinataires**
- Interne : la responsable du traitement, via une interface d'administration
  protégée par mot de passe.
- Sous-traitant : Railway Corporation (hébergement et base de données).

**Transferts hors UE :** aucun. L'application, la base, le disque, le
compartiment de sauvegarde et les tâches planifiées sont tous à Amsterdam
(Pays-Bas). Railway est une société américaine, ce qui relève de son
contrat de sous-traitance, mais aucune exécution ni aucun stockage n'a lieu
hors de l'Union.

**Durée de conservation :** 3 ans à compter de l'enregistrement. Appliquée
automatiquement chaque nuit par `scripts/purge-retention.mts`, pas seulement
annoncée. Les textes libres sont supprimés avec le passage auquel ils
appartiennent.

**Mesures de sécurité :** HTTPS, base non exposée publiquement, accès
d'administration par mot de passe, sauvegarde quotidienne vérifiée par
relecture et conservée 30 jours dans l'Union, séparation stricte d'avec les
adresses e-mail (traitement n° 2).

---

## Traitement n° 2 — Envoi du résultat par e-mail

*Créé en septembre 2026. Dernière mise à jour : 24 septembre 2026.*

**Finalité :** envoyer à la personne son résultat de quiz, à sa demande.
Un seul message transactionnel. Aucune lettre d'information, aucune
relance.

**Base légale :** consentement explicite (art. 6.1.a), donné par une case à
cocher distincte de celle de la recherche. La date du consentement est
enregistrée, ce qui le rend démontrable.

**Personnes concernées :** visiteurs qui demandent leur résultat par e-mail.

**Catégories de données :** adresse e-mail, langue, archétype obtenu,
identifiant du parfum recommandé, indicateur et date du consentement, date
d'envoi.

**Lien avec le quiz :** aucun. Il n'existe pas de clé étrangère entre les
adresses et les réponses au quiz ; la séparation est voulue et annoncée dans
la politique de confidentialité.

**Destinataires**
- Sous-traitant : Brevo (Sendinblue SAS, Paris) pour l'acheminement.
- Sous-traitant : Railway Corporation pour le stockage.

**Transferts hors UE :** aucun. Brevo stocke dans l'Union ; la base est à
Amsterdam.

**Durée de conservation :** 12 mois, appliquée par la purge nocturne.
Suppression avant terme sur demande, à l'adresse contact@findmysmell.com ;
la demande s'exécute avec `npm run gdpr -- --email <adresse> --erase
--confirm`.

**Mesures de sécurité :** clé d'API du service d'envoi conservée uniquement
dans les variables d'environnement de l'hébergeur, jamais dans le dépôt de
code ; adresse stockée à part des réponses.

---

## Traitement n° 3 — Mesure d'audience du quiz

*Créé en septembre 2026. Dernière mise à jour : 24 septembre 2026.*

**Finalité :** savoir combien de personnes voient et répondent à chaque
écran, et à quel écran elles s'arrêtent. Mesure propre au site, pour le seul
éditeur.

**Base légale :** intérêt légitime (art. 6.1.f). Au titre de l'article 82 de
la loi Informatique et Libertés, la mesure relève de l'exemption de
consentement prévue par la CNIL pour la mesure d'audience : strictement
limitée à l'éditeur, sans recoupement avec d'autres traitements, sans
transmission à des tiers, sans suivi entre sites.

**Catégories de données :** identifiant du passage en cours (jeton de
session), identifiant de l'écran, type d'événement (vu / répondu), code de
la réponse choisie, langue, date et heure.

**Ce que la mesure ne collecte pas :** adresse IP, user-agent, referrer,
résolution d'écran, ville. Absence vérifiée dans le schéma.

**Cookies :** aucun. Aucun cookie n'est déposé sur le site, et aucun script
tiers n'est chargé. Le jeton de passage vit dans le stockage de session du
navigateur et disparaît avec l'onglet. Le nombre aléatoire de navigateur du
traitement n° 1 vit au maximum 13 mois — plafond fixé par la CNIL — et peut
être effacé à tout moment par la personne, depuis le panneau accessible en
pied de page.

**Destinataires :** la responsable du traitement. Sous-traitant : Railway
Corporation.

**Transferts hors UE :** aucun.

**Durée de conservation :** 13 mois, appliquée par la purge nocturne.

---

## Sous-traitants (art. 28)

| Sous-traitant | Rôle | Localisation des données | Contrat |
|---|---|---|---|
| Railway Corporation | hébergement de l'application et de la base | Amsterdam, Pays-Bas | DPA à signer — voir `GDPR-2026-09-24.md` |
| Brevo (Sendinblue SAS) | acheminement de l'e-mail de résultat | Union européenne | DPA intégré aux conditions d'utilisation |
| Cloudinary Ltd. | diffusion des images du site | hors EEE | DPA intégré aux conditions, clauses contractuelles types incorporées |

Cloudinary ne reçoit aucune donnée relative aux personnes : il ne sert que
les images. Le transfert hors EEE concerne donc la diffusion d'images, pas
les réponses au quiz.

---

## Droits des personnes

Exercice à contact@findmysmell.com. Ce qui est possible et ce qui ne l'est
pas est décrit sans détour dans la politique de confidentialité, section 8 :
une adresse e-mail permet de retrouver et de supprimer ce qui est enregistré
sous elle ; en l'absence d'adresse, rien ne désigne la personne et aucun
passage ne peut être isolé. Les demandes s'exécutent avec le script
`web/scripts/gdpr-request.mts`.

## Violation de données (art. 33)

En cas de violation de données à caractère personnel, notification à la CNIL
dans les 72 heures. La marche à suivre est décrite dans
`GDPR-2026-09-24.md`.

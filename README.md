# 🧼 Ultra Appliance Card for Home Assistant

Une carte élégante et animée pour vos appareils électroménagers, installable via HACS.

## Installation
1. Ajoutez ce dépôt dans HACS en tant que **Dépôt Personnalisé** (Custom Repository).
2. Recherchez "Ultra Appliance Card" et installez-la.
3. Redémarrez votre interface Lovelace.

## Utilisation
```yaml
type: custom:ultra-appliance-card
name: "Lave-Vaisselle"
icon: "mdi:dishwasher"
color: "#7CFFB2"
entity: sensor.lave_vaisselle_etat
power_entity: sensor.lave_vaisselle_power
progress_entity: sensor.lave_vaisselle_progression
door_entity: binary_sensor.lave_vaisselle_porte

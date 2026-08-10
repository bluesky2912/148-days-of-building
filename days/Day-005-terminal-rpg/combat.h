#ifndef COMBAT_H
#define COMBAT_H

#include "player.h"

typedef struct {
    char name[32];
    int  hp;
    int  attack;
    int  defense;
    int  xp_reward;
    int  gold_reward;
} Enemy;

/*
 * Step 1 scaffolding only. The real Attack/Defend/Heal/Run
 * combat loop and enemy AI get built in a later step.
 */
void start_combat(Player *p, Enemy *e);

#endif
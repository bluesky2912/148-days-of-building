#include <stdio.h>
#include <string.h>
#include "player.h"

Player create_player(const char *name) {
    Player p;

    strncpy(p.name, name, MAX_NAME_LEN - 1);
    p.name[MAX_NAME_LEN - 1] = '\0';

    p.hp      = 20;
    p.max_hp  = 20;
    p.attack  = 5;
    p.defense = 2;
    p.level   = 1;
    p.xp      = 0;
    p.gold    = 10;
    p.item_count = 0;

    return p;
}

static void print_hp_bar(int hp, int max_hp) {
    const int width = 20;
    int filled = max_hp > 0 ? (hp * width) / max_hp : 0;

    if (filled < 0) filled = 0;
    if (filled > width) filled = width;

    printf("HP:      [");
    for (int i = 0; i < width; i++) {
        putchar(i < filled ? '#' : '-');
    }
    printf("] %d/%d\n", hp, max_hp);
}

void print_player_stats(const Player *p) {
    printf("\n----- %s -----\n", p->name);
    printf("Level:   %d\n", p->level);
    print_hp_bar(p->hp, p->max_hp);
    printf("Attack:  %d\n", p->attack);
    printf("Defense: %d\n", p->defense);
    printf("XP:      %d\n", p->xp);
    printf("Gold:    %d\n", p->gold);
    printf("Items:   %d\n", p->item_count);
}
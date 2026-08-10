#ifndef PLAYER_H
#define PLAYER_H

#define MAX_NAME_LEN   32
#define MAX_INVENTORY  16

/*
 * The Player struct is the heart of the game state.
 * Every system (combat, save/load, the world) reads and
 * writes fields on a Player.
 */
typedef struct {
    char name[MAX_NAME_LEN];
    int  hp;
    int  max_hp;
    int  attack;
    int  defense;
    int  level;
    int  xp;
    int  gold;

    char inventory[MAX_INVENTORY][MAX_NAME_LEN];
    int  item_count;
} Player;

Player create_player(const char *name);
void   print_player_stats(const Player *p);

#endif
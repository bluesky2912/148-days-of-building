#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "game.h"
#include "player.h"
#include "combat.h"
#include "save.h"

/* Clearing the screen between menus (instead of scrolling forever)
 * needs a different command on Windows vs. Mac/Linux, so we pick
 * the right one at compile time. */
#ifdef _WIN32
    #define CLEAR_SCREEN() system("cls")
#else
    #define CLEAR_SCREEN() system("clear")
#endif

#define BOX_WIDTH 46  /* total width, including both border characters */

/* ---------------------------------------------------------------
 * Small reusable box-drawing helpers. Building the menu out of
 * these (instead of one big block of hand-aligned printf calls)
 * means the border and padding can never drift out of sync.
 * ------------------------------------------------------------- */

static void print_border(void) {
    putchar('+');
    for (int i = 0; i < BOX_WIDTH - 2; i++) putchar('-');
    putchar('+');
    putchar('\n');
}

static void print_centered(const char *text) {
    int len = (int)strlen(text);
    int pad = BOX_WIDTH - 2 - len;
    int left = pad > 0 ? pad / 2 : 0;
    int right = pad > 0 ? pad - left : 0;

    putchar('|');
    for (int i = 0; i < left; i++) putchar(' ');
    printf("%s", text);
    for (int i = 0; i < right; i++) putchar(' ');
    putchar('|');
    putchar('\n');
}

static void print_left(const char *text) {
    int len = (int)strlen(text);
    int pad = BOX_WIDTH - 3 - len; /* accounts for "| " and the closing "|" */
    if (pad < 0) pad = 0;

    printf("| %s", text);
    for (int i = 0; i < pad; i++) putchar(' ');
    putchar('|');
    putchar('\n');
}

static void print_banner(void) {
    printf("==================================================\n");
    printf("               T H E   L O S T   C I T Y\n");
    printf("==================================================\n");
}

static void wait_for_enter(void) {
    printf("\nPress Enter to continue...");
    getchar();
}

/* ---------------------------------------------------------------
 * Input handling
 * ------------------------------------------------------------- */

/* Reads a whole line and parses it as a number. This is more
 * robust than plain scanf("%d", ...): the entire line (including
 * any trailing junk like "3abc") is consumed in one read, so bad
 * input can never desync the input buffer or cause an infinite
 * loop. Returns -1 on invalid input or EOF. */
static int read_menu_choice(void) {
    char line[64];
    int choice;

    if (fgets(line, sizeof(line), stdin) == NULL) {
        return -1;
    }
    if (sscanf(line, "%d", &choice) != 1) {
        return -1;
    }
    return choice;
}

/* Reads a name, stripping the trailing newline fgets leaves behind.
 * Falls back to "Wanderer" if the player just presses Enter. */
static void prompt_player_name(char *out, size_t out_size) {
    printf("Before the gate, a voice asks your name.\n");
    printf("Name (Enter for 'Wanderer'): ");

    if (fgets(out, (int)out_size, stdin) == NULL) {
        snprintf(out, out_size, "Wanderer");
        return;
    }

    out[strcspn(out, "\n")] = '\0';

    if (out[0] == '\0') {
        snprintf(out, out_size, "Wanderer");
    }
}

/* ---------------------------------------------------------------
 * Screens
 * ------------------------------------------------------------- */

static void print_title_screen(void) {
    CLEAR_SCREEN();
    printf("\n");
    print_banner();
    printf("\n");
    printf("You wake up outside a ruined city.\n");
    printf("The gate looms ahead, half swallowed by vines.\n");
    printf("Something is watching you.\n");
}

static void print_main_menu(const Player *p) {
    char status[64];

    CLEAR_SCREEN();
    print_banner();
    printf("\n");

    snprintf(status, sizeof(status), "HP %d/%d   LVL %d   GOLD %d",
             p->hp, p->max_hp, p->level, p->gold);

    print_border();
    print_centered(status);
    print_border();
    print_left("[1] Enter the city");
    print_left("[2] Search the area");
    print_left("[3] Check inventory");
    print_left("[4] Character stats");
    print_left("[5] Save game");
    print_left("[6] Quit");
    print_border();
    printf("> ");
}

/* ---------------------------------------------------------------
 * Main loop
 * ------------------------------------------------------------- */

void run_game(void) {
    char name[MAX_NAME_LEN];
    Player hero;
    int choice;
    int running = 1;

    CLEAR_SCREEN();
    print_banner();
    printf("\n");
    prompt_player_name(name, sizeof(name));
    hero = create_player(name);

    print_title_screen();
    wait_for_enter();

    while (running) {
        print_main_menu(&hero);
        choice = read_menu_choice();

        switch (choice) {
            case 1:
                printf("\n[Entering the city - built in a later step]\n");
                wait_for_enter();
                break;
            case 2:
                printf("\n[Searching the area - built in a later step]\n");
                wait_for_enter();
                break;
            case 3:
                printf("\n[Inventory screen - built in a later step]\n");
                wait_for_enter();
                break;
            case 4:
                print_player_stats(&hero);
                wait_for_enter();
                break;
            case 5:
                save_game(&hero);
                wait_for_enter();
                break;
            case 6:
                printf("\nYou step back from the gate. Farewell, %s.\n\n", hero.name);
                running = 0;
                break;
            default:
                printf("\nThat's not a number on the menu.\n");
                wait_for_enter();
                break;
        }
    }
}
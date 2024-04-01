import beaker
import pyteal as pt


class TicTacToeState:
    player_x_state = beaker.GlobalStateValue(
        stack_type=pt.TealType.uint64, default=pt.Int(0)
    )

    player_o_state = beaker.GlobalStateValue(
        stack_type=pt.TealType.uint64, default=pt.Int(0)
    )

    player_o_index = beaker.GlobalStateValue(
        stack_type=pt.TealType.uint64, default=pt.Int(0)
    )

    bet_amount = beaker.GlobalStateValue(
        stack_type=pt.TealType.uint64, default=pt.Int(1000000)
    )

    game_status = beaker.GlobalStateValue(
        stack_type=pt.TealType.uint64, default=pt.Int(0)
    )


app = beaker.Application("tic_tac_toe_single_player", state=TicTacToeState)


WINING_STATES = [448, 56, 7, 292, 146, 73, 273, 84]

@app.create(bare=True)
def create() -> pt.Expr:
    return app.initialize_global_state()


@app.opt_in(bare=True)
def opt_in() -> pt.Expr:
    return pt.Approve()


@pt.Subroutine(pt.TealType.uint64)
def has_player_won(state: pt.Expr) -> pt.Expr:
    return pt.If(
        pt.Or(
            pt.BitwiseAnd(state, pt.Int(WINING_STATES[0])) == pt.Int(WINING_STATES[0]),
            pt.BitwiseAnd(state, pt.Int(WINING_STATES[1])) == pt.Int(WINING_STATES[1]),
            pt.BitwiseAnd(state, pt.Int(WINING_STATES[2])) == pt.Int(WINING_STATES[2]),
            pt.BitwiseAnd(state, pt.Int(WINING_STATES[3])) == pt.Int(WINING_STATES[3]),
            pt.BitwiseAnd(state, pt.Int(WINING_STATES[4])) == pt.Int(WINING_STATES[4]),
            pt.BitwiseAnd(state, pt.Int(WINING_STATES[5])) == pt.Int(WINING_STATES[5]),
            pt.BitwiseAnd(state, pt.Int(WINING_STATES[6])) == pt.Int(WINING_STATES[6]),
            pt.BitwiseAnd(state, pt.Int(WINING_STATES[7])) == pt.Int(WINING_STATES[7]),
        ),
        pt.Int(1),
        pt.Int(0),
    )


@pt.Subroutine(pt.TealType.uint64)
def is_tie() -> pt.Expr:
    return (
        pt.If(app.state.game_status == pt.Int(0))
        .Then(
            pt.Int(511)
            == pt.BitwiseOr(app.state.player_x_state, app.state.player_o_state)
        )
        .Else(pt.Int(0))
    )


@pt.Subroutine(pt.TealType.uint64)
def available_positions(player_x_state: pt.Expr, player_o_state: pt.Expr) -> pt.Expr:
    filled_positions = pt.BitwiseOr(player_x_state, player_o_state)
    # invertuje da dobije slobodne pozicije
    return pt.BitwiseAnd(filled_positions, pt.Int(0b111111111)) ^ pt.Int(0b111111111)


@pt.Subroutine(pt.TealType.uint64)
def select_position_for_o(available_positions: pt.Expr) -> pt.Expr:
    brojac = pt.ScratchVar(pt.TealType.uint64)
    brojac.store(pt.Int(0))

    return pt.Seq(
        [
            pt.For(
                brojac.store(pt.Int(0)),
                brojac.load() < pt.Int(9),
                brojac.store(brojac.load() + pt.Int(1)),
            ).Do(
                pt.Seq(
                    [
                        pt.If(
                            pt.GetBit(available_positions, brojac.load()) == pt.Int(1)
                        ).Then(
                            pt.Seq(
                                [
                                    app.state.player_o_index.set(brojac.load()),
                                    pt.Break(),
                                ]
                            )
                        )
                    ]
                )
            ),
            app.state.player_o_index.get(),
        ]
    )
    # no available positions


@app.external
def play_action_logic(
    position_index: pt.abi.Uint64, *, output: pt.abi.String
) -> pt.Expr:

    state_x = app.state.player_x_state.get()
    state_o = app.state.player_o_state.get()

    game_action = pt.ShiftLeft(pt.Int(1), position_index.get())

    player_o_move = pt.Seq(
        [
            app.state.player_o_state.set(
                pt.BitwiseOr(
                    app.state.player_o_state.get(),
                    pt.ShiftLeft(
                        pt.Int(1),
                        select_position_for_o(
                            available_positions(
                                app.state.player_x_state.get(),
                                app.state.player_o_state.get(),
                            )
                        ),
                    ),
                )
            ),
            pt.If(
                has_player_won(app.state.player_o_state),
                app.state.game_status.set(pt.Int(2)),
            ),
        ]
    )

    player_x_move = pt.Seq(
        [
            app.state.player_x_state.set(pt.BitwiseOr(state_x, game_action)),
            pt.If(
                has_player_won(app.state.player_x_state),
                app.state.game_status.set(pt.Int(1)),
            ),
        ]
    )

    return pt.Seq(
        [
            pt.Assert(position_index.get() >= pt.Int(0)),
            pt.Assert(position_index.get() <= pt.Int(8)),
            pt.Assert(app.state.game_status.get() == pt.Int(0)),
            pt.Assert(
                pt.And(
                    pt.BitwiseAnd(state_x, game_action) == pt.Int(0),
                    pt.BitwiseAnd(state_o, game_action) == pt.Int(0),
                )
            ),
            player_x_move,
            pt.If(is_tie())
            .Then(app.state.game_status.set(pt.Int(3)))
            .ElseIf(app.state.game_status.get() == pt.Int(0))
            .Then(player_o_move),
            pt.Cond(
                [app.state.game_status == pt.Int(0), output.set("Game in progress!")],
                [
                    app.state.game_status == pt.Int(1),
                    pt.Seq([output.set("You have succcesfully won the game!")]),
                ],
                [
                    app.state.game_status == pt.Int(2),
                    output.set("You have lost the game!"),
                ],
                [app.state.game_status == pt.Int(3), output.set("Its a tie")],
            ),
        ]
    )


@app.external
def money_refund_logic() -> pt.Expr:
    has_x_won_by_playing = app.state.game_status.get() == pt.Int(1)

    def payout(reciever: pt.Expr, amount: pt.Expr) -> pt.Exp:
        return pt.Seq(
            [
                pt.InnerTxnBuilder.Begin(),
                pt.InnerTxnBuilder.SetFields(
                    {
                        pt.TxnField.type_enum: pt.TxnType.Payment,
                        pt.TxnField.receiver: reciever,
                        pt.TxnField.amount: amount,
                    }
                ),
                pt.InnerTxnBuilder.Submit(),
            ]
        )

    return pt.Seq(
        [
            pt.Assert(has_x_won_by_playing),
            payout(pt.Txn.sender(), app.state.bet_amount.get()),
            pt.Approve(),
        ]
    )

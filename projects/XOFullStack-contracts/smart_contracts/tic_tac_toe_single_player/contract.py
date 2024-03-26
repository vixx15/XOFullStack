import beaker
import pyteal as pt


app = beaker.Application("tic_tac_toe_single_player")


@app.external
def hello(name: pt.abi.String, *, output: pt.abi.String) -> pt.Expr:
    return output.set(pt.Concat(pt.Bytes("Hello, "), name.get()))

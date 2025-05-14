import { Vec2 } from './math/vec2'
import { PointerJust } from './pointer_just'
import { pixel_perfect_position_update, pos_box, pos_xy, position, Position } from './position'
import { appr, XY, XYWH } from './util'
import { Color } from './webgl/color'
import { g } from './webgl/gl_init'

let cursor: XY

let p: PointerJust


type Ball = {
    pos: Position
}

let ball: Ball

type Fx = {
    pos: Position
}

let fxs: Fx[]

function add_hit_fx(p: Position) {
    let [x, y] = pos_xy(p)


    for (let i = 0; i < 8; i++) {
        let angle = i / 8 * Math.PI * 2

        let dx = Vec2.from_angle(angle)

        let fx = {
            pos: position(x, y, 4, 4),
        }


        fx.pos.dx = dx.x * 700
        fx.pos.dy = dx.y * 700

        fx.pos.ddx = 8000
        fx.pos.ddy = 8000

        fxs.push(fx)
    }


}

export function _init() {

    cursor = [1920/2, 1080/2]

    p = PointerJust()
    p.set_sensitivity(1.6)


    ball = {
        pos: position(0, 0, 12, 12)
    }

    ball.pos.dx = 100
    ball.pos.dy = 100


    fxs = []
}

let t_slow = 0
export function _update(delta: number) {

    if (t_slow > 0) {
        t_slow = appr(t_slow, 0, delta)
        delta *= 0.555
    }

    cursor[0] = p.cursor[0]
    cursor[1] = p.cursor[1]

    pixel_perfect_position_update(ball.pos, delta, has_collided_bounds)

    if (ball.pos.hit_x) {
        ball.pos.dx = -1 * ball.pos.hit_x * 100
        add_hit_fx(ball.pos)
        t_slow = 166
    }

    if (ball.pos.hit_y) {
        ball.pos.dy = -1 * ball.pos.hit_y * 100
        add_hit_fx(ball.pos)
        t_slow = 166
    }


    fxs.forEach(_ => update_fx(_, delta))
}

function update_fx(fx: Fx, delta: number) {

        pixel_perfect_position_update(fx.pos, delta, has_collided_none)
        damp_zero(fx.pos, delta)

        if (fx.pos.dx === 0 && fx.pos.dy === 0) {
            fxs.splice(fxs.indexOf(fx), 1)
        }
}

function damp_zero(pos: Position, delta: number) {
    pos.dx = appr(pos.dx, 0, pos.ddx * (delta / 1000))
    pos.dy = appr(pos.dy, 0, pos.ddy * (delta / 1000))
}

function has_collided_none() {
    return false
}

function has_collided_bounds(x: number, y: number, w: number, h: number) {
    if (x < 0 || x + w > 320) {
        return true
    }
    if (y < 0 || y + h > 180) {
        return true
    }
    return false
}


function ball_box(): XYWH {
    return pos_box(ball.pos)
}

function fx_box(fx: Fx): XYWH {
    return pos_box(fx.pos)
}

export function _render() {
    g.clear()

    g.begin_shapes()
    g.shape_rect(...ball_box(), Color.white)


    fxs.forEach(fx => {
        g.shape_rect(...fx_box(fx), Color.white)
    })

    g.end_shapes()
}
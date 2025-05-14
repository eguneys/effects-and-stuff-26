import { Line, Vec2 } from './math/vec2'
import { PointerJust } from './pointer_just'
import { pixel_perfect_position_update, pos_box, pos_xy, position, Position } from './position'
import { appr, XY, XYWH } from './util'
import { Color } from './webgl/color'
import { g } from './webgl/gl_init'
import a from './audio'
import { rnd_int } from './random'

class Theme {
    static Shadow = Color.hex(0x0a071e)
    static HighShadow = Color.hex(0xf9ed69) // #f9ed6900
    static HighShadowOnWhite = Color.hex(0xa217e8) //#a217e800
}

let cursor: XY

let p: PointerJust


type Ball = {
    pos: Position
    theta: number
    dtheta: number
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
            pos: position(x, y, 3, 3),
        }


        fx.pos.dx = dx.x * 700
        fx.pos.dy = dx.y * 700

        fx.pos.ddx = 8000
        fx.pos.ddy = 8000

        fxs.push(fx)
    }


}

type BoundLine = {
    pos: Position,
    rest: Position
}

type BoundLines = {
    top: BoundLine[],
    left: BoundLine[],
    bottom: BoundLine[],
    right: BoundLine[]
}

let b_lines: BoundLines

export function _init() {

    cursor = [1920/2, 1080/2]

    p = PointerJust()
    p.set_sensitivity(1.6)


    ball = {
        pos: position(160, 90, 12, 12),
        theta: 0,
        dtheta: 0
    }

    ball.pos.dx = 10
    ball.pos.dy = 100


    fxs = []


    let segments = 13
    b_lines = {
        top: [],
        bottom: [],
        left: [],
        right: []
    }

    let ddx = 1000
    let ddy = 1000
    for (let i = 0; i <= segments; i++) {
        let top = position(20 + (i / segments) * 240, 10, 1, 1)
        b_lines.top.push({ pos: top, rest: {...top} })
        top.ddx = ddx
        top.ddy = ddy

        let bottom = position(20 + (i / segments) * 240, 170, 1, 1)
        b_lines.bottom.push({ pos: bottom, rest: {...bottom} })

        bottom.ddx = ddx
        bottom.ddy = ddy

        let left = position(20, 10 + (i / segments) * 160, 1, 1)
        b_lines.left.push({ pos: left, rest: {...left} })
        left.ddx = ddx
        left.ddy = ddy

        let right = position(240 + 20, 10 + (i / segments) * 160, 1, 1)
        b_lines.right.push({ pos: right, rest: {...right} })
        right.ddx = ddx
        right.ddy = ddy
    }

}

let t_slow = 0
export function _update(delta: number) {
    if (t_slow > 0) {
        t_slow = appr(t_slow, 0, delta)
        delta *= 0.555
    }

    cursor[0] = p.cursor[0]
    cursor[1] = p.cursor[1]

    update_ball(delta)

    fxs.forEach(_ => update_fx(_, delta))

    b_lines.top.forEach(_ => update_lines(_, delta))
    b_lines.left.forEach(_ => update_lines(_, delta))
    b_lines.bottom.forEach(_ => update_lines(_, delta))
    b_lines.right.forEach(_ => update_lines(_, delta))
}

function update_ball(delta: number) {

    pixel_perfect_position_update(ball.pos, delta, has_collided_blines_and_update_lines)

    if (ball.pos.hit_x) {
        ball.pos.dx = -1 * ball.pos.hit_x * 100
        add_hit_fx(ball.pos)
        t_slow = 137
        ball.pos.w *= 0.7
        ball.pos.h *= 1.2
        ball.dtheta = Math.sign(ball.pos.dy) * 33
        a.play('thud' + rnd_int(2, 4))
    }

    if (ball.pos.hit_y) {
        ball.pos.dy = -1 * ball.pos.hit_y * 100
        add_hit_fx(ball.pos)
        t_slow = 137
        ball.pos.h *= 0.7
        ball.pos.w *= 1.2

        ball.dtheta = Math.sign(ball.pos.dx) * 27

        a.play('thud' + rnd_int(3, 5))
    }

    ball.pos.w = appr(ball.pos.w, 12, 20 * delta / 1000)
    ball.pos.h = appr(ball.pos.h, 12, 20 * delta / 1000)

    ball.theta += ball.dtheta * delta / 1000

    ball.dtheta = appr(ball.dtheta, 0, 100 * delta / 1000)

}

function force_xy(pos: Position, dx: number, dy: number) {
    pos.dx = dx
    pos.dy = dy
}

function has_collided_blines_and_update_lines(x: number, y: number, w: number, h: number) {

    let magnitude = 369

    let res_top = _has_collided_lines(b_lines.top, x, y, w, h)

    if (res_top) {
        force_xy(res_top[0].pos, -1 * magnitude, -1 * magnitude)
        force_xy(res_top[1].pos, 1 * magnitude, -1 * magnitude)
        return true
    }

    let res_bottom = _has_collided_lines(b_lines.bottom, x, y, w, h)

    if (res_bottom) {

        force_xy(res_bottom[0].pos, -1 * magnitude, 1 * magnitude)
        force_xy(res_bottom[1].pos, 1 * magnitude, 1 * magnitude)
        return true
    }

    let res_left = _has_collided_lines(b_lines.left, x, y, w, h)

    if (res_left) {

        force_xy(res_left[0].pos, -1 * magnitude, 1 * magnitude)
        force_xy(res_left[1].pos, -1 * magnitude, -1 * magnitude)
        return true
    }

    let res_right = _has_collided_lines(b_lines.right, x, y, w, h)

    if (res_right) {

        force_xy(res_right[0].pos, 1 * magnitude, 1 * magnitude)
        force_xy(res_right[1].pos, 1 * magnitude, -1 * magnitude)
        return true
    }

    return false
}

function update_lines(lines: BoundLine, delta: number) {
    let pos = pos_xy(lines.pos)
    let rest = pos_xy(lines.rest)

    let distance = Vec2.make(...pos).distance(Vec2.make(...rest))
    lines.pos.i_x = appr(lines.pos.i_x, lines.rest.i_x, 200 * distance * delta / 1000)
    lines.pos.i_y = appr(lines.pos.i_y, lines.rest.i_y, 200 * distance * delta / 1000)

    pixel_perfect_position_update(lines.pos, delta, has_collided_none)
    damp_zero(lines.pos, delta)
}

function update_fx(fx: Fx, delta: number) {

        pixel_perfect_position_update(fx.pos, delta, has_collided_none)
        damp_zero(fx.pos, delta)

        fx.pos.ddx = appr(fx.pos.ddx, 0, delta * 30)
        fx.pos.ddy = appr(fx.pos.ddy, 0, delta * 30)

        if (fx.pos.dx === 0 && fx.pos.dy === 0) {
            fxs.splice(fxs.indexOf(fx), 1)
        }

        let l = 1 + ease(Vec2.make(fx.pos.dx, fx.pos.dy).length / 700) * 3
        fx.pos.w = l
        fx.pos.h = l
}

function ease(t: number) {
    return t * t
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

function has_collided_blines(x: number, y: number, w: number, h: number) {
    return _has_collided_lines(b_lines.top, x, y, w, h) ||
    _has_collided_lines(b_lines.bottom, x, y, w, h) ||
    _has_collided_lines(b_lines.left, x, y, w, h) ||
    _has_collided_lines(b_lines.right, x, y, w, h)
}

function _has_collided_lines(lines: BoundLine[], x: number, y: number, w: number, h: number) {

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i]
        let nline = lines[i + 1]
        
        if (!nline) {
            break
        }

        let l = Line.make(...pos_xy(line.pos), ...pos_xy(nline.pos))

        if (l.intersects(Line.make(x + w / 3, y + w / 3, x + w * 2 / 3, y + h * 2 / 3))) {
            return [line, nline]
        }
    }
    return null
}


function ball_box(): XYWH {
    return pos_box(ball.pos)
}

function fx_box(fx: Fx): XYWH {
    return pos_box(fx.pos)
}

function drop_shadow(xywh: XYWH): XYWH {
    return [xywh[0] + 2, xywh[1] + 2, xywh[2], xywh[3]]
}
function high_shadow(xywh: XYWH): XYWH {
    return [xywh[0], xywh[1], xywh[2] / 2, xywh[3] / 2]
}
function high_shadow2(xywh: XYWH): XYWH {
    return [xywh[0] - 2, xywh[1] - 2, xywh[0], xywh[1]]
}




export function _render() {
    g.clear()

    g.begin_shapes()
    g.shape_rect(...drop_shadow(ball_box()), Theme.Shadow, ball.theta)
    g.shape_rect(...ball_box(), Color.white, ball.theta)
    g.shape_rect(...high_shadow(ball_box()), Theme.HighShadowOnWhite, ball.theta)


    draw_lines(b_lines.top.map(_ => _.pos))
    draw_lines(b_lines.bottom.map(_ => _.pos))
    draw_lines(b_lines.left.map(_ => _.pos))
    draw_lines(b_lines.right.map(_ => _.pos))

    fxs.forEach(fx => {
        g.shape_rect(...drop_shadow(fx_box(fx)), Theme.Shadow)
        g.shape_rect(...fx_box(fx), Color.white)
        g.shape_rect(...high_shadow(fx_box(fx)), Theme.HighShadowOnWhite)
    })


    let angle = Math.PI * 0.25

    g.shape_rect(...drop_shadow(corner_box(b_lines.top[0])), Theme.Shadow, angle)
    g.shape_rect(...drop_shadow(corner_box(b_lines.bottom[0])), Theme.Shadow, angle)
    g.shape_rect(...drop_shadow(corner_box(b_lines.right[0])), Theme.Shadow, angle)
    g.shape_rect(...drop_shadow(corner_box(b_lines.right[b_lines.right.length - 1])), Theme.Shadow, angle)

    g.shape_rect(...corner_box(b_lines.top[0]), Color.red, angle)
    g.shape_rect(...corner_box(b_lines.bottom[0]), Color.red, angle)
    g.shape_rect(...corner_box(b_lines.right[0]), Color.red, angle)
    g.shape_rect(...corner_box(b_lines.right[b_lines.right.length - 1]), Color.red, angle)

    g.shape_rect(...high_shadow(corner_box(b_lines.top[0])), Theme.HighShadow, angle)
    g.shape_rect(...high_shadow(corner_box(b_lines.bottom[0])), Theme.HighShadow, angle)
    g.shape_rect(...high_shadow(corner_box(b_lines.right[0])), Theme.HighShadow, angle)
    g.shape_rect(...high_shadow(corner_box(b_lines.right[b_lines.right.length - 1])), Theme.HighShadow, angle)

    g.end_shapes()
}

function corner_box(l: BoundLine): XYWH {
    let [x, y] = pos_xy(l.rest)

    return [x - 5.5, y - 5.5, 11, 11]
}

function draw_lines(lines: Position[]) {
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i]
        let nline = lines[i + 1]
        
        if (!nline) {
            break
        }

        g.shape_line(...drop_shadow([...pos_xy(line), ...pos_xy(nline)]), line.w * 5, Theme.Shadow)
        g.shape_line(...pos_xy(line), ...pos_xy(nline), line.w * 2, Color.red)
        g.shape_line(...high_shadow2([...pos_xy(line), ...pos_xy(nline)]), line.w * 5, Theme.HighShadow)
    }
}
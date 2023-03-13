import { fabric } from "fabric";

export const Arrow = fabric.util.createClass(fabric.Line, {
    type: "arrow",

    toObject: function(propertiesToInclude: string[]) {
        return {
            ...this.callSuper('toObject', propertiesToInclude),
            x1: this.x1,
            x2: this.x2,
            y1: this.y1,
            y2: this.y2
        };
    },

    _render: function(ctx: any) {
        this.callSuper('_render', ctx);

        if (this.width === 0 || this.height === 0 || !this.visible) return;

        ctx.save();

        var xDiff = this.x2 - this.x1;
        var yDiff = this.y2 - this.y1;
        var angle = Math.atan2(yDiff, xDiff);
        ctx.translate((this.x2 - this.x1) / 2, (this.y2 - this.y1) / 2);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(10,0);
        ctx.lineTo(-20, 15);
        ctx.lineTo(-20, -15);
        ctx.closePath();
        ctx.fillStyle = this.stroke;
        ctx.fill();

        ctx.restore();
    }
});

// @ts-ignore
fabric.Arrow = Arrow;

// @ts-ignore
fabric.Arrow.fromObject = function(object, callback) {
    function _callback(instance: any) {
        delete instance.points;
        callback && callback(instance);
    };

    fabric.Object._fromObject('Arrow', {
        ...object,
        points: [object.x1, object.y1, object.x2, object.y2]
    }, _callback, 'points');
};
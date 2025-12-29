from js import Response, json

async def on_fetch(request, env):
    """
    Cloudflare Workers Python 运行时处理函数
    """
    if request.method == "OPTIONS":
        return Response.new(None, status=204, headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        })

    try:
        body = await request.json()
        # 模拟复杂的物理计算 (例如带有旋转/风阻的网球轨迹)
        # 这里只是演示，接收起始位置和速度，返回预测点
        x = body.get("x", 50)
        y = body.get("y", 0)
        vx = body.get("vx", 0)
        vy = body.get("vy", 0)
        gravity = body.get("gravity", 0.15)
        
        # 预测 25 帧后的位置
        for _ in range(25):
            vy += gravity
            x += vx
            y += vy
            
        result = {
            "predictedX": x,
            "predictedY": y,
            "status": "success"
        }
        
        return Response.new(json.dumps(result), headers={
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        })
        
    except Exception as e:
        return Response.new(json.dumps({"error": str(e)}), status=500, headers={
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        })


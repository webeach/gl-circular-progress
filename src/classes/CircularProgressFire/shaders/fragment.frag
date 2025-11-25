#version 300 es
precision mediump float;

in vec2 v_uv;
out vec4 fragColor;

uniform float u_time;
uniform float u_progress;
uniform vec2 u_resolution;
uniform float u_innerRadius;
uniform float u_outerRadius;
uniform float u_startAngle;
uniform float u_reversed;
uniform sampler2D u_gradientTexture;
uniform float u_intensity;

#define PI 3.14159265359
#define TWO_PI 6.28318530718

// Simplex noise helper functions
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
    vec2 st = v_uv * 2.0 - 1.0;
    st.x *= u_resolution.x / u_resolution.y;

    float radius = length(st);

    // --- ANGLE CALCULATION ---
    float absAngle = atan(st.x, st.y);
    if (absAngle < 0.0) absAngle += TWO_PI;

    float relAngle = absAngle - u_startAngle;
    relAngle = mod(relAngle, TWO_PI);
    if (relAngle < 0.0) relAngle += TWO_PI;

    if (u_reversed > 0.5) {
        relAngle = TWO_PI - relAngle;
    }
    
    float angle = mod(relAngle, TWO_PI);
    float progressAngle = u_progress * TWO_PI;

    // --- FIRE NOISE ---
    // Make noise flow ALONG the ring (using angle) instead of radiating out
    float time = u_time * 2.0;
    
    // Coordinate system for noise:
    // We map polar coordinates to 3D space to ensure seamless looping at 0/360 degrees.
    // x,y: circle in 2D plane (based on angle)
    // z: time + radius variations
    
    float noiseFreq = 2.0; // Frequency of noise around the ring
    float radiusFreq = 3.0; // Frequency across the track width
    
    // Normalize radius to 0..1 within the track for better noise mapping
    float trackWidth = u_outerRadius - u_innerRadius;
    float normRadius = (radius - u_innerRadius) / trackWidth;
    
    // 3D Noise inputs
    // To make it loop perfectly:
    // We trace a circle in the noise space.
    float nx = cos(angle) * noiseFreq;
    float ny = sin(angle) * noiseFreq;
    // We add 'time' to Z to animate flow.
    // We add normRadius to Z to vary noise across width.
    // To make flow look like it moves along the ring, we rotate the angle with time.
    
    float flowAngle = angle - time * 0.5; // Flow direction
    float n_x = cos(flowAngle) * noiseFreq;
    float n_y = sin(flowAngle) * noiseFreq;
    float n_z = normRadius * radiusFreq; 
    
    // However, we don't have snoise3. Let's fake it with snoise2 by mixing or careful mapping.
    // Or we can just use snoise2 with a clever wrapping? 
    // No, snoise(vec2) is hard to wrap perfectly without artifacts unless we use 4D noise projected to 2D loop.
    // BUT, we can use the standard trick: mix two noise samples? No.
    
    // Let's implement a simple psuedo-3D noise or just use the domain wrapping trick with 2D noise:
    // Noise(x, y) where x is cos(a), y is sin(a) -> this loops!
    // But we need animation (time).
    // We can animate the domain offset? No.
    // We can animate the Z? We don't have Z.
    
    // Workaround with 2D noise for looping 1D domain + time:
    // We need 3 dimensions: Angle(loop), Radius(non-loop), Time(linear).
    // We can use 2D noise for (AngleLoop, Time).
    // AngleLoop needs 2 coords (cos, sin). So we need 3D noise.
    
    // Since we only have snoise(vec2) included, let's just use the coordinate mapping that minimizes the seam
    // OR accept that we need a better noise function.
    // Let's stick to snoise(vec2) but map it carefully.
    // Actually, let's just use the polar mapping:
    // noise(cos(a)*R + time, sin(a)*R) -> this distorts.
    
    // Better approach with what we have:
    // Let's use the polar coordinates directly but "blend" the seam at 0/2PI.
    // We sample noise at 'angle' and 'angle - 2PI' and mix them? 
    
    // Let's try a simple Polar projection into 2D plane which rotates.
    // This is seamless by definition.
    vec2 polarUV = vec2(cos(angle), sin(angle)) * (2.0 + normRadius) - vec2(time, time * 0.5);
    // This rotates the noise field. It is seamless.
    
    // Main flame shape noise
    float n = snoise(polarUV * 1.5);
    
    // Detail noise (rotate faster/different direction)
    vec2 polarUV2 = vec2(cos(angle + 1.0), sin(angle + 1.0)) * (3.0 + normRadius * 2.0) - vec2(time * 1.5, -time);
    float n2 = snoise(polarUV2 * 2.0);
    
    float fireNoise = n * 0.6 + n2 * 0.4; // Range approx -1 to 1
    
    // --- RING SHAPE & MASK ---
    // Hard clamp at inner radius, soft fade at outer
    float ringInner = smoothstep(u_innerRadius - 0.01, u_innerRadius, radius);
    
    // Border radius effect
    // We want the "head" and "tail" to be rounded.
    // Distance from the center line of the track
    float trackCenter = (u_innerRadius + u_outerRadius) * 0.5;
    float distFromCenter = abs(radius - trackCenter);
    float halfWidth = (u_outerRadius - u_innerRadius) * 0.5;
    
    // Cap radius (rounding)
    // We want full rounding when progress is small, and diminishing rounding as it approaches 100%
    // Actually, simple rounded caps are just distance checks from the end points in Cartesian space.
    // But in polar, we can approximate.
    
    // Arc length at center radius
    float arcLen = trackCenter * progressAngle;
    float capRadius = halfWidth; // Full rounding radius
    
    // Reduce rounding radius as we near completion to make it seamless
    // Start reducing at 90% progress?
    float roundingFactor = 1.0;
    if (u_progress > 0.9) {
        roundingFactor = (1.0 - u_progress) * 10.0; // 1.0 at 0.9, 0.0 at 1.0
    }
    
    float effectiveCapRadius = capRadius * roundingFactor;
    
    // To implement caps in shader without expensive cartesian distance:
    // We use the angle distance converted to arc length.
    
    float distToHeadArc = (progressAngle - angle) * trackCenter;
    float distToTailArc = angle * trackCenter;
    
    // Check if we are in the "cap zone"
    // Head Cap
    float headAlpha = 1.0;
    if (distToHeadArc < effectiveCapRadius && distToHeadArc > -effectiveCapRadius) {
        // We are near the head.
        // Distance from the "cap center" point
        // Cap center is at angle = progressAngle - (capRadius/R) ? No, cap center is at the end of the bar.
        // Actually, a round cap usually extends OUT or is cut IN.
        // Let's assume "inset" caps or just rounding the corners?
        // Standard "round" lineCap extends beyond the endpoint by radius.
        // Here, let's round the CORNERS of the cut.
        
        // Let's model a circle at the end point.
        // End point in polar: (progressAngle, trackCenter)
        // Current point: (angle, radius)
        
        // Approximate distance in 2D (valid for small angles)
        float dX = (progressAngle - angle) * trackCenter;
        float dY = radius - trackCenter;
        float distToCapCenter = sqrt(dX*dX + dY*dY);
        
        // If we are "ahead" of the cut line, we mask? No, we want to round the cut.
        // Let's mask anything beyond the line, BUT add the circle.
        
        // Simplified: 
        // 1. Mask everything beyond progressAngle (handled by headFade logic mostly)
        // 2. Except if inside the cap circle at the end.
        
        // But user wants "border-radius like", maybe just rounding the corners of the flat cut?
        // Let's assume we want a full semi-circle cap.
        
        // It's easier to mask everything > progressAngle, and add a circle at progressAngle.
        // BUT, we need to fade out this effect.
        
        // Let's use the "Alpha" we already computed (fillAlpha) which defines the cut.
        // And modify it.
    }
    
    // Simpler approach for "Border Radius" style effect on the cut:
    // We modify the opacity based on distance from the corner.
    
    // But wait, we are doing Fire. The edge is already soft.
    // User wants a "rounded" shape at the ends.
    
    // Let's use a Signed Distance Field (SDF) approach for the bar tips.
    
    // Tip 1: Head
    float dHeadX = (angle - progressAngle) * trackCenter; // Positive ahead, negative behind
    float dHeadY = abs(radius - trackCenter); // Distance from center line
    
    // SDF for a box with one rounded end? Or just a circle at the end?
    // Let's define the shape as: (Bar) U (Circle at Head) U (Circle at Tail)
    // Bar is defined by angles 0..progressAngle.
    // Circle Head at (progressAngle). Circle Tail at (0).
    
    // But we want the circle radius to shrink.
    
    float capCircleRadius = halfWidth * roundingFactor;
    
    // Check head circle
    float dX_head = (angle - progressAngle) * trackCenter;
    float dY_cap = radius - trackCenter;
    float distHeadSq = dX_head*dX_head + dY_cap*dY_cap;
    
    // Check tail circle
    float dX_tail = (angle - 0.0) * trackCenter;
    float distTailSq = dX_tail*dX_tail + dY_cap*dY_cap;
    
    // Modify visibility
    // Standard bar is angle <= progressAngle && angle >= 0
    // We want to ERODE the corners? Or EXTEND?
    // Usually border-radius on a progress bar means the ends are rounded.
    // So the effective bar is shorter, and we have caps.
    
    // Let's treat the bar as:
    // Rect from [capRadius/L] to [progress - capRadius/L]
    // + Circle at start + Circle at end.
    
    // This effectively "shrinks" the visual bar if we keep angles same.
    
    // Let's just apply a mask that rounds the corners of the existing sector.
    // Distance from the "Corner" (intersection of radial cut and outer/inner rings).
    
    // It's getting complicated for a shader without proper SDF.
    // Let's try a visual trick.
    // Smoothstep the alpha based on distance to the "end line" combined with distance to edge.
    
    // Distance to Head Line: (progressAngle - angle) * trackCenter
    // Distance to Edge (side): halfWidth - abs(radius - trackCenter)
    
    float dEnd = (progressAngle - angle) * trackCenter;
    float dStart = angle * trackCenter;
    float dSide = halfWidth - abs(radius - trackCenter);
    
    // We want the alpha to be 0 if sqrt(dEnd^2 + dSide^2) < radius (inverted corner)?
    // No, standard rounded rect logic: 
    // Alpha = smoothstep(radius, radius-1, distance_from_inner_rect)
    
    // Let's model the tip as a rounded box shape SDF in 2D local space of the tip.
    // Tip space: x = distance from end, y = distance from center.
    // We want to round the corners where x -> 0 and y -> halfWidth.
    
    // Head Rounding
    float headRounding = 1.0;
    if (dEnd < effectiveCapRadius && dSide < effectiveCapRadius) {
        // Inside the corner zone
        float cx = effectiveCapRadius - dEnd;
        float cy = effectiveCapRadius - dSide;
        float cornerDist = sqrt(cx*cx + cy*cy);
        headRounding = 1.0 - smoothstep(effectiveCapRadius - 0.005, effectiveCapRadius + 0.005, cornerDist);
    }
    
    // Tail Rounding
    float tailRounding = 1.0;
    if (dStart < effectiveCapRadius && dSide < effectiveCapRadius) {
        float cx = effectiveCapRadius - dStart;
        float cy = effectiveCapRadius - dSide;
        float cornerDist = sqrt(cx*cx + cy*cy);
        tailRounding = 1.0 - smoothstep(effectiveCapRadius - 0.005, effectiveCapRadius + 0.005, cornerDist);
    }
    
    float roundingAlpha = headRounding * tailRounding;

    // The "flame" height varies.
    // We modify the effective outer radius with noise.
    // Base outer limit is u_outerRadius.
    // Flames can lick slightly outside, but we want to contain them mostly.
    
    // To prevent clipping, we should ensure u_outerRadius passed from JS leaves room.
    // But if we want strict bounds, we fade out before the edge.
    
    float flameHeight = u_outerRadius + fireNoise * 0.04 * u_intensity;
    float ringOuter = smoothstep(flameHeight, flameHeight + 0.02, radius);
    
    float ringAlpha = ringInner - ringOuter;
    ringAlpha = clamp(ringAlpha, 0.0, 1.0);
    
    // Apply rounding
    ringAlpha *= roundingAlpha;

    // --- PROGRESS FILL LOGIC ---
    // The "head" is the leading edge of the fire.
    
    float headNoise = snoise(vec2(time * 5.0, radius * 10.0)) * 0.05 * u_intensity;
    
    // Determine if a pixel is within the active arc
    // We need to handle the "tail" (start) and "head" (end) of the progress.
    // 0 to progressAngle.
    
    float isVisible = 0.0;
    
    // Handle the wrap-around case for looping 100%
    // If progress is ~1.0, we want full circle without a seam at 0/360
    if (u_progress >= 0.995) {
        isVisible = 1.0;
    } else {
        // Basic check: angle < progressAngle?
        // But we also want the head to have noise.
        
        float effectiveAngle = angle;
        // If we are very close to 0, and progress is near 1, we might have issues, but standard angle logic works 0..2PI
        
        float diff = progressAngle - angle;
        // Add noise to the boundary
        if (diff > 0.0) {
            isVisible = 1.0;
        }
        
        // Hard cut at exactly 0 if we want? 
        // Or let the tail fade in?
        // Let's fade the tail (near angle 0).
    }

    // Soft head edge
    // Use sharper transition if we have rounding, but user asked for rounding.
    // The fade logic conflicts slightly with solid rounding.
    // Let's reduce the fade width to make the rounding visible.
    float headFade = smoothstep(0.0, 0.02, progressAngle - angle);
    
    // Soft tail edge (fade in from 0)
    // We want the start of the fire (at angle 0) to not be a hard cut line, but a soft rise.
    
    // Calculate tailFade similarly to headFade but reversed
    // angle > 0.0 essentially.
    // We want to mask out where angle < 0 (which doesn't happen in 0..2PI space directly, but close to 0 it matters)
    
    float tailFade = smoothstep(0.0, 0.02, angle);
    
    // If looping (progress ~ 1), we don't want tailFade to cut the loop at 0.
    if (u_progress >= 0.99) {
        tailFade = 1.0;
        headFade = 1.0;
    }

    // Combine transparency
    float fillAlpha = isVisible * headFade * tailFade;
    
    // Ensure 0 progress is empty
    if (u_progress < 0.001) fillAlpha = 0.0;

    // --- COLORING ---
    // Fire color palette
    // Deep Red -> Orange -> Yellow -> White (Hot)
    
    // Map noise and radius to color heat
    // Heat is higher in the center of the track and lower at edges
    float centerDist = abs(normRadius - 0.5) * 2.0; // 0 at center, 1 at edges
    float heatMap = (fireNoise * 0.5 + 0.5); // 0..1
    
    // Modulate heat by track position (hottest in middle)
    heatMap *= (1.0 - centerDist * 0.5);
    
    // Modulate by intensity
    heatMap *= (0.8 + u_intensity * 0.4);
    
    // Make the head AND tail hotter
    // Normalize angle to 0..1 relative to progress
    float relPos = angle / (progressAngle + 0.001);
    
    // Boost heat at the head (relPos near 1)
    float heatBoostHead = smoothstep(0.7, 1.0, relPos) * 0.4 * u_intensity;
    
    // Boost heat at the tail (relPos near 0)
    float heatBoostTail = smoothstep(0.3, 0.0, relPos) * 0.4 * u_intensity;
    
    // Apply boosts
    heatMap += heatBoostHead + heatBoostTail;
    
    
    // Color interpolation from gradient texture
    // Map angle (0..2PI) to UV (0..1)
    float gradientPos = angle / TWO_PI;
    vec3 baseColor = texture(u_gradientTexture, vec2(gradientPos, 0.5)).rgb;

    vec3 black = vec3(0.0);
    vec3 white = vec3(1.0);
    
    vec3 finalColor = black;
    
    // Heat map coloring strategy:
    // 0.0 - 0.3: Black -> Dark Base
    // 0.3 - 0.6: Dark Base -> Base
    // 0.6 - 0.8: Base -> Bright Base
    // 0.8 - 1.0: Bright Base -> White

    // Simplified 3-stage:
    // Low heat: Black -> Base
    // High heat: Base -> White

    if (heatMap < 0.5) {
        // Darker phase
        // Power function to keep it dark longer
        float t = heatMap / 0.5;
        finalColor = mix(black, baseColor, t * t); 
    } else {
        // Brighter phase
        float t = (heatMap - 0.5) / 0.5;
        // Mix to white
        finalColor = mix(baseColor, white, t * t);
    }
    
    // Alpha composition
    float finalAlpha = ringAlpha * fillAlpha;
    
    // Fade out the tail end of the color intensity slightly?
    // Optional: make the "start" of the bar colder and "head" hotter
    
    fragColor = vec4(finalColor, finalAlpha);
}


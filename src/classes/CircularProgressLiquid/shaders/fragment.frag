#version 300 es
precision mediump float;

in vec2 v_uv;
out vec4 fragColor;

uniform float u_flowTime;
uniform float u_progress;
uniform float u_velocity;
uniform vec2 u_resolution;
uniform sampler2D u_gradientTexture;
uniform float u_innerRadius;
uniform float u_outerRadius;

uniform float u_reversed;
uniform float u_startAngle;
uniform float u_volume; // New uniform for 3D/Lens effect

#define PI 3.14159265359
#define TWO_PI 6.28318530718

float random(in vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
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

    float centerRadius = (u_innerRadius + u_outerRadius) * 0.5;
    float trackWidth = u_outerRadius - u_innerRadius;
    float safeTrackWidth = max(trackWidth, 0.001);
    float progressAngle = u_progress * TWO_PI;

    // --- PHYSICS ---
    // Calculate physics first so activeBoundary can be used in rounded caps for the head
    float flowProfile = 1.0 - pow(abs(radius - centerRadius) / (safeTrackWidth * 0.5), 2.0);
    flowProfile = clamp(flowProfile, 0.0, 1.0);

    float pressureBulge = u_velocity * flowProfile * 1.0;
    float ripples = sin(radius * 40.0 - u_flowTime * 15.0) * 0.03 * abs(u_velocity);

    float activeBoundary = progressAngle + pressureBulge + ripples;

    // --- ROUNDED CAPS (BORDER RADIUS) ---
    // Logic adapted from Fire shader
    float halfWidth = safeTrackWidth * 0.5;
    float trackCenter = centerRadius;
    
    // Arc length at center radius
    // We want full rounding when progress is small, and diminishing rounding as it approaches 100%
    float capRadius = halfWidth; // Full rounding radius
    
    float roundingFactor = 1.0;
    if (u_progress > 0.9) {
        roundingFactor = (1.0 - u_progress) * 10.0; // 1.0 at 0.9, 0.0 at 1.0
    }
    
    float effectiveCapRadius = capRadius * roundingFactor;
    
    // Use activeBoundary for the Head to allow bulge/stretch
    float dEnd = (activeBoundary - angle) * trackCenter;
    float dStart = angle * trackCenter;
    float dSide = halfWidth - abs(radius - trackCenter);
    
    // Head Rounding
    float headRounding = 1.0;
    if (dEnd < effectiveCapRadius && dSide < effectiveCapRadius) {
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

    // --- FILL ---
    float fill = smoothstep(0.0, 0.02, activeBoundary - angle);
    if (u_progress > 0.99) fill = 1.0;
    if (u_progress < 0.02 && angle > 6.0) fill = 0.0;

    // --- COLOR ---
    float ringAlpha = smoothstep(u_innerRadius - 0.01, u_innerRadius, radius) -
                      smoothstep(u_outerRadius, u_outerRadius + 0.01, radius);

    float t = angle / TWO_PI;
    vec3 waterColor = texture(u_gradientTexture, vec2(t, 0.5)).rgb;

    float flowLines = sin(angle * 20.0 - u_flowTime * 5.0) * sin(radius * 100.0) * 0.1;
    waterColor += vec3(flowLines);

    // --- FOAM ---
    float distToHead = abs(angle - activeBoundary);
    float foamThickness = 0.02 + abs(u_velocity) * 0.15;
    float foam = smoothstep(foamThickness, 0.0, distToHead) * fill;
    float foamSuppress = 1.0 - smoothstep(0.95, 1.0, u_progress);
    foam *= foamSuppress;

    float sparkle = random(v_uv * vec2(100.0, 100.0) + u_flowTime);
    foam *= (0.8 + 0.5 * sparkle);

    vec3 finalColor = mix(waterColor, vec3(1.0), foam);

    // --- VOLUME / 3D LENS EFFECT ---
    // Calculate a "bulge" factor based on distance from center of the track
    float trackCenterDist = abs(radius - centerRadius) / (safeTrackWidth * 0.5); // 0 at center, 1 at edges
    
    // Simple lighting approximation
    // Light comes from top-left (let's say). 
    // We can compute a normal-like vector.
    // Ideally, we want the center of the track to be brighter (specular highlight) 
    // and edges to be slightly darker or refractive.
    
    // 1. Fake refraction/distortion at edges: already somewhat covered by flowProfile usage?
    // Let's just add a specular highlight for "volume".
    
    float cylinderNormalZ = sqrt(1.0 - trackCenterDist * trackCenterDist); // 1.0 at center, 0.0 at edges (semi-circle profile)
    
    // Specular highlight running along the center of the tube
    // Light direction assumption: perpendicular to screen? Or fixed directional?
    // Let's do a simple "glossy tube" look.
    float specular = pow(cylinderNormalZ, 3.0) * 0.4;
    
    // Shadowing at edges
    float edgeShadow = smoothstep(0.8, 1.0, trackCenterDist);
    
    // Apply volume effect based on u_volume intensity
    // If u_volume is 0, we just use finalColor.
    // If u_volume is 1, we apply full lighting.
    
    vec3 lightedColor = finalColor + vec3(specular); // Add highlight
    lightedColor *= (1.0 - edgeShadow * 0.5); // Darken edges
    
    finalColor = mix(finalColor, lightedColor, u_volume);

    // --- TRANSPARENT BACKGROUND ---
    float finalAlpha = ringAlpha * fill * roundingAlpha;

    fragColor = vec4(finalColor, finalAlpha);
}

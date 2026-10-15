// PS1-style avatar shader for Gai-chan (VRChat PC only — Android/iOS must use VRChat/Mobile shaders).
//
//  * vertex snapping to a low-resolution screen grid ("PS1 wobble")
//  * stepped motion: world-space vertex positions are quantised, so limbs move in small jumps
//    (fixed-point GTE look) instead of gliding
//  * affine (non perspective-correct) texture mapping
//  * per-vertex (Gouraud) lighting
//  * 15-bit colour with ordered dithering
//
// Built-in render pipeline, single-pass-stereo-instanced safe. Falls back to VRChat's toon
// shader for people who have custom shaders blocked.
Shader "GaiChan/PS1"
{
    Properties
    {
        _MainTex ("Texture (point-filtered atlas)", 2D) = "white" {}
        _Color ("Tint", Color) = (1, 1, 1, 1)

        [Header(Geometry)]
        _SnapResolution ("Vertex Snap Resolution (lines; 0 = off)", Range(0, 480)) = 200
        _StepSize ("Stepped Motion Grid (metres; 0 = off)", Range(0, 0.02)) = 0.006
        _Affine ("Affine Texture Warp", Range(0, 1)) = 0.85

        [Header(Lighting)]
        _MinLight ("Minimum Brightness", Range(0, 1)) = 0.45
        _MaxLight ("Maximum Brightness", Range(0.5, 2)) = 1.15
        _LightWrap ("Light Wrap (softer terminator)", Range(0, 1)) = 0.5

        [Header(Colour)]
        _ColorLevels ("Colour Levels per Channel (32 = 15-bit)", Range(4, 256)) = 32
        _Dither ("Dither Strength", Range(0, 1)) = 1
    }

    SubShader
    {
        Tags { "RenderType" = "Opaque" "Queue" = "Geometry" "VRCFallback" = "Toon" }

        CGINCLUDE
        #include "UnityCG.cginc"

        float _SnapResolution;
        float _StepSize;

        // Quantise world position (stepped motion), then snap the projected vertex to a coarse grid.
        float4 PS1ClipPos(float4 objPos)
        {
            float4 world = mul(unity_ObjectToWorld, objPos);
            if (_StepSize > 0)
                world.xyz = round(world.xyz / _StepSize) * _StepSize;
            float4 clip = mul(UNITY_MATRIX_VP, world);
            if (_SnapResolution > 0)
            {
                float2 grid = float2(_SnapResolution * (_ScreenParams.x / _ScreenParams.y), _SnapResolution) * 0.5;
                clip.xy = round(clip.xy / clip.w * grid) / grid * clip.w;
            }
            return clip;
        }
        ENDCG

        Pass
        {
            Name "FORWARD"
            Tags { "LightMode" = "ForwardBase" }
            Cull Back

            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile_fwdbase
            #pragma multi_compile_instancing
            #pragma multi_compile_fog
            #pragma target 3.0
            #include "Lighting.cginc"

            sampler2D _MainTex;
            float4 _MainTex_ST;
            fixed4 _Color;
            float _Affine;
            float _MinLight;
            float _MaxLight;
            float _LightWrap;
            float _ColorLevels;
            float _Dither;

            struct appdata
            {
                float4 vertex : POSITION;
                float3 normal : NORMAL;
                float2 uv : TEXCOORD0;
                UNITY_VERTEX_INPUT_INSTANCE_ID
            };

            struct v2f
            {
                float4 pos : SV_POSITION;
                float2 uv : TEXCOORD0;          // perspective-correct
                float3 uvAffine : TEXCOORD1;    // (uv * w, w): divided per-pixel → affine
                fixed3 light : TEXCOORD2;       // Gouraud lighting
                float4 screen : TEXCOORD3;
                UNITY_FOG_COORDS(4)
                UNITY_VERTEX_OUTPUT_STEREO
            };

            v2f vert(appdata v)
            {
                v2f o;
                UNITY_SETUP_INSTANCE_ID(v);
                UNITY_INITIALIZE_OUTPUT(v2f, o);
                UNITY_INITIALIZE_VERTEX_OUTPUT_STEREO(o);

                o.pos = PS1ClipPos(v.vertex);
                float2 uv = TRANSFORM_TEX(v.uv, _MainTex);
                o.uv = uv;
                o.uvAffine = float3(uv * o.pos.w, o.pos.w);

                // per-vertex lighting: ambient/light probes + main directional light + 4 point lights
                float3 worldPos = mul(unity_ObjectToWorld, v.vertex).xyz;
                float3 n = UnityObjectToWorldNormal(v.normal);
                float3 ambient = ShadeSH9(float4(n, 1));
                float3 l = normalize(UnityWorldSpaceLightDir(worldPos));
                float ndl = saturate((dot(n, l) + _LightWrap) / (1 + _LightWrap));
                float3 direct = _LightColor0.rgb * ndl;
                #ifdef VERTEXLIGHT_ON
                direct += Shade4PointLights(unity_4LightPosX0, unity_4LightPosY0, unity_4LightPosZ0,
                                            unity_LightColor[0].rgb, unity_LightColor[1].rgb,
                                            unity_LightColor[2].rgb, unity_LightColor[3].rgb,
                                            unity_4LightAtten0, worldPos, n);
                #endif
                float3 light = ambient + direct;
                // keep her readable in dark worlds and stop bright worlds blowing her out
                float lum = max(max(light.r, light.g), light.b);
                light *= clamp(lum, _MinLight, _MaxLight) / max(lum, 1e-4);
                o.light = light;

                o.screen = ComputeScreenPos(o.pos);
                UNITY_TRANSFER_FOG(o, o.pos);
                return o;
            }

            static const float bayer[16] = {
                 0.0,  8.0,  2.0, 10.0,
                12.0,  4.0, 14.0,  6.0,
                 3.0, 11.0,  1.0,  9.0,
                15.0,  7.0, 13.0,  5.0 };

            fixed4 frag(v2f i) : SV_Target
            {
                UNITY_SETUP_STEREO_EYE_INDEX_POST_VERTEX(i);
                float2 affine = i.uvAffine.xy / i.uvAffine.z;
                float2 uv = lerp(i.uv, affine, _Affine);
                fixed4 col = tex2D(_MainTex, uv) * _Color;
                col.rgb *= i.light;

                // 15-bit colour + 4x4 ordered dither (in screen pixels). The PS1 quantised gamma-
                // encoded colour, so do it in gamma space or dark colours band badly in linear projects.
                float2 px = floor(i.screen.xy / max(i.screen.w, 1e-5) * _ScreenParams.xy);
                int idx = (int)fmod(px.x, 4) + (int)fmod(px.y, 4) * 4;
                float d = (bayer[idx] / 16.0 - 0.5) * _Dither;
                float levels = max(_ColorLevels - 1, 1);
                float3 g = saturate(col.rgb);
                #ifndef UNITY_COLORSPACE_GAMMA
                g = LinearToGammaSpace(g);
                #endif
                g = saturate(floor(g * levels + 0.5 + d) / levels);
                #ifndef UNITY_COLORSPACE_GAMMA
                g = GammaToLinearSpace(g);
                #endif
                col.rgb = g;

                UNITY_APPLY_FOG(i.fogCoord, col);
                col.a = 1;
                return col;
            }
            ENDCG
        }

        Pass
        {
            Name "SHADOWCASTER"
            Tags { "LightMode" = "ShadowCaster" }
            ZWrite On ZTest LEqual

            CGPROGRAM
            #pragma vertex vertShadow
            #pragma fragment fragShadow
            #pragma multi_compile_shadowcaster
            #pragma multi_compile_instancing
            #pragma target 3.0

            struct appdata
            {
                float4 vertex : POSITION;
                float3 normal : NORMAL;
                UNITY_VERTEX_INPUT_INSTANCE_ID
            };

            struct v2f
            {
                V2F_SHADOW_CASTER;
                UNITY_VERTEX_OUTPUT_STEREO
            };

            v2f vertShadow(appdata v)
            {
                v2f o;
                UNITY_SETUP_INSTANCE_ID(v);
                UNITY_INITIALIZE_OUTPUT(v2f, o);
                UNITY_INITIALIZE_VERTEX_OUTPUT_STEREO(o);
                TRANSFER_SHADOW_CASTER_NORMALOFFSET(o)
                return o;
            }

            float4 fragShadow(v2f i) : SV_Target
            {
                SHADOW_CASTER_FRAGMENT(i)
            }
            ENDCG
        }
    }

    FallBack "VRChat/Mobile/Toon Lit"
}

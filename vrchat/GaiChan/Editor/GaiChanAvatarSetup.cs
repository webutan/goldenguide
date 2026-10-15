// Gai-chan VRChat avatar setup (Unity 2022.3 + VRChat Avatars SDK 3.x)
//
//   Tools ▸ Gai-chan ▸ Set Up Avatar
//
// Configures the imported files, builds the FX animator / expression menu / parameters and
// places a ready-to-upload avatar in the open scene. Re-running it is safe: generated
// assets are overwritten and an existing "GaiChan" avatar in the scene is reused.
//
// Materials: PC uses the custom "GaiChan/PS1" shader; Android and iOS only allow
// VRChat/Mobile shaders, so the avatar is switched to "VRChat/Mobile/Toon Lit" automatically
// whenever the build target changes (and again right before an SDK build, as a safety net).
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Animations;
using UnityEditor.Build;
using UnityEngine;
using VRC.SDK3.Avatars.Components;
using VRC.SDK3.Avatars.ScriptableObjects;
using VRC.SDKBase;
using VRC.SDKBase.Editor.BuildPipeline;

namespace GaiChan.EditorTools
{
    [Serializable]
    public class GaiChanExpression
    {
        public string name;
        public string[] shapes;
    }

    [Serializable]
    public class GaiChanAvatarData
    {
        public float[] viewPosition;
        public string[] visemes;
        public string blink;
        public GaiChanExpression[] expressions;
        public string[] props;
        public string[] faceShapes;
        public string[] humanBones;
        public int triangles;
        public float height;
    }

    public static class GaiChanAvatarSetup
    {
        const string AvatarName = "GaiChan";
        const string BodyName = "Body";            // the avatar's SkinnedMeshRenderer
        static string BodyPath = "Body";           // its path under the avatar root (read from the model)
        const string FaceParam = "GaiChan/Face";
        const string PropParam = "GaiChan/Prop";
        const float StepFps = 12f;                // PS1-style stepped keys for the generated clips

        // ── Paths ────────────────────────────────────────────────────────────
        static string Root
        {
            get
            {
                var guid = AssetDatabase.FindAssets("gaichan_avatar t:TextAsset").FirstOrDefault();
                if (guid == null) throw new Exception("gaichan_avatar.json not found — copy the whole GaiChan folder into Assets/.");
                return Path.GetDirectoryName(AssetDatabase.GUIDToAssetPath(guid)).Replace('\\', '/');
            }
        }

        static string Gen => Root + "/Generated";
        static string FbxPath => Root + "/GaiChan.fbx";
        static string AtlasPath => Root + "/Textures/GaiChan_Atlas.png";
        static string PcMatPath => Gen + "/GaiChan_PC_PS1.mat";
        static string MobileMatPath => Gen + "/GaiChan_Mobile.mat";

        static GaiChanAvatarData LoadData()
        {
            var json = AssetDatabase.LoadAssetAtPath<TextAsset>(Root + "/gaichan_avatar.json");
            return JsonUtility.FromJson<GaiChanAvatarData>(json.text);
        }

        // ── Entry point ──────────────────────────────────────────────────────
        [MenuItem("Tools/Gai-chan/Set Up Avatar", false, 0)]
        public static void SetUp()
        {
            var data = LoadData();
            if (!AssetDatabase.IsValidFolder(Gen)) AssetDatabase.CreateFolder(Root, "Generated");

            ConfigureTexture(AtlasPath, 512);
            foreach (var guid in AssetDatabase.FindAssets("t:Texture2D", new[] { Root + "/Icons" }))
                ConfigureTexture(AssetDatabase.GUIDToAssetPath(guid), 256);
            ConfigureModel(data);
            var modelRoot = AssetDatabase.LoadAssetAtPath<GameObject>(FbxPath);
            var bodySmr = modelRoot.GetComponentsInChildren<SkinnedMeshRenderer>(true).FirstOrDefault(r => r.name == BodyName)
                          ?? modelRoot.GetComponentsInChildren<SkinnedMeshRenderer>(true).First();
            BodyPath = AnimationUtility.CalculateTransformPath(bodySmr.transform, modelRoot.transform);

            var atlas = AssetDatabase.LoadAssetAtPath<Texture2D>(AtlasPath);
            var pcMat = MakeMaterial(PcMatPath, "GaiChan/PS1", atlas);
            var mobileMat = MakeMaterial(MobileMatPath, "VRChat/Mobile/Toon Lit", atlas);

            var fx = BuildFx(data);
            var (parameters, menu) = BuildMenu(data);

            var avatar = PlaceAvatar(data, fx, parameters, menu);
            ApplyPlatformMaterial(avatar);

            AssetDatabase.SaveAssets();
            Selection.activeGameObject = avatar;
            EditorGUIUtility.PingObject(avatar);
            Debug.Log($"[Gai-chan] Avatar ready ({data.triangles} triangles). " +
                      $"Material: {(IsMobileTarget(EditorUserBuildSettings.activeBuildTarget) ? "mobile Toon Lit" : "PC PS1")}. " +
                      "Open VRChat SDK ▸ Show Control Panel ▸ Builder to upload.");
            _ = pcMat; _ = mobileMat;
        }

        [MenuItem("Tools/Gai-chan/Use Material For Current Platform", false, 20)]
        public static void ApplyPlatformMaterialMenu()
        {
            foreach (var a in FindAvatars()) ApplyPlatformMaterial(a);
        }

        // ── Import settings ──────────────────────────────────────────────────
        static void ConfigureTexture(string path, int maxSize)
        {
            var ti = (TextureImporter)AssetImporter.GetAtPath(path);
            ti.textureType = TextureImporterType.Default;
            ti.sRGBTexture = true;
            ti.alphaSource = TextureImporterAlphaSource.FromInput;
            ti.mipmapEnabled = false;                  // crisp, PS1-style texels at any distance
            ti.filterMode = FilterMode.Point;
            ti.wrapMode = TextureWrapMode.Clamp;
            ti.maxTextureSize = maxSize;
            ti.textureCompression = TextureImporterCompression.Uncompressed;
            foreach (var platform in new[] { "Standalone", "Android", "iPhone" })
            {
                var s = ti.GetPlatformTextureSettings(platform);
                s.overridden = true;
                s.maxTextureSize = maxSize;
                s.format = TextureImporterFormat.RGBA32;  // compression would smear the pixel art
                ti.SetPlatformTextureSettings(s);
            }
            ti.SaveAndReimport();
        }

        static void ConfigureModel(GaiChanAvatarData data)
        {
            var mi = (ModelImporter)AssetImporter.GetAtPath(FbxPath);
            mi.globalScale = 1f;
            mi.useFileScale = true;
            mi.importBlendShapes = true;
            mi.importNormals = ModelImporterNormals.Import;
            mi.importBlendShapeNormals = ModelImporterNormals.None;
            mi.isReadable = true;
            mi.materialImportMode = ModelImporterMaterialImportMode.None;
            mi.importAnimation = false;
            mi.animationType = ModelImporterAnimationType.Human;
            mi.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel;
            mi.SaveAndReimport();

            // Explicit humanoid mapping: our bone names are Unity's human bone names
            // ("LeftUpperArm" → "Left UpperArm" in HumanTrait.BoneName).
            var hd = mi.humanDescription;
            var human = new List<HumanBone>();
            foreach (var bone in data.humanBones)
            {
                var traitName = HumanTrait.BoneName.FirstOrDefault(n => n.Replace(" ", "") == bone);
                if (traitName == null) { Debug.LogWarning("[Gai-chan] No humanoid slot for " + bone); continue; }
                var hb = new HumanBone { boneName = bone, humanName = traitName };
                hb.limit.useDefaultValues = true;
                human.Add(hb);
            }
            hd.human = human.ToArray();
            mi.humanDescription = hd;
            mi.SaveAndReimport();

            var avatar = AssetDatabase.LoadAllAssetsAtPath(FbxPath).OfType<Avatar>().FirstOrDefault();
            if (avatar == null || !avatar.isHuman)
                Debug.LogError("[Gai-chan] Humanoid avatar failed to configure — open GaiChan.fbx ▸ Rig ▸ Configure… to check the mapping.");
        }

        static Material MakeMaterial(string path, string shaderName, Texture2D tex)
        {
            var shader = Shader.Find(shaderName);
            if (shader == null) throw new Exception($"Shader '{shaderName}' not found. Is the VRChat SDK installed and the GaiChan/Shaders folder imported?");
            var mat = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (mat == null)
            {
                mat = new Material(shader);
                AssetDatabase.CreateAsset(mat, path);
            }
            mat.shader = shader;
            mat.mainTexture = tex;
            if (mat.HasProperty("_MainTex")) mat.SetTexture("_MainTex", tex);
            if (mat.HasProperty("_Color")) mat.SetColor("_Color", Color.white);
            EditorUtility.SetDirty(mat);
            return mat;
        }

        // ── Animation ────────────────────────────────────────────────────────
        static string ShapeProp(string shape) => "blendShape." + shape;

        static void SetConstantCurve(AnimationClip clip, string shape, float value)
        {
            var curve = new AnimationCurve(new Keyframe(0f, value), new Keyframe(1f / 60f, value));
            AnimationUtility.SetEditorCurve(clip, EditorCurveBinding.FloatCurve(BodyPath, typeof(SkinnedMeshRenderer), ShapeProp(shape)), curve);
        }

        static AnimationClip SaveClip(AnimationClip clip, string name)
        {
            var path = $"{Gen}/{name}.anim";
            AssetDatabase.DeleteAsset(path);
            AssetDatabase.CreateAsset(clip, path);
            return clip;
        }

        /// One clip per state that writes every shape of its group (Write Defaults off).
        static AnimationClip StateClip(string name, IEnumerable<string> allShapes, ICollection<string> on)
        {
            var clip = new AnimationClip { name = name, frameRate = StepFps };
            foreach (var s in allShapes) SetConstantCurve(clip, s, on.Contains(s) ? 100f : 0f);
            return SaveClip(clip, name);
        }

        static AnimationClip BlinkClip(string shape)
        {
            // Irregular blinks (incl. a double blink) on stepped keys — reads as PS1 sprite-swap blinking.
            var clip = new AnimationClip { name = "GaiChan_Blink", frameRate = StepFps };
            float[] closes = { 2.4f, 5.1f, 5.45f, 8.6f };
            const float hold = 0.1f, length = 10f;
            var keys = new List<Keyframe> { new Keyframe(0f, 0f) };
            foreach (var t in closes)
            {
                keys.Add(new Keyframe(t, 100f));
                keys.Add(new Keyframe(t + hold, 0f));
            }
            keys.Add(new Keyframe(length, 0f));
            var curve = new AnimationCurve(keys.ToArray());
            for (int i = 0; i < curve.length; i++)
            {
                AnimationUtility.SetKeyLeftTangentMode(curve, i, AnimationUtility.TangentMode.Constant);
                AnimationUtility.SetKeyRightTangentMode(curve, i, AnimationUtility.TangentMode.Constant);
            }
            AnimationUtility.SetEditorCurve(clip, EditorCurveBinding.FloatCurve(BodyPath, typeof(SkinnedMeshRenderer), ShapeProp(shape)), curve);
            var settings = AnimationUtility.GetAnimationClipSettings(clip);
            settings.loopTime = true;
            AnimationUtility.SetAnimationClipSettings(clip, settings);
            return SaveClip(clip, clip.name);
        }

        static void AddIntSwitchLayer(AnimatorController ctrl, string layerName, string param,
                                      IList<(string name, AnimationClip clip)> states)
        {
            var sm = new AnimatorStateMachine { name = layerName, hideFlags = HideFlags.HideInHierarchy };
            AssetDatabase.AddObjectToAsset(sm, ctrl);
            ctrl.AddLayer(new AnimatorControllerLayer { name = layerName, defaultWeight = 1f, stateMachine = sm });

            for (int i = 0; i < states.Count; i++)
            {
                var st = sm.AddState(states[i].name, new Vector3(300, 60 * i, 0));
                st.motion = states[i].clip;
                st.writeDefaultValues = false;
                if (i == 0) sm.defaultState = st;
                var tr = sm.AddAnyStateTransition(st);
                tr.hasExitTime = false;
                tr.duration = 0f;                       // instant swaps, no blending
                tr.canTransitionToSelf = false;
                tr.AddCondition(AnimatorConditionMode.Equals, i, param);
            }
        }

        static AnimatorController BuildFx(GaiChanAvatarData data)
        {
            var path = Gen + "/GaiChan_FX.controller";
            AssetDatabase.DeleteAsset(path);
            var ctrl = AnimatorController.CreateAnimatorControllerAtPath(path);
            ctrl.AddParameter(FaceParam, AnimatorControllerParameterType.Int);
            ctrl.AddParameter(PropParam, AnimatorControllerParameterType.Int);

            // Layer 0: blinking
            var baseLayer = ctrl.layers[0];
            baseLayer.name = "Blink";
            var blink = baseLayer.stateMachine.AddState("Blink");
            blink.motion = BlinkClip(data.blink);
            blink.writeDefaultValues = false;
            baseLayer.stateMachine.defaultState = blink;
            ctrl.layers = new[] { baseLayer };

            // Expressions (0 = neutral)
            var faceShapes = data.faceShapes;
            var faces = new List<(string, AnimationClip)> { ("Neutral", StateClip("GaiChan_Face_Neutral", faceShapes, new string[0])) };
            foreach (var e in data.expressions)
                faces.Add((e.name, StateClip("GaiChan_Face_" + e.name, faceShapes, e.shapes)));
            AddIntSwitchLayer(ctrl, "Face", FaceParam, faces);

            // Props (0 = empty hand)
            var propShapes = data.props.Select(p => "Prop_" + p).ToArray();
            var props = new List<(string, AnimationClip)> { ("None", StateClip("GaiChan_Prop_None", propShapes, new string[0])) };
            foreach (var p in data.props)
                props.Add((p, StateClip("GaiChan_Prop_" + p, propShapes, new[] { "Prop_" + p })));
            AddIntSwitchLayer(ctrl, "Props", PropParam, props);

            EditorUtility.SetDirty(ctrl);
            return ctrl;
        }

        // ── Menu + parameters ────────────────────────────────────────────────
        static Texture2D Icon(string name) => AssetDatabase.LoadAssetAtPath<Texture2D>($"{Root}/Icons/{name}.png");

        static (VRCExpressionParameters, VRCExpressionsMenu) BuildMenu(GaiChanAvatarData data)
        {
            var parameters = ScriptableObject.CreateInstance<VRCExpressionParameters>();
            parameters.parameters = new[]
            {
                new VRCExpressionParameters.Parameter { name = FaceParam, valueType = VRCExpressionParameters.ValueType.Int, saved = true, defaultValue = 0, networkSynced = true },
                new VRCExpressionParameters.Parameter { name = PropParam, valueType = VRCExpressionParameters.ValueType.Int, saved = true, defaultValue = 0, networkSynced = true },
            };
            Replace(parameters, Gen + "/GaiChan_Parameters.asset");

            VRCExpressionsMenu ToggleMenu(string assetName, string param, IList<(string label, Texture2D icon)> items)
            {
                var m = ScriptableObject.CreateInstance<VRCExpressionsMenu>();
                m.controls = new List<VRCExpressionsMenu.Control>();
                for (int i = 0; i < items.Count && i < VRCExpressionsMenu.MAX_CONTROLS; i++)
                {
                    m.controls.Add(new VRCExpressionsMenu.Control
                    {
                        name = items[i].label,
                        icon = items[i].icon,
                        type = VRCExpressionsMenu.Control.ControlType.Toggle,
                        parameter = new VRCExpressionsMenu.Control.Parameter { name = param },
                        value = i + 1,                   // 0 = off (neutral face / empty hand)
                    });
                }
                Replace(m, $"{Gen}/{assetName}.asset");
                return m;
            }

            var faceMenu = ToggleMenu("GaiChan_Menu_Expressions", FaceParam,
                data.expressions.Select(e => (e.name, Icon("Face_" + e.name))).ToList());
            var propMenu = ToggleMenu("GaiChan_Menu_Props", PropParam,
                data.props.Select(p => (p, Icon("Prop_" + p))).ToList());

            var main = ScriptableObject.CreateInstance<VRCExpressionsMenu>();
            main.controls = new List<VRCExpressionsMenu.Control>
            {
                new VRCExpressionsMenu.Control { name = "Expressions", icon = Icon("Face_Happy"), type = VRCExpressionsMenu.Control.ControlType.SubMenu, subMenu = faceMenu },
                new VRCExpressionsMenu.Control { name = "Props", icon = Icon("Prop_Can"), type = VRCExpressionsMenu.Control.ControlType.SubMenu, subMenu = propMenu },
            };
            Replace(main, Gen + "/GaiChan_Menu.asset");
            return (parameters, main);
        }

        static void Replace(UnityEngine.Object asset, string path)
        {
            AssetDatabase.DeleteAsset(path);
            AssetDatabase.CreateAsset(asset, path);
        }

        // ── Scene avatar ─────────────────────────────────────────────────────
        static IEnumerable<GameObject> FindAvatars() =>
            UnityEngine.Object.FindObjectsOfType<VRCAvatarDescriptor>(true)
                .Select(d => d.gameObject)
                .Where(g => g.name.StartsWith(AvatarName) && g.GetComponentInChildren<SkinnedMeshRenderer>(true) != null);

        static GameObject PlaceAvatar(GaiChanAvatarData data, AnimatorController fx,
                                      VRCExpressionParameters parameters, VRCExpressionsMenu menu)
        {
            var go = FindAvatars().FirstOrDefault();
            if (go == null)
            {
                var model = AssetDatabase.LoadAssetAtPath<GameObject>(FbxPath);
                go = (GameObject)PrefabUtility.InstantiatePrefab(model);
                go.name = AvatarName;
                Undo.RegisterCreatedObjectUndo(go, "Create Gai-chan");
            }

            var desc = go.GetComponent<VRCAvatarDescriptor>() ?? go.AddComponent<VRCAvatarDescriptor>();
            var body = go.transform.Find(BodyPath)?.GetComponent<SkinnedMeshRenderer>()
                       ?? go.GetComponentInChildren<SkinnedMeshRenderer>(true);
            var v = data.viewPosition;
            desc.ViewPosition = new Vector3(v[0], v[1], v[2]);

            desc.lipSync = VRC_AvatarDescriptor.LipSyncStyle.VisemeBlendShape;
            desc.VisemeSkinnedMesh = body;
            desc.VisemeBlendShapes = data.visemes;

            desc.enableEyeLook = false;              // no eye bones; blinking is in the FX layer

            desc.customizeAnimationLayers = true;
            desc.baseAnimationLayers = new[]
            {
                DefaultLayer(VRCAvatarDescriptor.AnimLayerType.Base),
                DefaultLayer(VRCAvatarDescriptor.AnimLayerType.Additive),
                DefaultLayer(VRCAvatarDescriptor.AnimLayerType.Gesture),
                DefaultLayer(VRCAvatarDescriptor.AnimLayerType.Action),
                new VRCAvatarDescriptor.CustomAnimLayer
                {
                    type = VRCAvatarDescriptor.AnimLayerType.FX, isEnabled = true, isDefault = false, animatorController = fx,
                },
            };
            desc.specialAnimationLayers = new[]
            {
                DefaultLayer(VRCAvatarDescriptor.AnimLayerType.Sitting),
                DefaultLayer(VRCAvatarDescriptor.AnimLayerType.TPose),
                DefaultLayer(VRCAvatarDescriptor.AnimLayerType.IKPose),
            };

            desc.customExpressions = true;
            desc.expressionParameters = parameters;
            desc.expressionsMenu = menu;

            EditorUtility.SetDirty(desc);
            return go;
        }

        static VRCAvatarDescriptor.CustomAnimLayer DefaultLayer(VRCAvatarDescriptor.AnimLayerType t) =>
            new VRCAvatarDescriptor.CustomAnimLayer { type = t, isEnabled = true, isDefault = true };

        // ── Per-platform material ────────────────────────────────────────────
        internal static bool IsMobileTarget(BuildTarget t) => t == BuildTarget.Android || t == BuildTarget.iOS;

        internal static void ApplyPlatformMaterial(GameObject avatar)
        {
            var path = IsMobileTarget(EditorUserBuildSettings.activeBuildTarget) ? MobileMatPath : PcMatPath;
            var mat = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (mat == null) return;
            foreach (var r in avatar.GetComponentsInChildren<Renderer>(true))
            {
                var mats = r.sharedMaterials;
                for (int i = 0; i < mats.Length; i++) mats[i] = mat;
                if (mats.Length == 0) mats = new[] { mat };
                r.sharedMaterials = mats;
                EditorUtility.SetDirty(r);
            }
        }

        internal static void ApplyToAllAvatars()
        {
            try { foreach (var a in FindAvatars()) ApplyPlatformMaterial(a); }
            catch (Exception) { /* folder not imported yet */ }
        }
    }

    /// Swap PC ↔ mobile material when the build target changes (VRChat SDK platform switcher).
    class GaiChanBuildTargetSwitch : IActiveBuildTargetChanged
    {
        public int callbackOrder => 0;
        public void OnActiveBuildTargetChanged(BuildTarget previous, BuildTarget current) =>
            GaiChanAvatarSetup.ApplyToAllAvatars();
    }

    /// Safety net: make sure the uploaded copy uses the right material for the target platform.
    class GaiChanPreprocess : IVRCSDKPreprocessAvatarCallback
    {
        public int callbackOrder => -100;
        public bool OnPreprocessAvatar(GameObject avatarGameObject)
        {
            if (avatarGameObject.name.StartsWith("GaiChan") && avatarGameObject.GetComponentInChildren<SkinnedMeshRenderer>(true) != null)
                GaiChanAvatarSetup.ApplyPlatformMaterial(avatarGameObject);
            return true;
        }
    }
}

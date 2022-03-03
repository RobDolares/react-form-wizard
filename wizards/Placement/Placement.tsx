import { SelectOption } from '@patternfly/react-core'
import get from 'get-value'
import { Fragment, useMemo } from 'react'
import { ArrayInput, EditMode, Hidden, KeyValue, NumberInput } from '../../src'
import { useEditMode } from '../../src/contexts/EditModeContext'
import { useItem } from '../../src/contexts/ItemContext'
import { Multiselect } from '../../src/inputs/Multiselect'
import { IResource } from '../common/resource'
import { IClusterSetBinding } from '../common/resources/IClusterSetBinding'
import { PlacementKind, PlacementType, Predicate } from '../common/resources/IPlacement'
import { useLabelValuesMap } from '../common/useLabelValuesMap'
import { MatchExpression, MatchExpressionCollapsed, MatchExpressionSummary } from './MatchExpression'

export function Placements(props: { clusterSetBindings: IClusterSetBinding[]; bindingKind: string; clusters: IResource[] }) {
    const editMode = useEditMode()
    const resources = useItem() as IResource[]
    const namespaceClusterSetNames = useMemo(() => {
        if (!resources.find) return []
        const source = resources?.find((resource) => resource.kind === props.bindingKind)
        if (!source) return []
        const namespace = source.metadata?.namespace
        if (!namespace) return []
        return (
            props.clusterSetBindings
                ?.filter((clusterSetBinding) => clusterSetBinding.metadata?.namespace === namespace)
                .map((clusterSetBinding) => clusterSetBinding.spec.clusterSet) ?? []
        )
    }, [props.bindingKind, props.clusterSetBindings, resources])

    return (
        <ArrayInput
            id="placements"
            label="Placements"
            helperText="A placement selects clusters from the cluster sets which have bindings to the resource namespace."
            path={null}
            isSection
            filter={(resource) => resource.kind === PlacementKind}
            placeholder="Add placement"
            collapsedContent="metadata.name"
            collapsedPlaceholder="Expand to enter placement"
            newValue={{ ...PlacementType, metadata: { name: '', namespace: '' }, spec: {} }}
            defaultCollapsed={editMode === EditMode.Edit}
        >
            <Placement namespaceClusterSetNames={namespaceClusterSetNames} clusters={props.clusters} />
        </ArrayInput>
    )
}

export function Placement(props: { namespaceClusterSetNames: string[]; clusters: IResource[] }) {
    const editMode = useEditMode()
    return (
        <Fragment>
            {/* <TextInput label="Placement name" path="metadata.name" required labelHelp="Name needs to be unique to the namespace." /> */}
            <Multiselect
                label="Cluster sets"
                path="spec.clusterSets"
                placeholder="Select the cluster sets"
                labelHelp="Select clusters from the cluster sets bound to the namespace. Cluster can then be further selected using cluster labels."
                helperText="If no cluster sets are selected, all clusters will be selected from the cluster sets bound to the namespace."
            >
                {props.namespaceClusterSetNames.map((name) => (
                    <SelectOption key={name} value={name} />
                ))}
            </Multiselect>

            <Hidden
                hidden={(placement) => {
                    if (editMode === EditMode.Edit) return true
                    if (!placement.spec?.predicates) return false
                    if (placement.spec.predicates.length <= 1) return false
                    return true
                }}
            >
                <PlacementPredicate rootPath="spec.predicates.0." clusters={props.clusters} />
            </Hidden>

            <ArrayInput
                label="Cluster selectors"
                path="spec.predicates"
                placeholder="Add cluster selector"
                collapsedContent={<PredicateSummary />}
                helperText="
            A cluster selector further selects clusters from the clusters in the cluster sets which have bindings to the namespace.
            Clusters matching any cluster selector will be selected.
            Clusters must match all cluster selector criteria to be selected by that cluster selector.
            "
                defaultCollapsed
                hidden={(placement) => {
                    if (editMode === EditMode.Edit) return false
                    if (!placement.spec?.predicates) return true
                    if (placement.spec.predicates.length <= 1) return true
                    return false
                }}
            >
                <PlacementPredicate clusters={props.clusters} />
            </ArrayInput>
            <NumberInput
                label="Limit the number of clusters selected"
                path="spec.numberOfClusters"
                zeroIsUndefined
                hidden={(placement) => placement.spec?.numberOfClusters === undefined}
            />
        </Fragment>
    )
}

export function PlacementPredicate(props: { rootPath?: string; clusters: IResource[] }) {
    const rootPath = props.rootPath ?? ''
    const editMode = useEditMode()
    const labelValuesMap = useLabelValuesMap(props.clusters)
    const item = useItem()
    const labelSelectorMatchLabels = useMemo(
        () => get(item, `${rootPath}requiredClusterSelector.labelSelector.matchLabels`),
        [item, rootPath]
    )
    const claimSelectorMatchLabels = useMemo(
        () => get(item, `${rootPath}requiredClusterSelector.claimSelector.matchLabels`),
        [item, rootPath]
    )
    const inputLabel = useMemo(() => {
        if (labelSelectorMatchLabels || claimSelectorMatchLabels) return 'Label selectors'
        return 'Label expressions'
    }, [claimSelectorMatchLabels, labelSelectorMatchLabels])
    return (
        <Fragment>
            <KeyValue
                label="Cluster label selectors"
                path={`${rootPath}requiredClusterSelector.labelSelector.matchLabels`}
                labelHelp="Select clusters from the clusters in selected cluster sets using cluster labels. For a cluster to be be selected, the cluster must match all label selectors, label expressions, and claim expressions."
                placeholder="Add cluster label selector"
                hidden={() => labelSelectorMatchLabels === undefined}
            />
            <ArrayInput
                label={inputLabel}
                path={`${rootPath}requiredClusterSelector.labelSelector.matchExpressions`}
                placeholder="Add label expression"
                labelHelp="Select clusters from the clusters in selected cluster sets using cluster labels. For a cluster to be be selected, the cluster must match all label selectors, label expressions, and claim expressions."
                collapsedContent={<MatchExpressionCollapsed />}
                newValue={{ key: '', operator: 'In', values: [] }}
                defaultCollapsed={editMode !== EditMode.Create}
            >
                <MatchExpression labelValuesMap={labelValuesMap} />
            </ArrayInput>
            <ArrayInput
                label="Cluster claim expressions"
                path={`${rootPath}requiredClusterSelector.claimSelector.matchExpressions`}
                placeholder="Add claim expression"
                labelHelp="Select clusters from the clusters in selected cluster sets using cluster claims status. For a cluster to be be selected, the cluster must match all label selectors, label expressions, and claim expressions."
                collapsedContent={<MatchExpressionCollapsed />}
                newValue={{ key: '', operator: 'In', values: [] }}
                defaultCollapsed={editMode !== EditMode.Create}
                hidden={(item) => get(item, `${rootPath}requiredClusterSelector.claimSelector.matchExpressions`) === undefined}
            >
                <MatchExpression labelValuesMap={labelValuesMap} />
            </ArrayInput>
        </Fragment>
    )
}

export function PredicateSummary() {
    const predicate = useItem() as Predicate
    const labelSelectorLabels = predicate.requiredClusterSelector?.labelSelector?.matchLabels ?? {}
    const labelSelectorExpressions = predicate.requiredClusterSelector?.labelSelector?.matchExpressions ?? []
    const claimSelectorExpressions = predicate.requiredClusterSelector?.claimSelector?.matchExpressions ?? []

    const labelSelectors: string[] = []
    for (const matchLabel in labelSelectorLabels) {
        labelSelectors.push(`${matchLabel}=${labelSelectorLabels[matchLabel]}`)
    }

    if (labelSelectors.length === 0 && labelSelectorExpressions.length === 0 && claimSelectorExpressions.length === 0) {
        return <div>Expand to enter details</div>
    }

    return (
        <div style={{ display: 'flex', gap: 16, flexDirection: 'column' }}>
            {labelSelectors.length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexDirection: 'column' }}>
                    <div className="pf-c-form__label pf-c-form__label-text">Cluster label selectors</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {labelSelectors.map((labelSelector) => (
                            <span key={labelSelector}>{labelSelector}</span>
                        ))}
                    </div>
                </div>
            )}
            {labelSelectorExpressions.length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexDirection: 'column' }}>
                    <div className="pf-c-form__label pf-c-form__label-text">Cluster label expressions</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {labelSelectorExpressions.map((expression, index) => (
                            <MatchExpressionSummary key={index} expression={expression} />
                        ))}
                    </div>
                </div>
            )}
            {claimSelectorExpressions.length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexDirection: 'column' }}>
                    <div className="pf-c-form__label pf-c-form__label-text">Cluster claim expressions</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {claimSelectorExpressions.map((expression, index) => (
                            <MatchExpressionSummary key={index} expression={expression} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

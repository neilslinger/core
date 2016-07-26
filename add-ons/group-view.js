'use strict';

/**
 * @classdesc This is a simple helper class to set up the group-view data source in the context of a hypergrid.
 *
 * It includes methods to:
 * * Insert `DataSourceGroupview` into the data model's pipeline (`addPipe`, `addPipeTo`).
 * * Perform the column grouping and rebuild the index to turn the view on or off (`setRelation`).
 *
 * @param {object} [options]
 * @param {boolean} [options.shared=false]
 * @constructor
 */
function GroupView(grid, options) {
    this.grid = grid;
    this.options = options;
}

GroupView.prototype = {
    constructor: GroupView.prototype.constructor,

    /**
     * @summary Reconfigure the dataModel's pipeline for group view.
     * @desc The pipeline is reset starting with either the given `options.dataSource` _or_ the existing pipeline's first data source.
     *
     * Then the group view filter and sorter data sources are added as requested.
     *
     * The group view data source is then added.
     * Finally the group view group sorter source is added.
     *
     * This method can operate on either:
     * * A data model prototype, which will affect all data models subsequently created therefrom. The prototype must be given in `options.dataModelPrototype`.
     * * The current data model instance. In this case, the instance is given its own new pipeline.
     *
     * @param {object} [options]
     * @param {object} [options.dataModelPrototype] - Adds the pipes to the given object. If omitted, this must be an instance; adds the pipes to a new "pwn" pipeline created from the first data source of the instance's old pipeline.
     * @param {dataSourcePipelineObject} [options.firstPipe] - Use as first data source in the new pipeline. If omitted, re-uses the existing pipeline's first data source.
     */
    setPipeline: function(options) {
        options = options || {};

        var amInstance = this instanceof GroupView,
            dataModel = options.dataModelPrototype || amInstance && this.grid.behavior.dataModel,
            firstPipe = options.firstPipe || dataModel.pipeline[0];

        if (!dataModel) {
            throw 'Expected dataModel.';
        }

        if (!firstPipe) {
            throw 'Expected pip (data source pipeline descriptor).';
        }

        if (options.dataModelPrototype) {
            // operating on prototype
            dataModel.truncatePipeline();
            dataModel.addPipe(firstPipe);
        } else {
            // operating on an instance: create a new "own" pipeline
            dataModel.pipeline = [firstPipe];
        }

        if (options.includeFilter) {
            dataModel.addPipe({ type: 'DataSourceGlobalFilter' });
        }

        dataModel.addPipe({ type: 'DataSourceGroupView', test: isGroupview });

        if (options.includeSorter) {
            dataModel.addPipe({ type: 'DataSourceGroupSorter' });
        }

        if (amInstance) {
            this.grid.behavior.setData(dataModel.source.data);
            this.grid.behavior.shapeChanged();
        }
    },

    /**
     * @summary Build/unbuild the group view.
     * @param {boolean} groups - Turn group-view **ON**. If falsy (or omitted), turn it **OFF**.
     * @returns {boolean} Joined state.
     */
    setRelation: function(groups) {
        var behavior = this.grid.behavior,
            dataModel = behavior.dataModel,
            dataSource = dataModel.sources.groupview,
            grouped = !!groups.length,
            state = behavior.getPrivateState(),
            columnProps = behavior.getColumn(dataSource.groupColumnIndex).getProperties();

        if (grouped) {
            // save the current value of column's editable property and set it to false
            this.editableWas = !!columnProps.editable;
            columnProps.editable = false;

            // save value of grid's checkboxOnlyRowSelections property and set it to true so drill-down clicks don't select the row they are in
            this.checkboxOnlyRowSelectionsWas = state.checkboxOnlyRowSelections;
            state.checkboxOnlyRowSelections = true;

        } else {
            columnProps.editable = this.editableWas;
            state.checkboxOnlyRowSelections = this.checkboxOnlyRowSelectionsWas;
        }

        this.grid.selectionModel.clear();
        this.grid.clearMouseDown();

        dataModel.applyAnalytics();
        behavior.shapeChanged();

        return grouped;
    }
};

/**
 * This is the required test function called by the data model's `isDrilldown` method in context. _Do not call directly._
 * @param {number} [columnIndex] If given, also checks that the column clicked is the group column.
 * @returns {boolean} If the data source is a group view.
 */
function isGroupview(event) {
    var groupview = this.sources.groupview,
        result = !!(groupview && groupview.viewMakesSense());
    if (result && event) {
        result = event.dataCell.x === groupview.treeColumnIndex;
    }
    return result;
}

module.exports = GroupView;

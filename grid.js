var store;
Ext.Loader.setConfig({enabled: true});
Ext.Loader.setPath('Ext.ux', 'ext-4.2.0/examples/ux');
Ext.require([
    'Ext.grid.*',
    'Ext.data.*',
    'Ext.ux.grid.FiltersFeature',
    'Ext.toolbar.Paging',
    'Ext.ux.ajax.JsonSimlet',
    'Ext.ux.ajax.SimManager'
]);
Ext.onReady(function(){
    var genres = [], countries = [];
    _.each(mlist.movies, function(m) {
        if (_.has(m,'genres')) genres = _.union(genres, m.genres);
        if (_.has(m,'countries')) countries = _.union(countries, m.countries);
    })

    function pct(pct) {
        var val = parseInt(pct);
        if (val > 75) {
            return '<span style="color:red;">' + pct + '</span>';
        } else if (val > 50) {
            return '<span style="color:blue;">' + pct + '</span>';
        } else  {
            return '<span style="color:gray;">' + pct + '</span>';
        }
        return pct;
	}
	
	function list(val) {
		if (val) {
			if (val.length>5) {
				return val.slice(0,5).join(', ')+', ...';
			} else {
				return val.join(', ');
			}
		} else return "";
		return (val?val.length:0);
	}

    function deepCount(val) {
        return "("+_.unique(_.flatten(val)).length+")"
    }

    var convertCreators = function(creators) {
        return '<ul>'+_.map(_.pairs(creators), function(pair){return '<li>'+pair[0]+' '+pair[1].join(', ') +'</li>'}).join('') +'</ul>';
    }

    Ext.define('Movie', {
        extend: 'Ext.data.Model',
        fields: [
            {name: 'title', type: 'string'},
            {name: 'id',  type: 'int'},
            {name: 'dir',   type: 'string'},
            {name: 'rating', type: 'int'},
            {name: 'year', type: 'int'},
            {name: 'length', type: 'int'},
            {name: 'url', type: 'string'},
            {name: 'genres'},
            {name: 'countries' },
            {name: 'creators' },
            {name: 'creatorsText' , convert: convertCreators, mapping:'creators'}
        ]
    });
    store = Ext.create('Ext.data.Store', {
        model: 'Movie',
        data: mlist,
        proxy: {
            type: 'memory',
            reader: {
                type: 'json',
                root: 'movies'
            }
        },
        autoLoad: true
    });

    var filters = {
        ftype: 'filters',
        local: true
    };

    var listListFilter = function (record) {
        var filterArray = this.getValue();
        var valueArray = record.get(this.dataIndex)
        return _.union(valueArray,filterArray).length == valueArray.length;
    }

    // create the Grid
    var grid = new Ext.grid.GridPanel({
        store: store,
        features: [filters],
        columns: [
            {
           		id : 'title',
                header   : 'Název', 
                sortable : true, 
                dataIndex: 'title',
                flex:10,
                filterable: true
            },
            {
                header   : 'Rok', 
                width    : 75, 
                sortable : true, 
                dataIndex: 'year',
                filterable: true
            },
            {
                header   : '% ČSFD', 
                width    : 75, 
                sortable : true, 
                renderer : pct, 
                dataIndex: 'rating',
                filterable: true
            },
            {
                id       : 'web',
                header   : 'web', 
                width    : 40, 
                xtype:'templatecolumn',
                tpl:'<a href="{url}">csfd</a>',
            },
            {
                header   : 'Žánry', 
                dataIndex: 'genres',
                renderer : list, 
                flex:8,
                filter: {
                    type: 'list',
                    options: genres,
                    validateRecord : listListFilter
                }
            },
            {
                header   : 'Původ', 
                dataIndex: 'countries',
                renderer : list, 
                flex:8,
                filter: {
                    type: 'list',
                    options: countries,
                    validateRecord : listListFilter
                }
            },
            {
                header   : 'Délka', 
                dataIndex: 'length',
                width:75,
                filterable: true
            },
            {
                header   : 'Tvůrci', 
                dataIndex: 'creators',
                width:75,
                renderer: deepCount,
                filter: {
                    type: 'string',
                    validateRecord : function (record) {
                        var filter = this.getValue();
                        var values = _.flatten(record.get(this.dataIndex)).join('//');
                        return values.toLowerCase().indexOf(filter.toLowerCase()) > -1
                    }
                }

            }
            
        ],
        stripeRows: true,
        stateful: true,
        stateId: 'grid',
        region: 'center'
    });

    var movieTplMarkup = [
        '<b>Cesta:</b> <code>{dir}</code><br/>',
        '<b>Tvůrci:</b> {creatorsText}'
    ];
    var movieTpl = Ext.create('Ext.Template', movieTplMarkup);


    grid.on('render', function(g) {
        var view = grid.getView(); 
    });

    grid.getSelectionModel().on('selectionchange', function(sm, selectedRecord) {
        if (selectedRecord.length) {
            var detailPanel = Ext.getCmp('detailPanel');
            detailPanel.update(movieTpl.apply(selectedRecord[0].data));
        }
    });

   new Ext.Viewport({
		layout: 'border',
		items: [grid, {
                id: 'detailPanel',
                region: 'south',
                bodyPadding: 7,
                bodyStyle: "background: #ffffff;",
                html: 'Výběrem filmu zobrazíte podrobnosti. Pod šipkou v hlavičce je filtrování.'
        }],
        renderTo: Ext.getBody()
    });
});

<?php

function _eatlas_ncanimate2_overview() {
    $output = '<h3>' . t('NcAnimate 2 products') . '</h3>';

    $blocks = eatlas_ncanimate2_block_load_all();

    $header = array(t('Title'), t('Operations'));
    $rows = array();
    foreach($blocks as $block) {
        $rows[] = array(
            $block->name,
            l(t('Edit'), "admin/config/eatlas/eatlas_ncanimate2/$block->bid/edit") .
            '<span class="eatlas_ncanimate2_video-selector-spacer"></span>' .
            l(t('Delete'), "admin/config/eatlas/eatlas_ncanimate2/$block->bid/delete")
        );
    }
    $output .= theme('table', array('header' => $header, 'rows' => $rows, 'empty' => t('There is no NcAnimate 2 product block.')));

    $output .= '<a href="eatlas_ncanimate2/create">Create a new NcAnimate 2 product</a>';

    return $output;
}

function _eatlas_ncanimate2_create($form, &$form_state) {
    return _eatlas_ncanimate2_edit($form, $form_state, NULL);
}

function _eatlas_ncanimate2_edit($form, &$form_state, $bid) {
    $block = eatlas_ncanimate2_block_load($bid);

    // https://api.drupal.org/api/drupal/developer!topics!forms_api_reference.html/7.x/
    $form['name'] = array(
        '#type' => 'textfield',
        '#title' => t('Name'),
        '#description' => t('Choose a name for this NcAnimate 2 product. The name will be use to identify the block.'),
        '#default_value' => $block && property_exists($block, 'name') ? $block->name : '',
        '#required' => TRUE
    );

    $form['serviceurl'] = array(
        '#type' => 'textfield',
        '#maxlength' => 1024,
        '#title' => t('Service URL'),
        '#description' => t('The URL of the NcAnimate 2 product service.') . '<br/>' .
            t('Example') . ': ' .
            'https://api.test.aims.ereefs.org.au/metadata/NCANIMATE_PRODUCT/${productid}',
        '#default_value' => $block && property_exists($block, 'serviceurl') ? $block->serviceurl : '',
        '#required' => TRUE
    );

    $form['productid'] = array(
        '#type' => 'textfield',
        '#title' => t('Product'),
        '#description' => t('The path of the NcAnimate 2 product. This is the relative path to the folder containing the maps and the videos.'),
        '#default_value' => $block && property_exists($block, 'productid') ? $block->productid : '',
        '#required' => TRUE
    );

    $form['mapurl'] = array(
        '#type' => 'textfield',
        '#maxlength' => 2048,
        '#title' => t('Map URL'),
        '#description' => t('The URL of the background image of the map widget, used to navigation between regions.') . '<br/>' .
            t('Example') . ': ' .
            'http://maps.eatlas.org.au/maps/ea/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=image%2Fpng&TRANSPARENT=true&LAYERS=ea%3AGBR_GBRMPA_GBR-features,ea%3AGBR_e-Atlas-GBRMPA_GBRMP-bounds_Ocean-bounds,ea%3AGBR_NERP-TE-13-1_eAtlas_NRM-Regions-GBRMP-2012&STYLES=GBR-features_Outlook,Polygon_Outline-Red,GBR_NRM-Regions-GBRMP_Mainland-border&SRS=EPSG%3A4326&WIDTH=${WIDTH}&HEIGHT=${HEIGHT}&BBOX=${WEST},${SOUTH},${EAST},${NORTH}' . '<br/>' .
            t('Placeholders') . ': ' .
            '<ul>' .
                '<li>' . t('Bounding box, in degree') .
                    '<ul>' .
                        '<li>${NORTH}</li>' .
                        '<li>${EAST}</li>' .
                        '<li>${SOUTH}</li>' .
                        '<li>${WEST}</li>' .
                    '</ul>' .
                '</li>' .
                '<li>' . t('Image dimensions, in pixels') .
                    '<ul>' .
                        '<li>${WIDTH}</li>' .
                        '<li>${HEIGHT}</li>' .
                    '</ul>' .
                '</li>' .
            '</ul>',
        '#default_value' => $block && property_exists($block, 'mapurl') ? $block->mapurl : '',
        '#required' => FALSE
    );
    $form['mapwidth'] = array(
        '#type' => 'textfield',
        '#element_validate' => array('element_validate_integer_positive'),
        '#title' => t('Map width (px)'),
        '#description' => t('The width of the map widget, in pixel.'),
        '#default_value' => $block && property_exists($block, 'mapwidth') ? $block->mapwidth : '',
        '#required' => FALSE
    );
    $form['mapheight'] = array(
        '#type' => 'textfield',
        '#element_validate' => array('element_validate_integer_positive'),
        '#title' => t('Map height (px)'),
        '#description' => t('The height of the map widget, in pixel.'),
        '#default_value' => $block && property_exists($block, 'mapheight') ? $block->mapheight : '',
        '#required' => FALSE
    );

    $form['actions'] = array('#type' => 'actions');
    $form['actions']['submit'] = array(
        '#type' => 'submit',
        '#value' => t('Save')
    );

    if ($block && property_exists($block, 'bid')) {
        $form['actions']['delete'] = array(
            '#type' => 'submit',
            '#value' => t('Delete'),
            '#submit' => array('_eatlas_ncanimate2_delete_redirect')
        );

        $form['bid'] = array(
            '#type' => 'hidden',
            '#value' => $block->bid
        );
    }

    return $form;
}

function _eatlas_ncanimate2_create_validate($form, &$form_state) {
    // Mandatory fields are managed by Drupal
}

function _eatlas_ncanimate2_create_submit($form, &$form_state) {
    return _eatlas_ncanimate2_edit_submit($form, $form_state);
}

function _eatlas_ncanimate2_edit_validate($form, &$form_state) {
    if (!isset($form_state['values']['bid'])) {
        form_set_error('name', t('Product not found. Try reloading the page.'));
    }
}

function _eatlas_ncanimate2_edit_submit($form, &$form_state) {
    $block = new stdClass();

    if (isset($form_state['values']['bid'])) {
        $block->bid = $form_state['values']['bid'];
    }
    if (isset($form_state['values']['name'])) {
        $block->name = $form_state['values']['name'];
    }
    if (isset($form_state['values']['serviceurl'])) {
        $block->serviceurl = $form_state['values']['serviceurl'];
    }
    if (isset($form_state['values']['productid'])) {
        $block->productid = $form_state['values']['productid'];
    }
    if (isset($form_state['values']['mapurl'])) {
        $block->mapurl = $form_state['values']['mapurl'];
    }
    if (isset($form_state['values']['mapwidth'])) {
        $block->mapwidth = $form_state['values']['mapwidth'] ? $form_state['values']['mapwidth'] : NULL;
    }
    if (isset($form_state['values']['mapheight'])) {
        $block->mapheight = $form_state['values']['mapheight'] ? $form_state['values']['mapheight'] : NULL;
    }

    eatlas_ncanimate2_block_save($block);

    // Return to the NcAnimate 2 product list page after submit
    $form_state['redirect'] = 'admin/config/eatlas/eatlas_ncanimate2';
}

function _eatlas_ncanimate2_delete_redirect($form, &$form_state) {
    if (isset($form_state['values']['bid'])) {
        $form_state['redirect'] = 'admin/config/eatlas/eatlas_ncanimate2/' . $form_state['values']['bid'] . '/delete';
    }
}

function _eatlas_ncanimate2_delete($form, &$form_state, $bid) {
    // Add the NcAnimate 2 product block ID to the form so the
    // submit function will know which block needs to be deleted.
    $form['bid'] = array(
        '#type' => 'hidden',
        '#value' => $bid
    );

    // Get some info about the NcAnimate 2 product to write better message to the user.
    $block = eatlas_ncanimate2_block_load($bid);

    return confirm_form($form,
        $question = 'Deleting NcAnimate 2 product <em>' . check_plain($block->name) . '</em>',
        'admin/config/eatlas/eatlas_ncanimate2', // Path to return to if "cancel" is pressed
        $description = 'Do you really want to delete the NcAnimate 2 product <em>' . check_plain($block->name) . '</em>?',
        $yes = 'Really?'
    );
}

function _eatlas_ncanimate2_delete_submit($form, &$form_state) {
    if (isset($form_state['values']['bid'])) {
        $bid = $form_state['values']['bid'];

        eatlas_ncanimate2_block_delete($bid);

        // Return to the NcAnimate 2 product list page after submit
        $form_state['redirect'] = 'admin/config/eatlas/eatlas_ncanimate2';
    }
}

// Display a personalised title for "Edit" pages
function _eatlas_ncanimate2_edit_title($block, $action) {
    switch($action) {
        case 'create':
            return 'Create a new NcAnimate 2 product block';
        case 'edit':
            return "Edit $block NcAnimate 2 product block settings";
        case 'delete':
            return "Delete $block NcAnimate 2 product block";
    }
    return "ERROR invalid action $action";
}

?>

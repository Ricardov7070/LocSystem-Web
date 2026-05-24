<?php

namespace Tests\Unit;

use App\Support\DatabaseSyncPayloadBuilder;
use PHPUnit\Framework\TestCase;

class DatabaseSyncPayloadBuilderTest extends TestCase
{
    public function test_build_maps_direct_and_relation_columns(): void
    {
        $builder = new DatabaseSyncPayloadBuilder();

        $payload = $builder->build(
            [
                'id' => 'cm9acq0c4325gxqjy31jbyna4',
                'name' => 'Cliente 1',
                'county_id' => 'cm9acq0c4325gxqjy31zzz999',
            ],
            [
                [
                    'mode' => 'direct',
                    'source_column' => 'name',
                    'destination_column' => 'v_name',
                ],
                [
                    'mode' => 'relation',
                    'source_column' => 'county_id',
                    'destination_column' => 'i_county_id',
                    'reference_source_table' => 'counties',
                ],
            ],
            [
                'counties' => [
                    'cm9acq0c4325gxqjy31zzz999' => 42,
                ],
            ],
        );

        $this->assertSame([
            'v_name' => 'Cliente 1',
            'i_county_id' => 42,
        ], $payload);
    }

    public function test_build_throws_when_relation_cannot_be_resolved(): void
    {
        $this->expectException(\RuntimeException::class);

        $builder = new DatabaseSyncPayloadBuilder();
        $builder->build(
            [
                'county_id' => 'missing-id',
            ],
            [
                [
                    'mode' => 'relation',
                    'source_column' => 'county_id',
                    'destination_column' => 'i_county_id',
                    'reference_source_table' => 'counties',
                ],
            ],
            [],
        );
    }
}
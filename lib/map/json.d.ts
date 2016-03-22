export interface JsonMapperOptions {
    map?: any;
    split?: boolean;
}
export declare function JsonMapper<T>(options?: JsonMapperOptions): (file: any) => Promise<T>;

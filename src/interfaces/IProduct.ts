export interface IProduct {
    id?: number,
    name: string,
    shortdescription?: string | null,
    image?: string,
    imageUrls: string[],
    productdescriptions: IDescription[],

    ispublished?: boolean,
    category?: string, // optional for migration
    categoryid?: string | number | null, // allow uuid or int, nullable for migration
    labels: string[],
    
    price: number,
    discount?: number,
    tax?: number, 

    productvariants?: IVariant[]
}

export interface IVariant {
    id: number,
    name: string,
    ispublished: boolean,
    productvariantoptions: IOption[]
}

export interface IOption {
    id: number,
    name: string,
    price: number,
    ispublished: boolean,
    isoutofstock: boolean,
    isdefault: boolean
}

export interface IDescription {
    id: number,
    title: string,
    content: string
}
// // Generic interface for DTOs that can be created from documents
// export interface Transformable<TDocument, TDto> {
//   new (document: TDocument): TDto;
// }

// // Base service class with generic transformation methods
// export abstract class BaseTransformService {
//   protected transformToDto<TDocument, TDto>(
//     document: TDocument,
//     DtoClass: Transformable<TDocument, TDto>
//   ): TDto {
//     return new DtoClass(document);
//   }

//   protected transformToDtos<TDocument, TDto>(
//     documents: TDocument[],
//     DtoClass: Transformable<TDocument, TDto>
//   ): TDto[] {
//     return documents.map(doc => this.transformToDto(doc, DtoClass));
//   }
// }

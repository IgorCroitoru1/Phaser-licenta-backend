// // Alternative approach: Generic transformation utility functions
// export type DtoConstructor<TDocument, TDto> = new (document: TDocument) => TDto;

// /**
//  * Transform a single document to DTO
//  */
// export function transformToDto<TDocument, TDto>(
//   document: TDocument,
//   DtoClass: DtoConstructor<TDocument, TDto>
// ): TDto {
//   return new DtoClass(document);
// }

// /**
//  * Transform an array of documents to DTOs
//  */
// export function transformToDtos<TDocument, TDto>(
//   documents: TDocument[],
//   DtoClass: DtoConstructor<TDocument, TDto>
// ): TDto[] {
//   return documents.map(doc => transformToDto(doc, DtoClass));
// }

// /**
//  * Transform with optional mapping function
//  */
// export function transformWithMapper<TDocument, TDto>(
//   document: TDocument,
//   mapper: (doc: TDocument) => TDto
// ): TDto {
//   return mapper(document);
// }

// /**
//  * Transform array with optional mapping function
//  */
// export function transformArrayWithMapper<TDocument, TDto>(
//   documents: TDocument[],
//   mapper: (doc: TDocument) => TDto
// ): TDto[] {
//   return documents.map(mapper);
// }

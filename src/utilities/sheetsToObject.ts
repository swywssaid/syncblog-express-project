interface resultDataType {

}

export default function sheetsToObject(data: Array<any[]>) {
    let obj:any = {};
    let result = [];
    let headers: string[] = data[0];
    let cols = headers.length;
    let row = [];

    for (let i = 1; i < data.length; i++){
        row = data[i];
        obj = {};
        for (var col = 0; col < cols; col++) {
            obj[headers[col]] = row[col] || "";    
        }
        result.push(obj);  
    }

    return result;  
};
// sheet 내용을 object로 바꾸는 함수
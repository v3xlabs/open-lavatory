const helloList = ['job', 'steve', 'john', 'jane'];

const peopleList = helloList.map((item) => {
    return {
        name: item,
        age: 20,
    };
});

console.log(peopleList);

const { request, response } = require("express");
const express = require("express");
const { v4:uuidv4 } = require("uuid");

const app = express();
app.use(express.json());

// Criar um array para guardar os customers
const customers = [];

//Middleware

function verifyIfExistsAccountCPF(request, response, next) {
    // desestrutura cpf de request.header
    const { cpf } = request.headers;

    /**
     * const customer recebe um customer de uma pesquisa
     * customers.find() recebe como parâmetro uma arrow function
     * que recebe um customer como parâmetro e compara se o customer informado
     * tem o mesmo cpf do request.body
     * Se sim, retorna true para o customer.find
     */

    const customer = customers.find(
        customer => customer.cpf === cpf    
    );
        
    /**
     * const customer = customers.find(
     * function customerFind (customer){
     *   return customer.cpf === cpf
     * }
    */

    // validando a conta

    /**
    * se customer for false, então ele muda pra true e 
    * e entra no if e retorna um status 400 e um erro
    */
    
    if (!customer) {
        return response.status(400).json({
            error: "Customer not found"
        });
    };
}

app.get('/statement/:cpf', (request, response) => {
    //Listando extrato
    
    return response.json(customer.statement);
})

app.post("/account", (request, response) => {
    const { cpf, name } = request.body;

    // Validando cpf existente

    /**
     * const customerAlreadyExists recebe um valor booleno
     * custormers.some é uma função que retorna true or false
     * some recebe uma arrow function que verifica o custumer passado por parâmetro
     * tem o mesmo cpf que o cpf infomado no request.body
     */
    
    const customerAlreadyExists = customers.some(
        (customer) => customer.cpf === cpf
    );

    /**
     * se customerAlreadyExists === true então
     * significa que existe já o cpf cadastrado
     * logo, essa função retona um status 400 e 
     * um json informando o erro
     */

    if (customerAlreadyExists) {
        return response.status(400).json({
             error: "Customer already exists!"
        });
    }

    // Cadastro de conta
    customers.push({
        id: uuidv4(),
        cpf,
        name,
        statement: [],
    });

    return response.status(201).send();
});

app.listen(3333, () => {
    console.log("Buh");
});
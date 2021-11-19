const { request, response } = require("express");
const express = require("express");

// importa o uuidv4, um gerador de identificadores unicos e universais: útil pra tipar id
const { v4:uuidv4 } = require("uuid");

const app = express();
app.use(express.json());

// Iniciando array de customers
// vai servir como o "database"
const customers = [];

// MIDDLEWARE
function verifyIfExistsAccountCPF(request, response, next) {
    // desestrutura cpf de request.header
    const { cpf } = request.headers;

    // se o customer informado tem o mesmo cpf do request.body, retorna true para o customer.find
    // ou seja, esse customer já existe
    const customer = customers.find(
        customer => customer.cpf === cpf    
    );
    
    // validando a conta - se customer for false, então ele muda pra true e e entra no if e 
    // retorna um status 400 e um erro
    if (!customer) {
        return response.status(400).json({error: "Customer not found"});
    };
 
    // chama o request, dá um nome pra ele, e faz ele receber o customer 
    request.customer = customer;

    // se tudo der certo, ele manda executar o que tiver depois, no caso, as rotas
    return next();
}

// GETBALANCE
function getBalance(statement) {

    // balance recebe o "balanço" das somas de depósitos (credit) e as subtrações dos saques (debit)
    // saber quanto tem na conta bancária
    const balance = statement.reduce((accumulator, operation) => {
        // reduce é uma função que, resumidamente, recebe vários elementos e retorna apenas um
        // vai acumulando de acordo com as iterações

        // se for crédito/depósito, ele soma com o acumulador
        if(operation.type === 'credit') {
            return accumulator + operation.amount;
        }

        // se for débito/saque, ele subtrai do acumulador
        else { // operation.type === 'debit'
            return accumulator - operation.amount;
        }
    }, 0); // inicia com zero

    // retorna o valor total do balanço
    return balance;
}

// ROUTES - Account

// Listar uma conta
app.get("/account", verifyIfExistsAccountCPF, (request, response) => {   
    // desestrutura customer da request
    const { customer } = request;

    // retorna um json com o customer
    return response.json(customer);
});

// Cadastrar uma conta
app.post("/account", (request, response) => {
    // desestrutura cpf e name da request.body
    const { cpf, name } = request.body;

    // Validando cpf existente
    // customerAlreadyExists é booleano: custormers.some retorna true or false de acordo com o teste
    const customerAlreadyExists = customers.some(

        //verifica o custumer passado por parâmetro tem o mesmo cpf que o cpf infomado no request.body
        (customer) => customer.cpf === cpf
    );

    // se customerAlreadyExists === true então o cpf já foi cadastrado
    if (customerAlreadyExists) {
        
        // logo, essa função retona um status 400 e  um json informando o erro
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
    // return response.status(201).json(customers);
});

// Alterar uma conta
app.put("/account", verifyIfExistsAccountCPF, (request, response) => {
    // desestrutura name da request.body
    const { name } = request.body;

    // desestrutura customer da request
    const { customer } = request;

    // altera o name do customer para o name informado na request.body
    customer.name = name;

    // retorna um status 200
    return response.status(201).send();
    // return response.status(201).json(customer);
});

// Deletar uma conta
app.delete("/account", verifyIfExistsAccountCPF, (request, response) => {
    // desestrutura customer da request
    const { customer } = request;

    // deleta um customer usando a função slice, que recebe a primeira e a ultima posicao que deve excluir no array
    // param 1, pq é só um customer a ser exluído
    customers.splice(customer, 1);

    // retorna um status 200 e um json com os customers restantes
    return response.status(200).json(customers);
});

// ROUTES - statement

// Lista o extrato
app.get("/statement", verifyIfExistsAccountCPF, (request, response) => {
    // desestrutura customer de request
    const { customer } = request;
    
    // retorna um json com os statmen
    return response.json(customer.statement);
})

// Lista o extrato bancário conforme a data informada
app.get("/statement/date", verifyIfExistsAccountCPF, (request, response) => {
    // desestrutura customer de request
    const { customer } = request;

    // cria date a partir da request.query
    const date = request.query;

    // formata date para data + hora
    const dateFormat = new Date(date + " 00:00");

    // usa filter para criar um novo array onde a data seja igual a data da query
    const statement = customer.statement.filter(

        // recebe um statement como parametro
        (statement) => 
        statement.created_at.toDateString() ===         // formata created_at para string e compara com dateFormat
        new Date(dateFormat).toDateString()             // formata dateFormat para string
    );

    // retorna um json com statement do customer
    return response.json(customer.statement);
})

// ROUTES - Deposit

// Cadastrar um depósito
app.post("/deposit", verifyIfExistsAccountCPF, (request,response) => {
    // desestrutura description e amout do request.body
    const { description, amount } = request.body;

    // desestrutura customer do request 
    const { customer } = request; 

    // cria um objeto para armazenar os dados da operação no extrato - um depósito
    const statementOperation = {
        description,                    // descrição
        amount,                         // quantia em dinheiro
        created_at: new Date(),         // data de depósito
        type: "credit"                  // credit (depósito) || debit (saque)
    }

    // insere o objeto statementOperation dentro do array statement do customer
    customer.statement.push(statementOperation);

    // retorna um status 201
    return response.status(201).send();
})

// ROUTES - Withdraw

// Cadastrar um saque
app.post("/withdraw", verifyIfExistsAccountCPF, (request, response) => {
    // desestrutura amout do request.body
    const { amount } = request.body;

    // desestrutura customer do request 
    const { customer } = request;

    // chama a função getBalance, passando o statement como parâmetro e armazena o resultado em balance
    const balance = getBalance(customer.statement);

    // se o balance(o que ele tem na conta) for menor que o amount (o que ele quer sacar)
    if (balance < amount) {
        // retorna um status 400 e uma mensagem de erro
        return response.status(400).json({error: "Insufficient funds!"})
    }

    // se não cair no if
    // cria um objeto para armazenar os dados da operação no extrato - um saque
    const statementOperation = {
        amount,                     // quantia em dinheiro
        created_at: new Date(),     // data de depósito
        type: "debit"               // credit (depósito) || debit (saque)
    }

    // insere o objeto statementOperation dentro do array statement do customer
    customer.statement.push(statementOperation);
    
    // retorna um status 201
    return response.status(201).send();
});

// ROUTES - Balance

// Listar o balance
app.get("/balance", verifyIfExistsAccountCPF, (request, response) => {
    // desestrutura customer do request 
    const { customer } = request;

    // chama a função getBalance, passando o statement como parâmetro e armazena o resultado em balance
    const balance = getBalance(customer.statement);

    //retorna um json com o resultado do balance
    return response.json(balance);
})

// app.listen
app.listen(3333, () => {
    console.log("Buh");
});
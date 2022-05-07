const { response } = require('express');
const express = require('express');
const { v4: uuidv4 } = require("uuid");

const app = express();

app.use(express.json());

/**
 * GET - Buscar uma informação dentro do servidor
 * POST - Inserir uma informação no servidor
 * PUT - Alterar uma informação no servidor
 * PATCH - Alterar uma informação específica
 * DELETE - Deletar uma informação no servidor
 */

/**
 * Tipos de parâmetros
 * 
 * Route Params => Identificar um recurso editar/deletar/buscar
 * Query Params => Paginação / Filtro
 * Body Params => Os objetos inserção/alteração (JSON)
 */


/**
 * cpf - string
 * name - string
 * id - uuid
 * statement []
 */

const customers = [];

// Middleware
function verifyIfExistsAccountCPF(request, response, next) {
    const { cpf } = request.headers;

    const customer = customers.find( customer => customer.cpf === cpf );

    if(!customer) {
        return response.status(400).json({
            error: "Customer not Found"
        })
    }

    request.customer = customer;

    return next();
}

function getBalance(statement) {
    const balance = statement.reduce((acc, operation) => {
        if(operation.type === 'credit') {
            return acc + operation.amount;
        } else {
            return acc - operation.amount;
        }
    }, 0);

    return balance;
}

app.post("/account", (request, response) => {
    const { name, cpf } = request.body;

    // verifica se já existe cliente com o mesmo CPF cadastrado
    const customerAlreadyExists = customers.some(
        (customer) => customer.cpf === cpf 
    );
    
    // se existir, retorna mensagem de erro com status code 400
    if(customerAlreadyExists) {
        return response.status(400).json({
            error: "Customer already exists! "
        });
    }

    // se não existir, permite criar novo cliente no banco de dados
    customers.push({
        cpf,
        name,
        id: uuidv4(),
        statement: []
    })

    return response.status(201).send(customers);
});

// app.use(verifyIfExistsAccountCPF) -> forma utilizada quando todos as rotas utilizam o middleware
app.get("/statement", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;
    return response.json(customer.statement);
});

app.post("/deposit", verifyIfExistsAccountCPF, (request, response) => {
    const { description, amount } = request.body;

    const { customer } = request;

    const statementOperation = {
        description,
        amount,
        created_at: new Date(),
        type: "credit"
    }

    customer.statement.push(statementOperation);

    return response.status(201).send();
});

app.post("/withdraw", verifyIfExistsAccountCPF, (request, response) => {
    const { amount } = request.body;
    const { customer } = request;

    const balance = getBalance(customer.statement);

    if(balance < amount) {
        return response.status(400).json({
            error: "Insufficient funds!"
        })
    }

    const statementOperation = {
        amount,
        created_at: new Date(),
        type: "debit"
    }

    customer.statement.push(statementOperation);

    return response.status(201).send();
});

app.get("/statement/date", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;
    const { date } = request.query;

    const dateFormat = new Date(date + " 00:00");

    const statement = customer.statement.filter((statement) => statement.created_at.toDateString() === new Date(dateFormat).toDateString());

    return response.json(statement);
});

app.put("/account", verifyIfExistsAccountCPF, (request, response) => {
    const { name } = request.body;
    const { customer } = request;

    customer.name = name;

    return response.status(201).send();
});

app.get("/account", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;
    return response.json(customer);
});

app.delete("/account", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;

    // splice
    customers.splice(customer, 1);

    return response.status(200).json(customers);
});

app.get("/balance", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;

    const balance = getBalance(customer.statement);

    return response.json(balance);
})

//localhost:3333
app.listen(3333);


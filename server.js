const express= require('express');
const app= express();
const port=3000;
var mcache = require('memory-cache');
const {check, body ,validationResult} = require('express-validator');
const bodyParser = require('body-parser')
const cors= require('cors');
const swaggerJsdoc= require('swagger-jsdoc');
const swaggerUi= require('swagger-ui-express');

const axios = require('axios');

app.use(cors());
const options = {
    swaggerDefinition: {
      info: {
        title: "Company API",
        version: "1.0.0",
        description: "Company API autogenerated by Swagger",
      },
      host: "134.209.64.226:3000",
      basePath: "/",
    },
    apis: ["./server.js"],
  };


const specs = swaggerJsdoc(options);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(specs));
app.use(bodyParser.json());
const mariadb= require('mariadb');
const pool= mariadb.createPool({
        host:'localhost',
        user:'root',
        password:'sreekar',
        database:'sample1',
	port:3306,
        connectionLimit:5
});

var cache = (duration)=>{
        return(req,res,next)=>{
                let key= '__express__' + req.originalUrl || req.url
                let cachedBody = mcache.get(key)
                if (cachedBody) {
                        console.log("returning from cache");
                        res.header('Content-Type','application/json');
                        res.status(200).send(cachedBody);
                        return;
                }else{
                        res.sendResponse=res.send
                        res.send=(body)=>{
                                mcache.put(key,body,duration*1000);
                                res.header('Content-Type','application/json');
                                res.status(200).sendResponse(body)
                                }
                        next();
                        }
        }
}



/**
 * @swagger
 * /company:
 *    get:
 *      description: All records from company table
 *      produces:
 *          - application/json
 *      responses:
 *          200:
 *              description: tuples of company objects
 */
app.get('/company',cache(100),(req,res)=>{
        console.log("/GET company")
        pool.getConnection()
                .then(conn =>{
                        conn.query("SELECT * FROM company")
                                .then((rows)=>{
                                        res.status(200).send(rows);
                                        conn.end();
                                        }).catch(err=>{
                                                console.log(err);
                                                conn.end();
                                        })
                                }).catch(err=>{
                                console.log("not connected");
                                })
});


/**
 * @swagger
 * /agents:
 *    get:
 *      description: All records from Agents table
 *      produces:
 *          - application/json
 *      responses:
 *          200:
 *              description: tuples of Agents objects
 */
app.get('/agents', cache(100), (req,res)=>{                             
        console.log("GET /agents");                               
        pool.getConnection()                                            
                .then(conn=>{                                           
                        conn.query("SELECT * from agents")              
                                .then((rows)=>{                                                                 
                                        res.json(rows);                 
                                        conn.end();                     
                                        }).catch(err=>{                 
                                                console.log(err);       
                                                conn.end();             
                                        })                              
                                }).catch(err=>{                         
                                        console.log("Not connected");   
                                });                                     
});                                                                     
                                                                        
																		

/**
 * @swagger
 * /customer:
 *    get:
 *      description: All records from customer table
 *      produces:
 *          - application/json
 *      responses:
 *          200:
 *              description: tuple of customer objects
 */																		
app.get('/customer',cache(100),(req,res)=>{
        console.log("GET /customer");
        pool.getConnection()
                .then(conn=>{
                        conn.query("SELECT * from customer")
                                .then((rows)=>{
                                        res.json(rows);
                                        conn.end();
                                        }).catch(err=>{
                                        console.log(err);
                                        conn.end();
                                        })
                                }).catch(err=>{
                                        console.log("Not connected");
                                });
});

/**
 * @swagger
 * definitions:
 *   Company:
 *     properties:
 *       COMPANY_ID:
 *         type: string
 *       COMPANY_NAME:
 *         type: string
 *       COMPANY_CITY:
 *         type: string
 */
/**
 * @swagger
 * /company:
 *    post:
 *      description: Add record to company table
 *      produces:
 *          - application/json
 *      responses:
 *          200:
 *              description: Add data
 *          500:
 *              description: Data already exists
 *          422:
 *              description: Errors in input object
 *      parameters:
 *          - name: Company
 *            description: Company object
 *            in: body
 *            required: true
 *            schema:
 *              $ref: '#/definitions/Company'
 *
 */
app.post('/company', [
    check('COMPANY_ID').isAlphanumeric().withMessage('COMPANY_ID should be Alphanumeric').isLength({max:6}).withMessage("COMPANY_ID length should be at max 6"),
    check('COMPANY_NAME').trim().escape().custom(value => /^([a-zA-Z\s])*$/.test(value)).withMessage('COMPANY_NAME should have Alphabets only').isLength({max:25}).withMessage("COMPANY_NAME length should be at max 25"),
    check('COMPANY_CITY').trim().escape().custom(value => /^([a-zA-Z\s])*$/.test(value)).withMessage('COMPANY_CITY should only have Alphabets').isLength({max:6}).withMessage("COMPANY_CITY length should be at max 6"),
], function (req,res){                                                                                                                      
    console.log("POST /company");      
    var errors= validationResult(req);
    if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.array() })      
    }
    else{                                                                                                                                                                              
    pool.getConnection()                                                                                                                                        
        .then(conn=>{                                                                                                                                       
         conn.query("SELECT * from company where COMPANY_ID = ?" , [req.body.COMPANY_ID])                                                                                 
            .then((row)=>{                                                                                                                              
                 if (row.length>0){                                                                                                                  
                     res.status(500).json({status:"Company ID already exists"});                                                                                
                     conn.end();                                                                                                         
                     return;                                                                                                                     
                    }                                                                                                                                                                                   
                 conn.query("INSERT into company value (?, ?,?)", [req.body.COMPANY_ID, req.body.COMPANY_NAME, req.body.COMPANY_CITY])                   
                    .then((rows)=>{                                                                                                             
                        res.status(200).json({status: 'Record Inserted'});                                                                               
                        conn.end();                                                                                                         
                        })                                                                                                                  
                    })                                                                                                                          
                }).catch(err=>{                                                                                                                     
                     console.log("Not connected");                                                                                       
                     console.log(err);  
                     conn.end();                                                                                                   
                 });    
                }                                                                                                                     
});  


/**
 * @swagger
 * /company/{id}:
 *    delete:
 *      description: Delete record in Company table
 *      produces:
 *          - application/json
 *      responses:
 *          200:
 *              description: Successfully deleted record from table
 *          422:
 *              description: Errors in input object
 *      parameters:
 *          - name: id
 *            in: path
 *            required: true
 *            type: string
 *
 */
app.delete('/company/:COMPANY_ID', [
    check('id').isLength({max:6}).withMessage("COMPANY_ID length should be at max 6")
    ],(req,res)=>{
    console.log("DELETE /company/:COMPANY_ID");
    var errors= validationResult(req);
    if (!errors.isEmpty()) {
    	return res.status(422).json({ errors: errors.array() })
    }
    else{ 
        pool.getConnection()                                                                                                                                        
        .then(conn=>{                                                                                                                                       
  	conn.query("DELETE from company where COMPANY_ID = ?" , [req.params.COMPANY_ID])                                                                                 
            .then((row)=>{                                                                                                                              
                if (row.affectedRows==0){
                    res.json({"status":"Record for COMPANY_ID doesn't exist"})
                    conn.end();
                    return;
                }
                res.json({"status":"Record Deleted"});
                conn.end();
            })
        }).catch(err=>{
       	    console.log(err);
            conn.end();  
        });
    }                                                                                                         
})

/**
 * @swagger
 * /company:
 *    put:
 *      description: add or update a record
 *      produces:
 *          - application/json
 *      responses:
 *          200:
 *              description: Add or Update data
 *          422:
 *              description: Errors in input
 *      parameters:
 *          - name: Company
 *            description: Company object
 *            in: body
 *            required: true
 *            schema:
 *              $ref: '#/definitions/Company'
 *
 */
app.put("/company",
[
    check('COMPANY_ID').isAlphanumeric().withMessage('COMPANY ID should be Alphanumeric').isLength({max:6}).withMessage("COMPANY ID length should be at max 6"),
    check('COMPANY_NAME').isAlphanumeric().withMessage('COMPANY NAME should be Alphanumeric').isLength({max:40}).withMessage("COMPANY NAME length should be at max 40"),
    check('COMPANY_CITY').isAlphanumeric().withMessage('COMPANY CITY should be Alphanumeric').isLength({max:35}).withMessage("COMPANY CITY length should be at max 35"),
]
, (req, res) => {
    pool
      .getConnection()
      .then((conn) => {
      conn.query("SELECT * FROM company where COMPANY_ID=?",[req.body.COMPANY_ID]).then((row)=>{
          if(row.length==0){
            conn.query("INSERT into company value (?,?,?)", [req.body.COMPANY_ID, req.body.COMPANY_NAME, req.body.COMPANY_CITY])                   
            .then((rows)=>{                                                                                                             
                conn.end();  
                res.status(200).json({status: 'ok'});                                                                               
                return;                                                                                                       
                })  
            }                                                                                                                
                                                                                                                                      
            else{
            	conn.query("UPDATE company SET COMPANY_NAME=?, COMPANY_CITY=? WHERE COMPANY_ID=?",[req.body.COMPANY_NAME, req.body.COMPANY_CITY, req.body.COMPANY_ID])
                .then((data) => {
                  res.status(200).json({status: 'ok', "data":data});                                                                                       
                  conn.close();
                })   
                .catch((err) => {
                  console.log(err);
                  conn.end();
                });
           }
      })
      .catch((err) => {
        console.log(err);
        conn.end();
      });
    });
  });


  /**
 * @swagger
 * /company:
 *    patch:
 *      description: Update record
 *      produces:
 *          - application/json
 *      responses:
 *          200:
 *              description: Updated data
 *          404:
 *              description: No record exists
 *          422:
 *              description: Errors in input
 *      parameters:
 *          - name: Company
 *            description: company object
 *            in: body
 *            required: true
 *            schema:
 *              $ref: '#/definitions/Company'
 *
 */
app.patch('/company',
[
    check('COMPANY_ID').isAlphanumeric().withMessage('COMPANY ID should be Alphanumeric').isLength({max:6}).withMessage("COMPANY ID length should be at max 6"),
    check('COMPANY_NAME').isAlphanumeric().withMessage('COMPANY NAME should be Alphanumeric').isLength({max:25}).withMessage("COMPANY NAME length should be at max 25"),
    check('ITEM_UNIT').isAlphanumeric().withMessage('COMPANY CITY should be Alphanumeric').isLength({max:5}).withMessage("COMPANY CITY length should be at max 5"),
],

(req,res)=>{
    pool
      .getConnection()
      .then((conn) => {
        conn.query("SELECT * FROM company where COMPANY_ID=?",[req.body.COMPANY_ID])
          .then((rows)=>{
            if(rows.length==0){
                conn.close();
                res.status(404).json({"status":"COMPANY_ID doesnot exits"});
                return;
            }
            let row=rows[0];
	    console.log(row);
            if (req.body.COMPANY_NAME!=null && row.COMPANY_NAME!=req.body.COMPANY_NAME){
                row.COMPANY_NAME=req.body.COMPANY_NAME;
            }
            if (req.body.COMPANY_CITY!=null && row.COMPANY_CITY!=req.body.COMPANY_CITY){
                row.COMPANY_CITY=req.body.COMPANY_CITY;
            }
            console.log(row);
            conn.query("UPDATE company SET COMPANY_NAME=? , COMPANY_CITY=? WHERE COMPANY_ID=?",[row.COMPANY_NAME, row.COMPANY_CITY, row.COMPANY_ID])
            .then((data)=>{
                console.log(data);
                if (data.affectedRows>0)
                res.status(200).json({"status":"Record Updated"});
            })
          }).catch(err=>{
            console.log(err);
          });
      })
});
                                                                                                                                                            
app.get('/',cache(100), (req,res)=>{                                                                                                                        
        console.log("GET /company");                                                                                                                          
        var data= {"url3":'134.209.64.226:3000/company'};  
        res.json(data);                                                                                                                                     
});                                                                                                                                                         
   
app.get('/say', (req, res) => {
	if(req.query.keyword != null && req.query.keyword.length > 0){ 
		axios.get('https://4y4o7bzskj.execute-api.us-east-1.amazonaws.com/First?keyword=' + req.query.keyword).then(d=>{
		res.json(d.data);
		}).catch(err => {
			console.log(err);
		});
	}else{
		const response = {
			statusCode: 400,
			body: JSON.stringify('Query parameter keyword not provided')
		};
		res.json(response);
	}
});
                                                                                                                                                         
app.listen(port,()=>{                                                                                                                                       
console.log(`Applications is listening at 134.209.64.226:${port}`);                                                                                           
});

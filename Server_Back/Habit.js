class Habit {
    #habitId;
    #userId;
    #name;
    #description;
    #targetValue;
    #targetUnit;
    #frequency;
    #status;
    #createdAt;
    #archivedAt;
    constructor(habitId,userId,name,description,targetValue,TargetUnit,Frequency,HabitStatus,DateCreated){
    this.#habitId=habitId;
    this.#userId=userId;
    this.#name=name ;
    this.#description=description;
    this.#targetValue=targetValue;
    this.#targetUnit=TargetUnit;
    this.#frequency=Frequency;
    this.#status=HabitStatus;
    this.#createdAt=DateCreated;
    this.#archivedAt=null;
    }
    create(){
    //save to database
    return true ;
    }
    update (name,description,targetValue,targetUnit,frequency){
        this.#name=name;
        this.#description = description;
        this.#targetValue=targetValue;
        this.#targetUnit=targetUnit;
        this.#frequency=frequency;
        return true;
    }
    archive(){
        this.#archivedAt = new Date();
        //update logic to archived 
        return true;
    }
    logCompletion(value,note=""){
        //return new habitLog(...)
    }
    calculateStreak(){
        //calculate streak based on history 
        return 0; //int
    }
    getHistory(from,to){
    //fetch habitlog between dates()
    return[];//return list<HAbitLog>(Array)
    
    }
    getCompletionRate(from,to){
        //calc completion percentage
        return 0.0; // reutrn double 
    }   
}
module.exports=Habit;
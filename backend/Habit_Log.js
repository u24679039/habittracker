class HabitLog {
    //private prop
    #logId;
    #habitId;
    #date;
    #value;
    #status;
    #note;
    #createdAt;
    constructor(logId, habitId, date, value, status, note="", createdAt){
        this.#logId=logId;
        this.habitId=habitId;
        this.#date=date || new Date();
        this.#value = value;
        this.#status=status;
        this.#note=note ;
        this.#createdAt= createdAt || new Date();

    }
    save(){
        //save ht elog entry to the database
        return true;
    }
    update(value,status,note){
        this.#value=value;
        this.#status=status;
        this.#note=note;
        return true;
    }
    isCompleted(){
        //check agaisnt a LogStatus string/enum
        return this.#status ==="Completed";
    }
    isRestDay(){
        return this.#status ==="Rest_Day";
    }
    isSnoozed(){
        return this.#status === "Snoozed";

    }
    isMissed(){
        return this.#status === "Missed";

    }
}
module.exports = HabitLog
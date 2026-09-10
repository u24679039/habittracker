class Activity {
    #activityId;
    #groupId;
    #userId;
    #habitId;
    #activityType;
    #message;
    #timestamp;

    constructor(activityId,groupId,userId,habitId=null,activityType,message,timestamp){
    this.#activityId =     activityId;
    this.#groupId =     groupId;
    this.#userId =     userId;
    this.#habitId =     habitId;
    this.#activityType =   activityType;
    this.#message =     message;
    this.#timestamp =     timestamp || new Date();

    }
    create(userId,habitId,type, message){
        this.#userId=userId;
        this.#habitId = habitId;
        this.#activityType = type;
        this.#message = message;
        this.#timestamp = new Date();
        // insert activity record into the database
    }
    getActivity(){
        //return the Activity object data
        return this;
    }

}
module.exports = Activity;
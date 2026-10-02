import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia - kill mutant m720eb201", function () {
  it("should detect the mutant that changes division to addition in value calculation", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Enable distribution by ensuring distribution is not finished
    // The contract starts with distributionFinished = false

    // First, check initial value
    const initialValue = await instance.value();
    console.log("Initial value:", initialValue.toString());

    // Have addr1 call getTokens() - this should consume some tokens and update value
    // Need to send some ether to trigger the function via receive() or call getTokens directly
    await instance.connect(addr1).getTokens();

    // Get the value after first call
    const valueAfterFirstCall = await instance.value();
    console.log("Value after first call:", valueAfterFirstCall.toString());

    // Have addr2 call getTokens() 
    await instance.connect(addr2).getTokens();

    // Get the value after second call
    const valueAfterSecondCall = await instance.value();
    console.log("Value after second call:", valueAfterSecondCall.toString());

    // In the original contract, value should decrease (value / 100000 * 99999)
    // In the mutant, value increases (value + 100000 * 99999)
    // So if value increased instead of decreased, the mutant is detected
    expect(valueAfterSecondCall).to.be.lessThan(valueAfterFirstCall);
  });
});
import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant test - m6b63ce9e", function () {
  it("should return false for unapproved caller calling logStartedLiquidation", async function () {
    const [owner, unapprovedUser] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call logStartedLiquidation from an unapproved address
    const tx = await instance.connect(unapprovedUser).logStartedLiquidation(true);
    const result = await tx.wait();

    // Verify the transaction receipt to check the return value
    // The function returns bool, but ethers v6 returns the tx response
    // We need to decode the return value from the transaction
    const iface = new ethers.Interface(Factory.interface.fragments);
    const decoded = iface.decodeFunctionResult("logStartedLiquidation", result.logs[0].data);
    
    // On the original contract, unapproved caller should return false
    // On the mutant (condition replaced with false), it will return true
    expect(decoded[0]).to.equal(false);
  });
});
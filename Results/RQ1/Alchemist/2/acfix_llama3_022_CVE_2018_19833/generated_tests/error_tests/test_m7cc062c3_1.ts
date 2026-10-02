import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant test - m7cc062c3", function () {
  it("should detect removal of return value in transfer function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";
    
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Transfer tokens and verify the return value is true
    const transferAmount = 100;
    const tx = await instance.transfer(addr1.address, transferAmount);
    const result = await tx.wait();
    
    // The original contract returns true, the mutant removes return value
    // causing it to return false (default boolean)
    const returnValue = await instance.transfer.staticCall(owner.address, addr1.address, transferAmount);
    expect(returnValue).to.equal(true);
  });
});
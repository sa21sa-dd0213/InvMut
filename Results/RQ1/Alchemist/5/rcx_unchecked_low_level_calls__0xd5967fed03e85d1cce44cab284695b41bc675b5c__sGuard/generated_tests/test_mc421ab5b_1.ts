import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should return true when transfer is called successfully (original behavior)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const recipients = [addr1.address, addr2.address];
    const value = ethers.parseEther("1.0");
    
    const tx = await instance.transfer(owner.address, addr1.address, recipients, value);
    const result = await tx.wait();
    
    // The mutant removes the return true statement, causing the function to return false
    // The original returns true, so we expect true
    expect(result).to.not.be.undefined;
    
    // Directly call the function to check the return value
    const returnValue = await instance.transfer.staticCall(owner.address, addr1.address, recipients, value);
    expect(returnValue).to.equal(true);
  });
});
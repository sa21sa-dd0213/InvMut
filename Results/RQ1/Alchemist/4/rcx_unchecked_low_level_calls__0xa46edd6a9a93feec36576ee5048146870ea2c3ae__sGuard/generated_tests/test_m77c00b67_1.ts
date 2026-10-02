import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - m77c00b67", function () {
  it("should return true when transfer function executes successfully", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tos = [addr1.address];
    const values = [ethers.parseEther("1")];
    
    const tx = await instance.transfer(owner.address, addr2.address, tos, values);
    const receipt = await tx.wait();
    
    // The original function returns true on success
    expect(tx).to.not.be.reverted;
    
    // Call the function and capture the return value
    const result = await instance.transfer.staticCall(owner.address, addr2.address, tos, values);
    expect(result).to.equal(true);
  });
});
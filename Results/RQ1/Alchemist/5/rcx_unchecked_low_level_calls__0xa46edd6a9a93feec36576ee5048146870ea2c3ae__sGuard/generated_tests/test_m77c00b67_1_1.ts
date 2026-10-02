import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m77c00b67", function () {
  it("should return true when transfer is called with valid inputs", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tos = [addr1.address, addr2.address];
    const values = [100, 200];
    
    const tx = await instance.transfer(owner.address, addr1.address, tos, values);
    const receipt = await tx.wait();
    
    // The original contract returns true, mutant returns false
    expect(tx).to.not.be.reverted;
    expect(receipt.status).to.equal(1);
  });
});
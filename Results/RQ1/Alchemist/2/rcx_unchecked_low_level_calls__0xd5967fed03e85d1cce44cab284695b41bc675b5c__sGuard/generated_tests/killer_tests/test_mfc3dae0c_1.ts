import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should succeed when called with a non-empty array of recipients (kills mutant that changes > to < in require)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call transfer with a valid non-empty array of recipients
    const recipients = [addr1.address];
    const value = ethers.parseEther("1");
    
    // This should succeed on original (no revert) but will revert on mutant
    // because require(_tos.length < 0) is always false
    const tx = await instance.transfer(owner.address, instance.target, recipients, value);
    await tx.wait();
    
    // Verify the transaction succeeded by checking it didn't revert
    expect(tx.hash).to.not.be.undefined;
  });
});
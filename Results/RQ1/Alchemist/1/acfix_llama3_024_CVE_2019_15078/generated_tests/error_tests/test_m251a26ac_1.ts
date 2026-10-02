import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m251a26ac by testing that only owner can call XBornID function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // In the original contract, XBornID() can only be called by the owner
    // The mutant removes the require(msg.sender == owner) check, allowing anyone to call it
    // We expect a non-owner call to revert in the original, but succeed in the mutant
    
    // Try calling XBornID from a non-owner address
    // In the original, this should revert because of the require check
    // In the mutant, this would succeed (killing the mutant if we expect revert)
    await expect(
      instance.connect(addr1).XBornID()
    ).to.be.reverted;
  });
});
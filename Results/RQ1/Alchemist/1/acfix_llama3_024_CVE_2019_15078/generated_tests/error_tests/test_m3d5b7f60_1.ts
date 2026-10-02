import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m3d5b7f60 test", function () {
  it("should kill mutant by checking approve returns true", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call approve and expect it to return true (original behavior)
    const tx = await instance.connect(owner).approve(addr1.address, ethers.parseEther("1000"));
    const receipt = await tx.wait();
    
    // Get the return value from the transaction
    const result = await instance.connect(owner).approve.staticCall(addr1.address, ethers.parseEther("1000"));
    
    // The mutant removes "return true;", so the function would return false instead
    // This assertion will pass on original (returns true) but fail on mutant (returns false)
    expect(result).to.equal(true);
  });
});
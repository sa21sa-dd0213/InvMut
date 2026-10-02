import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant m447c62cf test", function () {
  it("should detect mutant where loop condition changed from < to <=", async function () {
    const [owner, from, recipient1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes for(uint i=0;i<_tos.length;i++) to for(uint i=0;i<=_tos.length;i++)
    // This causes an out-of-bounds access on the last iteration
    // For an array with 1 element, the loop runs twice (i=0 and i=1)
    // The second iteration tries to access _tos[1] which is out of bounds, causing revert
    
    const recipients = [recipient1.address];
    const value = ethers.parseEther("1");
    
    // This should succeed on the original but revert on the mutant
    await expect(
      instance.connect(from).transfer(from.address, recipient1.address, recipients, value)
    ).to.be.reverted;
  });
});
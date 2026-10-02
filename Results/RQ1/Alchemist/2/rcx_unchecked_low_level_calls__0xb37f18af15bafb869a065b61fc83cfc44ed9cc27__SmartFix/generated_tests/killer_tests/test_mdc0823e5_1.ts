import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant detection - onlyOwner modifier", function () {
  it("should revert when owner calls withdrawAll if onlyOwner modifier is mutated to != instead of ==", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract so there's balance to withdraw
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await tx.wait();
    
    // Owner should be able to withdraw successfully in the original contract
    // In the mutant, this will revert because msg.sender == owner triggers the != check
    await expect(
      instance.connect(owner).withdrawAll()
    ).to.not.be.reverted;
  });
});
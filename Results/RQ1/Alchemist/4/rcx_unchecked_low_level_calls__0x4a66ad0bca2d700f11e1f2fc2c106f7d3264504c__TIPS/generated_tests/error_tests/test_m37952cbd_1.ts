import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m37952cbd test", function () {
  it("should revert when external call fails but mutant does not revert", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the contract's from address (owner)
    const fromAddress = await instance.from();
    
    // Use a recipient that will cause the external transferFrom to fail
    // The contract calls transferFrom(from, _tos[i], v[i] * 1e18)
    // We'll use an invalid address (zero address) that should cause revert
    const invalidRecipient = ethers.ZeroAddress;
    
    // Amount in tokens (wei equivalent)
    const amount = ethers.parseEther("1");
    
    // The function should revert because the external call will fail
    // (zero address recipient in transferFrom will revert)
    await expect(
      instance.connect(owner).transfer(
        [invalidRecipient],
        [amount]
      )
    ).to.be.reverted;
    
    // Additional check: if the mutant doesn't revert, this test will fail
    // because expect(...).to.be.reverted will throw
  });
});
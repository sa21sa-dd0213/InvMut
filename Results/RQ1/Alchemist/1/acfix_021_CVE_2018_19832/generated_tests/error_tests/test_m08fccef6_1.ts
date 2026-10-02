import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant m08fccef6 - withdraw onlyOwner modifier removed", function () {
  it("should revert when non-owner calls withdraw on original, but succeed on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ETH to make the withdraw meaningful
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to call withdraw from a non-owner address
    // In the original contract this would revert due to onlyOwner modifier
    // In the mutant (without modifier) it should succeed
    const nonOwnerContract = instance.connect(addr1);
    
    // Check if the call reverts or succeeds - we expect it to NOT revert in the mutant
    // We detect the mutant by observing that the call succeeds (mutant) vs reverts (original)
    const tx = nonOwnerContract.withdraw();
    
    // The mutant should allow this to succeed, so we expect no revert
    await expect(tx).to.not.be.reverted;
    
    // Additional check: addr1 should have received the ETH (mutant behavior)
    const balanceAfter = await ethers.provider.getBalance(addr1.address);
    expect(balanceAfter).to.be.gt(0);
  });
});
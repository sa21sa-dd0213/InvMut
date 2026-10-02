import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant mb82cdf7f - transfer balance check", function () {
  it("should revert when transferring more than balance on original, but mutant allows it", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, get tokens for addr1 through the distribution mechanism
    // The contract starts with distribution not finished and value = 2500e18
    // Send enough ETH to trigger getTokens() via receive()
    const initialValue = await instance.value();
    await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    // Check addr1's balance after distribution
    const balanceAddr1 = await instance.balanceOf(addr1.address);
    
    // Try to transfer more than addr1's balance to addr2
    // This should revert on original contract but pass on mutant
    await expect(
      instance.connect(addr1).transfer(addr2.address, balanceAddr1 + 1n)
    ).to.be.reverted;
  });
});
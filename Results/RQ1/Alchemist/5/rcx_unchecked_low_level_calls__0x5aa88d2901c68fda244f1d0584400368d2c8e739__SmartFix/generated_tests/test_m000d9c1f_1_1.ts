import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 - Kill mutant m000d9c1f", function () {
  it("should revert when sending less ETH than contract balance to multiplicate function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ETH first
    const fundAmount = ethers.parseEther("10");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });

    // Try to call multiplicate with less ETH than contract balance
    const smallAmount = ethers.parseEther("1");
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
     
    // Verify small amount is less than contract balance
    expect(smallAmount).to.be.lessThan(contractBalance);
     
    // This should revert in the original contract because msg.value < address(this).balance
    // In the mutant, it would pass incorrectly
    await expect(
      instance.connect(addr1).multiplicate(addr1.address, { value: smallAmount })
    ).to.be.reverted;
  });
});
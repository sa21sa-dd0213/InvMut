import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant m77fa1725 test", function () {
  it("should revert when collecting with balance below MinSum (mutant changes >= to <=)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to 10 ether
    await instance.SetMinSum(ethers.parseEther("10"));
        
    // Initialize the contract (prevent further changes to MinSum)
    await instance.Initialized();

    // Deposit 1 ether to addr1 (balance < MinSum)
    await instance.connect(addr1).Deposit({ value: ethers.parseEther("1") });

    // Attempt to collect 0.5 ether - should revert in original (balance 1 < MinSum 10)
    // Mutant would allow it (balance 1 <= MinSum 10)
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});
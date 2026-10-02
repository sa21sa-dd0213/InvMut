import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant test for m917be0a1", function () {
  it("should revert when balance is below MinSum but balance >= _am (original && behavior)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to a high value
    await instance.SetMinSum(ethers.parseEther("10"));
    
    // Initialize the contract
    await instance.Initialized();

    // Fund addr1 with 5 ether (below MinSum of 10 ether)
    await instance.connect(addr1).Deposit({ value: ethers.parseEther("5") });

    // Try to collect 1 ether (balance >= _am is true, but balance >= MinSum is false)
    // In the original, this should revert (&& condition fails)
    // In the mutant, this would succeed (|| condition passes)
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});
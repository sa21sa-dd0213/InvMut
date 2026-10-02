import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant test - m29b04440", function () {
  it("should revert when Collect is called with balance less than MinSum", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to a value (e.g., 2 ether)
    await instance.SetMinSum(ethers.parseEther("2"));
    // Initialize the contract
    await instance.Initialized();

    // Deposit less than MinSum (e.g., 1 ether) from addr1
    const depositAmount = ethers.parseEther("1");
    await instance.connect(addr1).Deposit({ value: depositAmount });

    // Attempt to collect 1 ether (which is <= balance but balance < MinSum)
    // In original contract, this should revert because balances[addr1] < MinSum
    // In mutant, condition is always true, so it will proceed and potentially fail differently
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});
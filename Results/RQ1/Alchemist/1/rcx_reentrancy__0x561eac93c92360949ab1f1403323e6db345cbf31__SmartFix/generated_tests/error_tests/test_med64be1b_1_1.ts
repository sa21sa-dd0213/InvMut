import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant med64be1b test", function () {
  it("should kill mutant by testing Collect when balance equals MinSum", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to 1 ether
    await instance.SetMinSum(ethers.parseEther("1"));
    
    // Initialize the contract (required before deposits)
    await instance.Initialized();

    // Deposit exactly 1 ether to addr1's balance
    const depositTx = await instance.connect(addr1).Deposit({
      value: ethers.parseEther("1")
    });
    await depositTx.wait();

    // Now addr1's balance equals MinSum (1 ether)
    // Try to Collect 0.5 ether - should succeed in original but fail in mutant
    // because mutant uses > instead of >= for MinSum comparison
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});
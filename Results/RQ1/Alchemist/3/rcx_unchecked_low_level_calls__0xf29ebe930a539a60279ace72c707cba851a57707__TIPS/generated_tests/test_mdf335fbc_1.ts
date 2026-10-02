import { expect } from "chai";
import { ethers } from "hardhat";

describe("Mutant detection test for mdf335fbc", function () {
  it("should detect mutant by sending exactly 1 wei and checking balance after execution", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 1 wei to the go function
    const tx = await instance.connect(addr1).go({ value: 1 });
    await tx.wait();

    // Check the contract's balance - should be 0 in original, but mutant leaves 1 wei
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalance).to.equal(0);
  });
});
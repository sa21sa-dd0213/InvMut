import { expect } from "chai";
import { ethers } from "hardhat";

describe("DEP_BANK mutant kill test", function () {
  it("should kill mutant by sending 0 wei deposit and expecting success", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DEP_BANK");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 0 wei to trigger Deposit via receive() or call Deposit directly
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: 0
    });
    await tx.wait();

    // Check that balance is still 0 (deposit of 0 wei succeeded)
    const balance = await instance.balances(owner.address);
    expect(balance).to.equal(0);
  });
});
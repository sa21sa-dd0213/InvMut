import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant m810968de detection", function () {
  it("should detect mutant that subtracts 1 from msg.value in Put", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to 0 so any amount can be collected
    await instance.connect(owner).SetMinSum(0);
    // Initialize the contract
    await instance.connect(owner).Initialized();

    // Send exactly 1 wei to Put via addr1
    const putTx = await instance.connect(addr1).Put(0, { value: 1 });
    await putTx.wait();

    // Attempt to collect exactly 1 wei - this should fail on the mutant
    // because the mutant records 0 balance (msg.value - 1 = 0)
    await expect(
      instance.connect(addr1).Collect(1)
    ).to.be.reverted;

    // Verify on the original contract (if we were testing original) this would succeed
    // On the mutant, the balance is 0 so the collect reverts
  });
});
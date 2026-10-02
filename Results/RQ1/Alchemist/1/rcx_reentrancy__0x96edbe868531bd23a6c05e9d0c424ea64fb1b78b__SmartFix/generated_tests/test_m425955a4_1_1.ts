import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant m425955a4 test", function () {
  it("should detect the msg.value+1 bug in Put function", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to 0 so any balance is collectable
    await instance.SetMinSum(0);
    // Initialize the contract
    await instance.Initialized();

    const depositAmount = ethers.parseEther("1.0");

    // User deposits exactly 1 ether
    const putTx = await instance.connect(user).Put(0, { value: depositAmount });
    await putTx.wait();

    // Try to collect the exact same amount deposited
    const collectTx = instance.connect(user).Collect(depositAmount);
    await expect(collectTx).to.be.reverted;

    // Verify the contract still holds the extra 1 wei from the bug
    const contractBalance = await ethers.provider.getBalance(instance.target);
    expect(contractBalance).to.equal(1n);
  });
});
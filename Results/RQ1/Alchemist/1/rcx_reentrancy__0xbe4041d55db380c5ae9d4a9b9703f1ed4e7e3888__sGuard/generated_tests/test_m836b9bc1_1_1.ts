import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant kill test - m836b9bc1", function () {
  it("should revert when collecting amount greater than balance (original passes, mutant fails)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to 0 so balance check passes
    await instance.connect(owner).SetMinSum(0);
    // Initialize the contract
    await instance.connect(owner).Initialized();

    // addr1 puts 100 wei with lockTime 0
    const putTx = await instance.connect(addr1).Put(0, { value: 100 });
    await putTx.wait();

    // Now try to collect 150 wei (greater than balance)
    // In original: balance(100) >= _am(150) is false -> revert
    // In mutant: balance(100) <= _am(150) is true -> would succeed (wrong)
    await expect(
      instance.connect(addr1).Collect(150)
    ).to.be.reverted;
  });
});
import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant detection", function () {
  it("should revert Collect when balance is less than MinSum (original behavior) but mutant allows it", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy contract - no constructor arguments needed for PENNY_BY_PENNY
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to 1 ether
    await (await instance.connect(owner).SetMinSum(ethers.parseEther("1"))).wait();

    // Initialize the contract (required by original logic)
    await (await instance.connect(owner).Initialized()).wait();

    // User deposits only 0.5 ether (less than MinSum of 1 ether)
    await (await instance.connect(user).Put(0, { value: ethers.parseEther("0.5") })).wait();

    // Attempt to Collect 0.1 ether - should revert in original, but mutant would succeed
    await expect(
      instance.connect(user).Collect(ethers.parseEther("0.1"))
    ).to.be.reverted;

    // Verify balance remains unchanged (mutant would have drained it)
    const acc = await instance.Acc(user.address);
    expect(acc.balance).to.equal(ethers.parseEther("0.5"));
  });
});
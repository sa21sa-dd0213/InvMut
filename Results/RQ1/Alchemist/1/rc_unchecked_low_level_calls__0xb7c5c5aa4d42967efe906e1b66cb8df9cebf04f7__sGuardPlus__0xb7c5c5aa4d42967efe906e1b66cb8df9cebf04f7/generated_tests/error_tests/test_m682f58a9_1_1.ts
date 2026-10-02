import { expect } from "chai";
import { ethers } from "hardhat";

describe("keepMyEther mutant test - m682f58a9", function () {
  it("should revert when withdraw is called from a contract that rejects Ether", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy the main contract
    const Factory = await ethers.getContractFactory("keepMyEther");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a malicious receiver contract that rejects Ether
    const RejectorFactory = await ethers.getContractFactory("EtherRejector");
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();

    // Fund the main contract with Ether
    const depositAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: depositAmount
    });

    // Transfer ownership of balance to rejector contract by having rejector send Ether
    await rejector.depositToMain(await instance.getAddress(), { value: depositAmount });

    // Attempt to withdraw from the rejector contract - should revert in original but not in mutant
    await expect(
      rejector.withdrawFromMain(await instance.getAddress())
    ).to.be.reverted;

    // Verify that balance is not zeroed out (mutant would zero it)
    const balanceAfter = await instance.balances(await rejector.getAddress());
    expect(balanceAfter).to.equal(depositAmount);
  });
});
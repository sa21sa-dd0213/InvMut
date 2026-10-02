import { expect } from "chai";
import { ethers } from "hardhat";

describe("keepMyEther mutant test", function () {
  it("should detect the mutant by sending 1 wei and checking withdrawal returns 0 wei", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("keepMyEther");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // User sends exactly 1 wei to the contract via fallback
    const tx = await user.sendTransaction({
      to: await instance.getAddress(),
      value: 1
    });
    await tx.wait();

    // Check balance mapping shows 0 wei (mutant credited 0 because 1 - 1 = 0)
    const balance = await instance.balances(user.address);
    expect(balance).to.equal(0);

    // User tries to withdraw - should revert because balance is 0
    await expect(
      instance.connect(user).withdraw()
    ).to.be.reverted;
  });
});
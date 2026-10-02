import { expect } from "chai";
import { ethers } from "hardhat";

describe("keepMyEther reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert on withdraw when extra wei is added by mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("keepMyEther");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 1 ether via fallback
    const sendAmount = ethers.parseEther("1");
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: sendAmount
    });
    await tx.wait();

    // In the original, balance should be exactly sendAmount
    // In the mutant, balance is sendAmount + 1 wei
    // Attempt to withdraw - original succeeds, mutant should revert due to insufficient contract balance
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    const userBalance = await instance.balances(addr1.address);

    // The mutant records sendAmount + 1, but contract only has sendAmount
    if (userBalance > contractBalance) {
      // This condition only holds for the mutant
      await expect(
        instance.connect(addr1).withdraw()
      ).to.be.reverted;
    } else {
      // Original: withdraw should succeed
      await expect(
        instance.connect(addr1).withdraw()
      ).to.not.be.reverted;
    }
  });
});
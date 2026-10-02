import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant m5ec685be test", function () {
  it("should detect the mutant by sending msg.value exactly 1 wei less than balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance (e.g., 2 ether)
    const initialBalance = ethers.parseEther("2");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: initialBalance,
    });

    // Get contract balance before the call
    const balanceBefore = await ethers.provider.getBalance(
      await instance.getAddress()
    );

    // Send msg.value = balanceBefore - 1 wei
    const msgValue = balanceBefore - 1n;

    // Call multiplicate with addr1 as recipient
    await expect(
      instance.connect(addr1).multiplicate(addr1.address, { value: msgValue })
    ).to.not.be.reverted;

    // Get contract balance after the call
    const balanceAfter = await ethers.provider.getBalance(
      await instance.getAddress()
    );

    // In the original, the condition is false (msg.value < balance), so no transfer happens.
    // In the mutant, the condition becomes true (msg.value+1 >= balance), so a transfer occurs.
    // If the mutant is present, the balance will decrease. If original, balance stays the same.
    expect(balanceAfter).to.equal(balanceBefore);
  });
});
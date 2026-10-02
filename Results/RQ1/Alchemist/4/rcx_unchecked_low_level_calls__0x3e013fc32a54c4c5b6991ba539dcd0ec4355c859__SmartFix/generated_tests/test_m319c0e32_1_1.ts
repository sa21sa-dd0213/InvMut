import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant m319c0e32 test", function () {
  it("should kill mutant by attempting to send exact balance and expecting success on original but revert on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy contract (no constructor arguments needed for this contract)
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Get initial contract balance
    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());

    // Calculate msg.value equal to current contract balance
    const msgValue = initialBalance;

    // Get addr1's balance before
    const addr1BalanceBefore = await ethers.provider.getBalance(addr1.address);

    // Call multiplicate with msg.value equal to contract balance
    // On original: should succeed and transfer entire balance
    // On mutant: should revert because it tries to send msg.value+1 more than available
    const tx = instance.connect(owner).multiplicate(addr1.address, { value: msgValue });

    // Expect the transaction to revert (mutant behavior)
    await expect(tx).to.be.reverted;

    // Verify addr1 did not receive any extra funds
    const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);
    expect(addr1BalanceAfter).to.equal(addr1BalanceBefore);
  });
});
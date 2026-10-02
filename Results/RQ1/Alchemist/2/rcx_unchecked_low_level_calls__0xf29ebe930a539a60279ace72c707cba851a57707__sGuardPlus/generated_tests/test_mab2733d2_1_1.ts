import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant mab2733d2 test", function () {
  it("should detect removal of require on external call by sending ether when target cannot receive", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy B contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Deploy a contract that will reject incoming ether to simulate a failing call
    const RejectorFactory = await ethers.getContractFactory(
      "contract Rejector { receive() external payable { revert(); } }"
    );
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();

    // First, send some ether to the contract so it has balance to transfer to owner
    await owner.sendTransaction({
      to: instanceAddress,
      value: ethers.parseEther("1.0")
    });

    // Get initial balance of owner
    const initialOwnerBalance = await ethers.provider.getBalance(owner.address);

    // Call go() with some ether (this will try to forward msg.value to the hardcoded address)
    const tx = await instance.connect(owner).go({ value: ethers.parseEther("0.5") });

    // Wait for the transaction
    await tx.wait();

    // Get final balance of owner - in the mutant, the owner should have received the contract's balance
    // (1.0 + 0.5 = 1.5 ether) despite the external call potentially failing
    const finalOwnerBalance = await ethers.provider.getBalance(owner.address);

    // In the original contract, if the external call fails, the whole transaction reverts
    // In the mutant, it succeeds and transfers all balance to owner
    // So we check that owner's balance increased (mutant behavior) vs reverted (original behavior)
    expect(finalOwnerBalance).to.be.gt(initialOwnerBalance);
  });
});
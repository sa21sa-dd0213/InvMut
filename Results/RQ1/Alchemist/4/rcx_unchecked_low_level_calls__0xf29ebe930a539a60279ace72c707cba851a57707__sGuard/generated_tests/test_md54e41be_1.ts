import { expect } from "chai";
import { ethers } } from "hardhat";

describe("B mutant detection - msg.value+1", function () {
  it("should detect mutant that sends msg.value+1 instead of msg.value", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethert.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a helper contract to track balance changes
    const HelperFactory = await ethers.getContractFactory("BalanceTracker");
    const helper = await HelperFactory.deploy();
    await helper.waitForDeployment();

    // Send exactly 1 ether to go() from attacker
    const tx = await instance.connect(attacker).go({ value: ethers.parseEther("1") });
    await tx.wait();

    // Check that the target address received exactly 1 ether (not 1 ether + 1 wei)
    const targetBalance = await ethers.provider.getBalance("0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C");
    expect(targetBalance).to.equal(ethers.parseEther("1"));

    // Check that owner received remaining balance (should be 0)
    const ownerBalance = await ethers.provider.getBalance(owner.address);
    // Original balance minus gas costs, but we can verify the transfer happened correctly
    // The owner should have received the entire contract balance (1 ether) since the target call would fail in mutant
    // In original, target gets 1 ether, owner gets 0
    // In mutant, target call fails (sends 1.000000000000000001 ether), owner gets full 1 ether
    // So we check that owner balance increased by exactly 1 ether (mutant behavior)
    // But original would have owner balance unchanged (0 transfer)
    // We can detect by checking target balance is NOT 1 ether in mutant case
  });
});
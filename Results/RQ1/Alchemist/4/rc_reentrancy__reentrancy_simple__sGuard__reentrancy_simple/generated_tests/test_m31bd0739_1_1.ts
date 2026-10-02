import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant m31bd0739 - withdrawBalance with false instead of !_s", function () {
  it("should revert on failed external call and preserve balance in original, but mutant sets balance to zero", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the Reentrance contract (no constructor arguments needed)
    const ReentranceFactory = await ethers.getContractFactory("Reentrance");
    const reentrance = await ReentranceFactory.deploy();
    await reentrance.waitForDeployment();

    // Deploy a malicious receiver that always reverts on receive
    const MaliciousReceiverFactory = await ethers.getContractFactory("MaliciousReceiver");
    const maliciousReceiver = await MaliciousReceiverFactory.deploy();
    await maliciousReceiver.waitForDeployment();

    // Fund the Reentrance contract with ether
    await owner.sendTransaction({
      to: await reentrance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Add balance for the malicious receiver address in the Reentrance contract
    await reentrance.connect(attacker).addToBalance({ value: ethers.parseEther("0.5") });

    // Check balance before withdrawal
    const balanceBefore = await reentrance.getBalance(await maliciousReceiver.getAddress());
    expect(balanceBefore).to.equal(ethers.parseEther("0"));

    // Deploy attacker contract that will revert on receive
    const AttackerContractFactory = await ethers.getContractFactory("AttackerWithRevert");
    const attackerContract = await AttackerContractFactory.deploy(await reentrance.getAddress());
    await attackerContract.waitForDeployment();

    // Fund the attacker contract
    await owner.sendTransaction({
      to: await attackerContract.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attacker contract adds balance to itself in Reentrance
    await attackerContract.connect(owner).addBalance({ value: ethers.parseEther("0.5") });

    // Now attempt withdrawal - should revert in original, but in mutant it will succeed and set balance to 0
    await expect(
      attackerContract.connect(owner).attack()
    ).to.be.reverted;

    // Check that balance was preserved in the original (but mutant will have 0)
    const balanceAfter = await reentrance.getBalance(await attackerContract.getAddress());
    expect(balanceAfter).to.equal(ethers.parseEther("0.5"));
  });
});

// Helper contracts to be deployed in the test
// Note: These must be compiled alongside Reentrance
// MaliciousReceiver contract
// AttackerWithRevert contract